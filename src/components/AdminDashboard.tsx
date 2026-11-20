import { useEffect, useState } from "react";
import { chairs } from "../content/chairs";
import {
  createChairLink,
  deleteChairLink,
  fetchAllChairLinks,
  reorderChairLinks,
  updateChairLink,
} from "../lib/chairLinksService";
import type { ChairNumber } from "../lib/scoring";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import {
  validateChairLinkInput,
  type ChairLinkInput,
  type ChairLinkItem,
  type LinkCategory,
} from "../types/chairLinks";
import { AdminLogin } from "./AdminLogin";
import { ChairScreen } from "./ChairScreen";

const ALL_CHAIRS: readonly ChairNumber[] = [1, 2, 3, 4];

export interface AdminDashboardProps {
  onExitAdmin: () => void;
  initialSession?: any;
  initialLinks?: ChairLinkItem[];
  initialSelectedChair?: ChairNumber;
  initialPreviewing?: boolean;
}

export function AdminDashboard({
  onExitAdmin,
  initialSession,
  initialLinks,
  initialSelectedChair = 1,
  initialPreviewing = false,
}: AdminDashboardProps) {
  const [session, setSession] = useState<any>(initialSession ?? null);
  const [authChecking, setAuthChecking] = useState(
    initialSession === undefined && isSupabaseConfigured && Boolean(supabase),
  );
  const [selectedChair, setSelectedChair] =
    useState<ChairNumber>(initialSelectedChair);
  const [links, setLinks] = useState<ChairLinkItem[]>(initialLinks ?? []);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(initialPreviewing);

  // Editing state for inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  // New item form states for each category
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupUrl, setNewGroupUrl] = useState("");
  const [isAddingGroup, setIsAddingGroup] = useState(false);

  const [newResourceTitle, setNewResourceTitle] = useState("");
  const [newResourceDescription, setNewResourceDescription] = useState("");
  const [newResourceUrl, setNewResourceUrl] = useState("");
  const [isAddingResource, setIsAddingResource] = useState(false);

  // Check auth session
  useEffect(() => {
    if (initialSession !== undefined || !isSupabaseConfigured || !supabase) {
      setAuthChecking(false);
      return;
    }

    let isMounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session);
        setAuthChecking(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (isMounted) {
        setSession(newSession);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [initialSession]);

  // Load links on mount and when authenticated
  async function loadLinks() {
    if (!isSupabaseConfigured || !supabase) return;
    setLoading(true);
    try {
      const data = await fetchAllChairLinks();
      setLinks(data);
    } catch (err) {
      setStatusMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Failed to load links from Supabase.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session && initialLinks === undefined) {
      loadLinks();
    }
  }, [session, initialLinks]);

  async function handleSignOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
  }

  // Filter items for active chair
  const chairLinks = links.filter((item) => item.chair === selectedChair);
  const groupItems = chairLinks
    .filter((item) => item.category === "group")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const resourceItems = chairLinks
    .filter((item) => item.category === "resource")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Items for preview (active links only)
  const previewLinks = chairLinks.filter((item) => item.isActive);

  // CRUD Handlers
  async function handleCreateItem(category: LinkCategory) {
    setStatusMessage(null);
    const title = category === "group" ? newGroupTitle : newResourceTitle;
    const description =
      category === "group" ? newGroupDescription : newResourceDescription;
    const url = category === "group" ? newGroupUrl : newResourceUrl;
    const categoryItems = category === "group" ? groupItems : resourceItems;

    const input: ChairLinkInput = {
      chair: selectedChair,
      category,
      title: title.trim(),
      description: description.trim(),
      url: url.trim(),
      sortOrder: categoryItems.length,
      isActive: true,
    };

    if (!validateChairLinkInput(input)) {
      setStatusMessage({
        type: "error",
        text: "Please provide a valid Title, Description, and valid http(s) URL.",
      });
      return;
    }

    try {
      await createChairLink(input);
      setStatusMessage({
        type: "success",
        text: `Successfully added ${category === "group" ? "Small Group" : "Resource"} link.`,
      });
      if (category === "group") {
        setNewGroupTitle("");
        setNewGroupDescription("");
        setNewGroupUrl("");
        setIsAddingGroup(false);
      } else {
        setNewResourceTitle("");
        setNewResourceDescription("");
        setNewResourceUrl("");
        setIsAddingResource(false);
      }
      await loadLinks();
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to create link.",
      });
    }
  }

  function startEditing(item: ChairLinkItem) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditDescription(item.description);
    setEditUrl(item.url);
    setEditIsActive(item.isActive);
  }

  function cancelEditing() {
    setEditingId(null);
  }

  async function handleUpdateItem(id: string) {
    setStatusMessage(null);
    const patch = {
      title: editTitle.trim(),
      description: editDescription.trim(),
      url: editUrl.trim(),
      isActive: editIsActive,
    };

    try {
      await updateChairLink(id, patch);
      setStatusMessage({
        type: "success",
        text: "Link updated successfully.",
      });
      setEditingId(null);
      await loadLinks();
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update link.",
      });
    }
  }

  async function handleDeleteItem(id: string) {
    if (!window.confirm("Are you sure you want to delete this link?")) {
      return;
    }
    setStatusMessage(null);
    try {
      await deleteChairLink(id);
      setStatusMessage({
        type: "success",
        text: "Link deleted successfully.",
      });
      await loadLinks();
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to delete link.",
      });
    }
  }

  async function handleMove(
    categoryItems: ChairLinkItem[],
    index: number,
    direction: "up" | "down",
  ) {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categoryItems.length) return;

    setStatusMessage(null);
    const newItems = [...categoryItems];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);

    const orderedIds = newItems.map((item) => item.id);
    try {
      await reorderChairLinks(orderedIds);
      setStatusMessage({
        type: "success",
        text: "Reordered successfully.",
      });
      await loadLinks();
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to reorder links.",
      });
    }
  }

  if (authChecking) {
    return (
      <main className="page-shell">
        <section className="welcome-card">
          <p className="intro-copy">Checking leadership authorization...</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <AdminLogin
        onBackToAssessment={onExitAdmin}
        onSuccess={() => {
          if (supabase) {
            supabase.auth.getSession().then(({ data }) => {
              setSession(data.session);
            });
          }
        }}
      />
    );
  }

  // Live preview mode
  if (isPreviewing) {
    return (
      <div className="admin-preview-container">
        <header className="admin-preview-bar">
          <span>
            Previewing <strong>Chair {selectedChair}</strong> (
            {chairs[selectedChair].stageLabel})
          </span>
          <button
            type="button"
            className="button button-primary"
            onClick={() => setIsPreviewing(false)}
          >
            ← Back to Editor
          </button>
        </header>
        <ChairScreen
          chair={selectedChair}
          segmentProgressPercent={50}
          notice=""
          onStartOver={() => setIsPreviewing(false)}
          initialLinks={previewLinks}
        />
      </div>
    );
  }

  return (
    <main className="page-shell admin-shell">
      {/* Admin Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          <img
            className="brand-logo admin-logo"
            src="/ocupc-logo.png"
            alt="Oregon City United Pentecostal Church"
          />
          <h1 className="admin-heading">Chair Links Manager</h1>
        </div>
        <div className="admin-user-bar">
          <span className="admin-user-email">
            {session.user?.email || "Leader"}
          </span>
          <div className="admin-header-actions">
            <button
              type="button"
              className="button button-secondary admin-btn-sm"
              onClick={onExitAdmin}
            >
              Back to Assessment
            </button>
            <button
              type="button"
              className="button button-secondary admin-btn-sm"
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Global Status Message */}
      {statusMessage && (
        <div
          className={`status-message ${statusMessage.type === "error" ? "admin-error-message" : "admin-success-message"}`}
          role="status"
        >
          {statusMessage.text}
        </div>
      )}

      {/* Chair Selector Tabs */}
      <nav
        className="admin-tabs"
        role="tablist"
        aria-label="Select Chair to Manage"
      >
        {ALL_CHAIRS.map((chairNum) => {
          const isSelected = selectedChair === chairNum;
          const stage = chairs[chairNum];
          return (
            <button
              key={chairNum}
              role="tab"
              aria-selected={isSelected}
              className={`admin-tab ${isSelected ? "is-selected" : ""}`}
              onClick={() => {
                setSelectedChair(chairNum);
                setEditingId(null);
                setIsAddingGroup(false);
                setIsAddingResource(false);
              }}
            >
              <span className="admin-tab-number">Chair {chairNum}</span>
              <span className="admin-tab-label">{stage.stageLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* Chair Controls & Live Preview Toggle */}
      <div className="admin-controls-bar">
        <h2>
          Chair {selectedChair}: {chairs[selectedChair].stageLabel} Links
        </h2>
        <button
          type="button"
          className="button button-primary admin-preview-btn"
          onClick={() => setIsPreviewing(true)}
        >
          Preview Chair {selectedChair} Page
        </button>
      </div>

      {loading && <p className="helper-copy">Updating links...</p>}

      <div className="admin-panels-grid">
        {/* PANEL 1: Small Groups */}
        <section
          className="admin-panel"
          aria-labelledby="small-groups-panel-heading"
        >
          <div className="admin-panel-header">
            <h3 id="small-groups-panel-heading">Small Groups</h3>
            <span className="admin-panel-count">
              {groupItems.length} {groupItems.length === 1 ? "group" : "groups"}
            </span>
          </div>

          <div className="admin-item-list">
            {groupItems.length === 0 ? (
              <p className="admin-empty-note">
                No small groups configured for Chair {selectedChair}.
              </p>
            ) : (
              groupItems.map((item, index) => (
                <article className="admin-item-row" key={item.id}>
                  {editingId === item.id ? (
                    <div className="admin-inline-edit-form">
                      <h4>Edit Small Group</h4>
                      <div className="admin-form-group">
                        <label htmlFor={`edit-title-${item.id}`}>Title</label>
                        <input
                          id={`edit-title-${item.id}`}
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                        />
                      </div>
                      <div className="admin-form-group">
                        <label htmlFor={`edit-desc-${item.id}`}>
                          Description
                        </label>
                        <textarea
                          id={`edit-desc-${item.id}`}
                          rows={3}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                        />
                      </div>
                      <div className="admin-form-group">
                        <label htmlFor={`edit-url-${item.id}`}>Web Link</label>
                        <input
                          id={`edit-url-${item.id}`}
                          type="url"
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                        />
                      </div>
                      <div className="admin-checkbox-group">
                        <label>
                          <input
                            type="checkbox"
                            checked={editIsActive}
                            onChange={(e) => setEditIsActive(e.target.checked)}
                          />{" "}
                          Active (Visible on landing page)
                        </label>
                      </div>
                      <div className="admin-action-row">
                        <button
                          type="button"
                          className="button button-primary admin-btn-sm"
                          onClick={() => handleUpdateItem(item.id)}
                        >
                          Save Changes
                        </button>
                        <button
                          type="button"
                          className="button button-secondary admin-btn-sm"
                          onClick={cancelEditing}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="admin-item-details">
                        <div className="admin-item-title-row">
                          <h4 className="admin-item-title">{item.title}</h4>
                          <span
                            className={`admin-status-badge ${item.isActive ? "is-active" : "is-hidden"}`}
                          >
                            {item.isActive ? "Active" : "Hidden"}
                          </span>
                        </div>
                        <p className="admin-item-description">
                          {item.description}
                        </p>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-item-link"
                        >
                          {item.url} ↗
                        </a>
                      </div>
                      <div className="admin-item-actions">
                        <button
                          type="button"
                          className="admin-icon-btn"
                          aria-label="Move Up"
                          disabled={index === 0}
                          onClick={() => handleMove(groupItems, index, "up")}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="admin-icon-btn"
                          aria-label="Move Down"
                          disabled={index === groupItems.length - 1}
                          onClick={() => handleMove(groupItems, index, "down")}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="button button-secondary admin-btn-sm"
                          onClick={() => startEditing(item)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button button-secondary admin-btn-sm admin-btn-danger"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))
            )}
          </div>

          {/* Add Small Group Toggle / Form */}
          {isAddingGroup ? (
            <div className="admin-add-form">
              <h4>Add Small Group to Chair {selectedChair}</h4>
              <div className="admin-form-group">
                <label htmlFor="new-group-title">Title</label>
                <input
                  id="new-group-title"
                  type="text"
                  placeholder="e.g. Wednesday Night Life Group"
                  value={newGroupTitle}
                  onChange={(e) => setNewGroupTitle(e.target.value)}
                />
              </div>
              <div className="admin-form-group">
                <label htmlFor="new-group-desc">Description</label>
                <textarea
                  id="new-group-desc"
                  rows={2}
                  placeholder="Brief explanation of group focus, schedule, or location"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                />
              </div>
              <div className="admin-form-group">
                <label htmlFor="new-group-url">Web Link</label>
                <input
                  id="new-group-url"
                  type="url"
                  placeholder="https://ocupc.com/groups/..."
                  value={newGroupUrl}
                  onChange={(e) => setNewGroupUrl(e.target.value)}
                />
              </div>
              <div className="admin-action-row">
                <button
                  type="button"
                  className="button button-primary admin-btn-sm"
                  onClick={() => handleCreateItem("group")}
                >
                  Save Small Group
                </button>
                <button
                  type="button"
                  className="button button-secondary admin-btn-sm"
                  onClick={() => setIsAddingGroup(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="button button-secondary admin-add-trigger"
              onClick={() => setIsAddingGroup(true)}
            >
              + Add Small Group
            </button>
          )}
        </section>

        {/* PANEL 2: Recommended Resources */}
        <section
          className="admin-panel"
          aria-labelledby="resources-panel-heading"
        >
          <div className="admin-panel-header">
            <h3 id="resources-panel-heading">Recommended Resources</h3>
            <span className="admin-panel-count">
              {resourceItems.length}{" "}
              {resourceItems.length === 1 ? "resource" : "resources"}
            </span>
          </div>

          <div className="admin-item-list">
            {resourceItems.length === 0 ? (
              <p className="admin-empty-note">
                No resources configured for Chair {selectedChair}.
              </p>
            ) : (
              resourceItems.map((item, index) => (
                <article className="admin-item-row" key={item.id}>
                  {editingId === item.id ? (
                    <div className="admin-inline-edit-form">
                      <h4>Edit Resource</h4>
                      <div className="admin-form-group">
                        <label htmlFor={`edit-res-title-${item.id}`}>
                          Title
                        </label>
                        <input
                          id={`edit-res-title-${item.id}`}
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                        />
                      </div>
                      <div className="admin-form-group">
                        <label htmlFor={`edit-res-desc-${item.id}`}>
                          Description
                        </label>
                        <textarea
                          id={`edit-res-desc-${item.id}`}
                          rows={3}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                        />
                      </div>
                      <div className="admin-form-group">
                        <label htmlFor={`edit-res-url-${item.id}`}>
                          Web Link
                        </label>
                        <input
                          id={`edit-res-url-${item.id}`}
                          type="url"
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                        />
                      </div>
                      <div className="admin-checkbox-group">
                        <label>
                          <input
                            type="checkbox"
                            checked={editIsActive}
                            onChange={(e) => setEditIsActive(e.target.checked)}
                          />{" "}
                          Active (Visible on landing page)
                        </label>
                      </div>
                      <div className="admin-action-row">
                        <button
                          type="button"
                          className="button button-primary admin-btn-sm"
                          onClick={() => handleUpdateItem(item.id)}
                        >
                          Save Changes
                        </button>
                        <button
                          type="button"
                          className="button button-secondary admin-btn-sm"
                          onClick={cancelEditing}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="admin-item-details">
                        <div className="admin-item-title-row">
                          <h4 className="admin-item-title">{item.title}</h4>
                          <span
                            className={`admin-status-badge ${item.isActive ? "is-active" : "is-hidden"}`}
                          >
                            {item.isActive ? "Active" : "Hidden"}
                          </span>
                        </div>
                        <p className="admin-item-description">
                          {item.description}
                        </p>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-item-link"
                        >
                          {item.url} ↗
                        </a>
                      </div>
                      <div className="admin-item-actions">
                        <button
                          type="button"
                          className="admin-icon-btn"
                          aria-label="Move Up"
                          disabled={index === 0}
                          onClick={() => handleMove(resourceItems, index, "up")}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="admin-icon-btn"
                          aria-label="Move Down"
                          disabled={index === resourceItems.length - 1}
                          onClick={() =>
                            handleMove(resourceItems, index, "down")
                          }
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="button button-secondary admin-btn-sm"
                          onClick={() => startEditing(item)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button button-secondary admin-btn-sm admin-btn-danger"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))
            )}
          </div>

          {/* Add Resource Toggle / Form */}
          {isAddingResource ? (
            <div className="admin-add-form">
              <h4>Add Resource to Chair {selectedChair}</h4>
              <div className="admin-form-group">
                <label htmlFor="new-res-title">Title</label>
                <input
                  id="new-res-title"
                  type="text"
                  placeholder="e.g. Daily Prayer Guide PDF"
                  value={newResourceTitle}
                  onChange={(e) => setNewResourceTitle(e.target.value)}
                />
              </div>
              <div className="admin-form-group">
                <label htmlFor="new-res-desc">Description</label>
                <textarea
                  id="new-res-desc"
                  rows={2}
                  placeholder="Brief overview of how to use this resource"
                  value={newResourceDescription}
                  onChange={(e) => setNewResourceDescription(e.target.value)}
                />
              </div>
              <div className="admin-form-group">
                <label htmlFor="new-res-url">Web Link</label>
                <input
                  id="new-res-url"
                  type="url"
                  placeholder="https://ocupc.com/resources/..."
                  value={newResourceUrl}
                  onChange={(e) => setNewResourceUrl(e.target.value)}
                />
              </div>
              <div className="admin-action-row">
                <button
                  type="button"
                  className="button button-primary admin-btn-sm"
                  onClick={() => handleCreateItem("resource")}
                >
                  Save Resource
                </button>
                <button
                  type="button"
                  className="button button-secondary admin-btn-sm"
                  onClick={() => setIsAddingResource(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="button button-secondary admin-add-trigger"
              onClick={() => setIsAddingResource(true)}
            >
              + Add Resource
            </button>
          )}
        </section>
      </div>
    </main>
  );
}
