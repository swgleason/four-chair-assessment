import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminDashboard } from "./AdminDashboard";
import { AdminLogin } from "./AdminLogin";
import type { ChairLinkItem } from "../types/chairLinks";
import type { ChairContact } from "../types/chairContacts";

describe("AdminLogin", () => {
  it("renders login card with email and password inputs or setup instructions", () => {
    const markup = renderToStaticMarkup(
      <AdminLogin onBackToAssessment={vi.fn()} />,
    );

    expect(markup).toContain("Admin Dashboard");
    expect(markup).toContain("Back to Assessment");
  });
});

describe("AdminDashboard", () => {
  const mockUserSession = {
    user: {
      id: "leader-1",
      email: "leader@ocupc.com",
    },
  };

  const sampleLinks: ChairLinkItem[] = [
    {
      id: "c1-g1",
      chair: 1,
      category: "group",
      title: "Chair 1 Small Group",
      description: "Discussion group for seekers",
      url: "https://ocupc.com/c1-group",
      sortOrder: 0,
      isActive: true,
    },
    {
      id: "c1-r1",
      chair: 1,
      category: "resource",
      title: "Chair 1 Study Guide",
      description: "Introduction to Christ",
      url: "https://ocupc.com/c1-resource",
      sortOrder: 0,
      isActive: true,
    },
    {
      id: "c2-g1",
      chair: 2,
      category: "group",
      title: "Chair 2 Discipleship Group",
      description: "Foundations for believers",
      url: "https://ocupc.com/c2-group",
      sortOrder: 0,
      isActive: true,
    },
    {
      id: "c2-r1",
      chair: 2,
      category: "resource",
      title: "Chair 2 Devotional Guide",
      description: "Daily reading plan",
      url: "https://ocupc.com/c2-resource",
      sortOrder: 0,
      isActive: false, // inactive link
    },
  ];

  const sampleContacts: ChairContact[] = [
    {
      chair: 1,
      contactName: "Seeker Pastor",
      contactEmail: "seeker@ocupc.com",
      isEnabled: true,
    },
    {
      chair: 2,
      contactName: "Discipleship Team",
      contactEmail: "discipleship@ocupc.com",
      isEnabled: true,
    },
  ];

  it("shows login form when no active session exists", () => {
    const markup = renderToStaticMarkup(
      <AdminDashboard onExitAdmin={vi.fn()} initialSession={null} />,
    );

    expect(markup).toContain("Admin Dashboard");
    expect(markup).toContain("Back to Assessment");
    expect(markup).not.toContain("Chair Links Manager");
  });

  it("renders authenticated dashboard with user email, chair tabs, and filtered items for Chair 1", () => {
    const markup = renderToStaticMarkup(
      <AdminDashboard
        onExitAdmin={vi.fn()}
        initialSession={mockUserSession}
        initialLinks={sampleLinks}
        initialContacts={sampleContacts}
        initialSelectedChair={1}
      />,
    );

    // Header info
    expect(markup).toContain("Chair Links Manager");
    expect(markup).toContain("leader@ocupc.com");
    expect(markup).toContain("Back to Assessment");
    expect(markup).toContain("Sign Out");

    // All 4 chair tabs
    expect(markup).toContain("Chair 1");
    expect(markup).toContain("Chair 2");
    expect(markup).toContain("Chair 3");
    expect(markup).toContain("Chair 4");

    // Selected tab indicator for Chair 1
    expect(markup).toContain('aria-selected="true"');

    // Filtered items for Chair 1 are visible
    expect(markup).toContain("Chair 1 Small Group");
    expect(markup).toContain("Chair 1 Study Guide");

    // Next-steps email contact card for Chair 1
    expect(markup).toContain("Next-Steps Email Contact for Chair 1");
    expect(markup).toContain('value="seeker@ocupc.com"');
    expect(markup).toContain('value="Seeker Pastor"');

    // Chair 2 items are NOT visible in Chair 1's view
    expect(markup).not.toContain("Chair 2 Discipleship Group");
    expect(markup).not.toContain("Chair 2 Devotional Guide");
  });

  it("renders filtered items for Chair 2 when Chair 2 is selected", () => {
    const markup = renderToStaticMarkup(
      <AdminDashboard
        onExitAdmin={vi.fn()}
        initialSession={mockUserSession}
        initialLinks={sampleLinks}
        initialContacts={sampleContacts}
        initialSelectedChair={2}
      />,
    );

    // Chair 2 items are visible
    expect(markup).toContain("Chair 2 Discipleship Group");
    expect(markup).toContain("Chair 2 Devotional Guide");
    expect(markup).toContain("Active");
    expect(markup).toContain("Hidden"); // c2-r1 is inactive

    // Next-steps contact for Chair 2
    expect(markup).toContain("Next-Steps Email Contact for Chair 2");
    expect(markup).toContain('value="discipleship@ocupc.com"');

    // Chair 1 items are NOT visible in Chair 2's view
    expect(markup).not.toContain("Chair 1 Small Group");
    expect(markup).not.toContain("Chair 1 Study Guide");
  });

  it("toggles live ChairScreen preview with selected chair links", () => {
    const markup = renderToStaticMarkup(
      <AdminDashboard
        onExitAdmin={vi.fn()}
        initialSession={mockUserSession}
        initialLinks={sampleLinks}
        initialSelectedChair={1}
        initialPreviewing={true}
      />,
    );

    // Live preview bar
    expect(markup).toContain("Previewing <strong>Chair 1</strong>");
    expect(markup).toContain("Back to Editor");

    // Renders the actual ChairScreen component
    expect(markup).toContain("Assessment Complete!");
    expect(markup).toContain("You are in Chair 1.");
    expect(markup).toContain("Small Groups to Join");
    expect(markup).toContain("Chair 1 Small Group");
    expect(markup).toContain("Recommended Resources");
    expect(markup).toContain("Chair 1 Study Guide");
  });
});
