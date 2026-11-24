import { useEffect, useState } from "react";
import { chairs } from "../content/chairs";
import {
  fetchChairContacts,
  upsertChairContact,
} from "../lib/chairContactsService";
import {
  createChairLink,
  deleteChairLink,
  fetchAllChairLinks,
  reorderChairLinks,
  updateChairLink,
} from "../lib/chairLinksService";
import { checkIsAdmin } from "../lib/participantAuth";
import { fetchAllParticipantChairStates } from "../lib/participantTrackingService";
import type { ChairNumber } from "../lib/scoring";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import type { ChairContact } from "../types/chairContacts";
import {
  validateChairLinkInput,
  type ChairLinkInput,
  type ChairLinkItem,
  type LinkCategory,
} from "../types/chairLinks";
import {
  getVisitedChairsSorted,
  type ParticipantChairState,
} from "../types/participantTracking";
import { AdminLogin } from "./AdminLogin";
import { ChairScreen } from "./ChairScreen";

const ALL_CHAIRS: readonly ChairNumber[] = [1, 2, 3, 4];

function formatRosterTimestamp(date: Date): string {
  const iso = date.toISOString();
  return iso.replace("T", " ").slice(0, 16) + " UTC";
}

export interface AdminDashboardProps {
  onExitAdmin: () => void;
  initialSession?: any;
  initialLinks?: ChairLinkItem[];
  initialContacts?: ChairContact[];
  initialParticipants?: ParticipantChairState[];
  initialSelectedChair?: ChairNumber;
  initialPreviewing?: boolean;
  /** Force admin status (for tests); if undefined, determined via is_admin() RPC */
  initialIsAdmin?: boolean;
  /** Active view: Chair Links Manager vs. Participant Roster */
  initialView?: "links" | "participants";
  initialSearchQuery?: string;
  initialChairFilter?: "all" | "none" | "1" | "2" | "3" | "4";
}

export function AdminDashboard({
  onExitAdmin,
  initialSession,
  initialLinks,
  initialContacts,
  initialParticipants,
  initialSelectedChair = 1,
  initialPreviewing = false,
  initialIsAdmin,
  initialView = "links",
  initialSearchQuery = "",
  initialChairFilter = "all",
}: AdminDashboardProps) {
  const [adminView, setAdminView] = useState<"links" | "participants">(initialView);
  const [participants, setParticipants] = useState<ParticipantChairState[]>(
    initialParticipants ?? [],
  );
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [chairFilter, setChairFilter] = useState<
    "all" | "none" | "1" | "2" | "3" | "4"
  >(initialChairFilter);
  const [session, setSession] = useState<any>(initialSession ?? null);
  const [authChecking, setAuthChecking] = useState(
    initialSession === undefined && isSupabaseConfigured && Boolean(supabase),
  );
  /**
   * undefined = not yet checked, true/false = result of is_admin() RPC.
   * When initialIsAdmin is provided (tests), skip the RPC call.
   */
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(initialIsAdmin);
  const [selectedChair, setSelectedChair] =
    useState<ChairNumber>(initialSelectedChair);
  const [links, setLinks] = useState<ChairLinkItem[]>(initialLinks ?? []);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(initialPreviewing);

  // Chair contacts state
  const [contacts, setContacts] = useState<Record<number, ChairContact>>(() => {
    const map: Record<number, ChairContact> = {};
    if (initialContacts) {
      for (const c of initialContacts) {
        map[c.chair] = c;
      }
    }
    return map;
  });
  const [contactEmail, setContactEmail] = useState(() => {
    if (initialContacts) {
      const match = initialContacts.find((c) => c.chair === initialSelectedChair);
      return match?.contactEmail || "";
    }
    return "";
  });
  const [contactName, setContactName] = useState(() => {
    if (initialContacts) {
      const match = initialContacts.find((c) => c.chair === initialSelectedChair);
      return match?.contactName || "";
    }
    return "";
  });
  const [contactIsEnabled, setContactIsEnabled] = useState(() => {
    if (initialContacts) {
      const match = initialContacts.find((c) => c.chair === initialSelectedChair);
      return match?.isEnabled ?? true;
    }
    return true;
  });
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactStatusMessage, setContactStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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

  // Check auth session, then verify admin status via is_admin() RPC
  useEffect(() => {
    if (initialSession !== undefined || !isSupabaseConfigured || !supabase) {
      setAuthChecking(false);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      const sess = data.session;
      setSession(sess);

      // If a session exists, check whether this user is actually an admin.
      // initialIsAdmin overrides the RPC (used in tests).
      if (sess && initialIsAdmin === undefined) {
        const admin = await checkIsAdmin();
        if (isMounted) setIsAdmin(admin);
      } else if (!sess) {
        if (isMounted) setIsAdmin(undefined);
      }
      if (isMounted) setAuthChecking(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      if (newSession && initialIsAdmin === undefined) {
        const admin = await checkIsAdmin();
        if (isMounted) setIsAdmin(admin);
      } else if (!newSession) {
        if (isMounted) setIsAdmin(undefined);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSession]);

  // Load links and contacts on mount and when authenticated
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

  async function loadContacts() {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const data = await fetchChairContacts();
      const map: Record<number, ChairContact> = {};
      for (const c of data) {
        map[c.chair] = c;
      }
      setContacts(map);
    } catch {
      // Handled silently or non-blockingly
    }
  }

  async function loadParticipants() {
    if (!isSupabaseConfigured || !supabase) return;
    setLoadingParticipants(true);
    try {
      const data = await fetchAllParticipantChairStates();
      setParticipants(data);
    } catch (err) {
      setStatusMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Failed to load participants from Supabase.",
      });
    } finally {
      setLoadingParticipants(false);
    }
  }

  useEffect(() => {
    if (session && initialLinks === undefined) {
      loadLinks();
    }
    if (session && initialContacts === undefined) {
      loadContacts();
    }
    if (session && initialParticipants === undefined) {
      loadParticipants();
    }
  }, [session, initialLinks, initialContacts, initialParticipants]);

  // Sync active contact form with selected chair
  useEffect(() => {
    const contact = contacts[selectedChair];
    setContactEmail(contact?.contactEmail || "");
    setContactName(contact?.contactName || "");
    setContactIsEnabled(contact?.isEnabled ?? true);
    setContactStatusMessage(null);
  }, [selectedChair, contacts]);

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

  // Contact form save handler
  async function handleSaveContact(e: React.FormEvent) {
    e.preventDefault();
    setContactStatusMessage(null);
    setIsSavingContact(true);

    try {
      const saved = await upsertChairContact({
        chair: selectedChair,
        contactEmail: contactEmail.trim(),
        contactName: contactName.trim() || null,
        isEnabled: contactIsEnabled,
      });

      setContacts((prev) => ({ ...prev, [selectedChair]: saved }));
      setContactStatusMessage({
        type: "success",
        text: `Next-steps email contact for Chair ${selectedChair} saved successfully.`,
      });
    } catch (err) {
      setContactStatusMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Failed to save chair contact settings.",
      });
    } finally {
      setIsSavingContact(false);
    }
  }

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

  // A session exists but the is_admin() check is still in-flight
  if (isAdmin === undefined && session) {
    return (
      <main className="page-shell">
        <section className="welcome-card">
          <p className="intro-copy">Verifying admin privileges...</p>
        </section>
      </main>
    );
  }

  // Signed in but NOT an admin — deny access clearly
  if (isAdmin === false) {
    return (
      <main className="page-shell">
        <section className="welcome-card" aria-labelledby="not-admin-title">
          <p className="eyebrow">Access Denied</p>
          <h1 id="not-admin-title">Admin Access Required</h1>
          <p className="intro-copy">
            You are signed in as{" "}
            <strong>{session.user?.email}</strong>, but this account does not
            have leadership admin privileges. Please sign in with a designated
            leader account, or return to the assessment.
          </p>
          <div className="action-stack">
            <button
              type="button"
              className="button button-secondary"
              onClick={async () => {
                if (supabase) await supabase.auth.signOut();
                setSession(null);
                setIsAdmin(undefined);
              }}
            >
              Sign Out
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={onExitAdmin}
            >
              Back to Assessment
            </button>
          </div>
        </section>
      </main>
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

  const filteredParticipants = participants.filter((p) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      query === "" ||
      (p.displayName !== null && p.displayName.toLowerCase().includes(query)) ||
      p.email.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (chairFilter === "all") return true;
    if (chairFilter === "none") return p.currentChair === null;
    return p.currentChair === Number(chairFilter);
  });

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
          <h1 className="admin-heading">
            {adminView === "participants" ? "Participant Roster" : "Chair Links Manager"}
          </h1>
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

      {/* Main View Navigation Tabs */}
      <nav className="admin-main-nav" aria-label="Admin Navigation Tabs">
        <button
          type="button"
          className={`admin-nav-button ${adminView === "links" ? "is-active" : ""}`}
          onClick={() => setAdminView("links")}
        >
          Chair Links Manager
        </button>
        <button
          type="button"
          className={`admin-nav-button ${adminView === "participants" ? "is-active" : ""}`}
          onClick={() => setAdminView("participants")}
        >
          Participant Roster
        </button>
      </nav>

      {/* Global Status Message */}
      {statusMessage && (
        <div
          className={`status-message ${statusMessage.type === "error" ? "admin-error-message" : "admin-success-message"}`}
          role="status"
        >
          {statusMessage.text}
        </div>
      )}

      {adminView === "participants" ? (
        <section className="admin-roster-section" aria-labelledby="roster-heading">
          <div className="admin-roster-header">
            <div className="admin-roster-titles">
              <h2 id="roster-heading">Participant Roster</h2>
              <p className="admin-roster-subtitle">
                View all registered participants, their current chair status, and complete chair assessment history.
              </p>
            </div>
            <div className="admin-roster-count-badge">
              {filteredParticipants.length} of {participants.length}{" "}
              {participants.length === 1 ? "participant" : "participants"}
            </div>
          </div>

          {/* Roster Controls: Search & Chair Filter */}
          <div className="admin-roster-controls">
            <div className="admin-roster-search">
              <label htmlFor="roster-search">Search by Name or Email</label>
              <input
                id="roster-search"
                type="search"
                placeholder="Search participants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="admin-roster-filter">
              <label htmlFor="roster-chair-filter">Filter by Current Chair</label>
              <select
                id="roster-chair-filter"
                value={chairFilter}
                onChange={(e) =>
                  setChairFilter(e.target.value as "all" | "none" | "1" | "2" | "3" | "4")
                }
              >
                <option value="all">All Chairs</option>
                <option value="1">Chair 1: {chairs[1].stageLabel}</option>
                <option value="2">Chair 2: {chairs[2].stageLabel}</option>
                <option value="3">Chair 3: {chairs[3].stageLabel}</option>
                <option value="4">Chair 4: {chairs[4].stageLabel}</option>
                <option value="none">None / In Progress</option>
              </select>
            </div>
          </div>

          {loadingParticipants ? (
            <p className="helper-copy">Loading participants...</p>
          ) : filteredParticipants.length === 0 ? (
            <p className="admin-empty-note">
              {participants.length === 0
                ? "No participant accounts registered yet."
                : "No participants match your search or filter."}
            </p>
          ) : (
            <div className="admin-roster-list">
              {filteredParticipants.map((p) => {
                const visited = getVisitedChairsSorted(p);
                const displayName = p.displayName?.trim() || p.email;
                const currentChairLabel =
                  p.currentChair !== null
                    ? `Chair ${p.currentChair}: ${chairs[p.currentChair].stageLabel}`
                    : "In Progress / Not Yet Completed";

                return (
                  <article className="admin-roster-card" key={p.userId}>
                    <header className="admin-roster-card-header">
                      <div className="admin-roster-user-info">
                        <h3 className="admin-roster-user-name">{displayName}</h3>
                        <span className="admin-roster-user-email">{p.email}</span>
                      </div>
                      <div className="admin-roster-current-status">
                        <span className="admin-roster-status-label">Current Chair:</span>
                        <span
                          className={`admin-roster-chair-badge ${
                            p.currentChair !== null ? `chair-${p.currentChair}` : "chair-none"
                          }`}
                        >
                          {currentChairLabel}
                        </span>
                      </div>
                    </header>

                    <div className="admin-roster-history">
                      <h4 className="admin-roster-history-title">
                        Visited Chairs (Most to Least Recent)
                      </h4>
                      {visited.length === 0 ? (
                        <p className="admin-roster-no-history">
                          No chair assessments completed yet.
                        </p>
                      ) : (
                        <ol className="admin-roster-visited-list">
                          {visited.map((v) => {
                            const stage = chairs[v.chair];
                            return (
                              <li
                                key={v.chair}
                                className={`admin-roster-visited-item ${
                                  v.isCurrent ? "is-current" : ""
                                }`}
                              >
                                <span className="admin-roster-visited-chair">
                                  Chair {v.chair}: {stage.stageLabel}
                                </span>
                                {v.isCurrent && (
                                  <span className="admin-roster-current-pill">Current</span>
                                )}
                                <time
                                  className="admin-roster-visited-time"
                                  dateTime={v.lastAt.toISOString()}
                                >
                                  {formatRosterTimestamp(v.lastAt)}
                                </time>
                              </li>
                            );
                          })}
                        </ol>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <>

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
          Chair {selectedChair}: {chairs[selectedChair].stageLabel}
        </h2>
        <button
          type="button"
          className="button button-primary admin-preview-btn"
          onClick={() => setIsPreviewing(true)}
        >
          Preview Chair {selectedChair} Page
        </button>
      </div>

      {/* Per-Chair Next-Steps Email Contact Configuration */}
      <section
        className="admin-contact-card"
        aria-labelledby="contact-panel-heading"
      >
        <div className="admin-contact-header">
          <h3 id="contact-panel-heading">
            Next-Steps Email Contact for Chair {selectedChair}
          </h3>
          <p className="admin-contact-desc">
            Configure the church leader who receives participant next-step
            requests for Chair {selectedChair} ({chairs[selectedChair].stageLabel}).
          </p>
        </div>

        {contactStatusMessage && (
          <div
            className={`status-message ${
              contactStatusMessage.type === "error"
                ? "admin-error-message"
                : "admin-success-message"
            }`}
            role="status"
          >
            {contactStatusMessage.text}
          </div>
        )}

        <form onSubmit={handleSaveContact} className="admin-form">
          <div className="admin-form-group">
            <label htmlFor={`contact-email-${selectedChair}`}>
              Recipient Leader Email *
            </label>
            <input
              id={`contact-email-${selectedChair}`}
              type="email"
              required
              placeholder="leader@ocupc.com"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor={`contact-name-${selectedChair}`}>
              Leader Name / Role (Optional)
            </label>
            <input
              id={`contact-name-${selectedChair}`}
              type="text"
              placeholder="e.g. Pastor John / Discipleship Team"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>

          <div className="admin-checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={contactIsEnabled}
                onChange={(e) => setContactIsEnabled(e.target.checked)}
              />{" "}
              Enable participant next-steps outreach for Chair {selectedChair}
            </label>
          </div>

          <div className="admin-action-row">
            <button
              type="submit"
              className="button button-primary admin-btn-sm"
              disabled={isSavingContact}
            >
              {isSavingContact ? "Saving Contact..." : "Save Contact Settings"}
            </button>
          </div>
        </form>
      </section>

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
      </>
      )}
    </main>
  );
}
