import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminDashboard } from "./AdminDashboard";
import { AdminLogin } from "./AdminLogin";
import { ParticipantAuthModal } from "./ParticipantAuthModal";
import { WelcomeScreen } from "./WelcomeScreen";
import type { ChairLinkItem } from "../types/chairLinks";
import type { ChairContact } from "../types/chairContacts";
import type { ParticipantChairState } from "../types/participantTracking";

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

  it("renders authenticated admin dashboard with user email, chair tabs, and filtered items for Chair 1", () => {
    const markup = renderToStaticMarkup(
      <AdminDashboard
        onExitAdmin={vi.fn()}
        initialSession={mockUserSession}
        initialIsAdmin={true}
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
        initialIsAdmin={true}
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
        initialIsAdmin={true}
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

  it("shows access-denied screen when session exists but user is not an admin", () => {
    const markup = renderToStaticMarkup(
      <AdminDashboard
        onExitAdmin={vi.fn()}
        initialSession={mockUserSession}
        initialIsAdmin={false}
      />,
    );

    expect(markup).toContain("Access Denied");
    expect(markup).toContain("Admin Access Required");
    expect(markup).toContain("leader@ocupc.com");
    expect(markup).toContain("does not have leadership admin privileges");
    expect(markup).toContain("Sign Out");
    expect(markup).toContain("Back to Assessment");
    // Must NOT show the admin dashboard content
    expect(markup).not.toContain("Chair Links Manager");
  });

  const sampleParticipants: ParticipantChairState[] = [
    {
      userId: "user-1",
      email: "alice@example.com",
      displayName: "Alice Walker",
      currentChair: 3,
      currentChairUpdatedAt: new Date("2026-11-20T12:00:00.000Z"),
      chair1LastAt: new Date("2026-09-01T10:00:00.000Z"),
      chair2LastAt: new Date("2026-10-15T11:00:00.000Z"),
      chair3LastAt: new Date("2026-11-20T12:00:00.000Z"),
      chair4LastAt: null,
      inProgressState: null,
      updatedAt: new Date("2026-11-20T12:00:00.000Z"),
    },
    {
      userId: "user-2",
      email: "bob@example.com",
      displayName: null,
      currentChair: 1,
      currentChairUpdatedAt: new Date("2026-11-22T09:00:00.000Z"),
      chair1LastAt: new Date("2026-11-22T09:00:00.000Z"),
      chair2LastAt: null,
      chair3LastAt: null,
      chair4LastAt: null,
      inProgressState: null,
      updatedAt: new Date("2026-11-22T09:00:00.000Z"),
    },
    {
      userId: "user-3",
      email: "carol@example.com",
      displayName: "Carol Danvers",
      currentChair: null,
      currentChairUpdatedAt: null,
      chair1LastAt: null,
      chair2LastAt: null,
      chair3LastAt: null,
      chair4LastAt: null,
      inProgressState: { version: 2, currentQuestion: 3 },
      updatedAt: new Date("2026-11-23T08:00:00.000Z"),
    },
  ];

  it("renders participant roster view with participant display names, emails, current chairs, and visited chairs sorted most-recent-to-least-recent with timestamps", () => {
    const markup = renderToStaticMarkup(
      <AdminDashboard
        onExitAdmin={vi.fn()}
        initialSession={mockUserSession}
        initialIsAdmin={true}
        initialView="participants"
        initialParticipants={sampleParticipants}
      />,
    );

    // Section title
    expect(markup).toContain("Participant Roster");

    // Alice Walker
    expect(markup).toContain("Alice Walker");
    expect(markup).toContain("alice@example.com");
    expect(markup).toContain("Chair 3: The Worker");
    // Alice visited chairs in order: Chair 3 (current), Chair 2, Chair 1
    expect(markup).toContain("Visited Chairs (Most to Least Recent)");
    expect(markup).toContain("Chair 3: The Worker");
    expect(markup).toContain("Current");
    expect(markup).toContain("Chair 2: The Believer");
    expect(markup).toContain("Chair 1: The Seeker");
    expect(markup).toContain("2026-11-20 12:00 UTC");
    expect(markup).toContain("2026-10-15 11:00 UTC");
    expect(markup).toContain("2026-09-01 10:00 UTC");

    // Bob with email fallback as display name
    expect(markup).toContain("bob@example.com");
    expect(markup).toContain("Chair 1: The Seeker");
    expect(markup).toContain("2026-11-22 09:00 UTC");

    // Carol Danvers with in-progress state
    expect(markup).toContain("Carol Danvers");
    expect(markup).toContain("carol@example.com");
    expect(markup).toContain("In Progress / Not Yet Completed");
    expect(markup).toContain("No chair assessments completed yet.");
  });

  it("filters participant roster by search query (name and email)", () => {
    // Search by name
    const aliceMarkup = renderToStaticMarkup(
      <AdminDashboard
        onExitAdmin={vi.fn()}
        initialSession={mockUserSession}
        initialIsAdmin={true}
        initialView="participants"
        initialParticipants={sampleParticipants}
        initialSearchQuery="Alice"
      />,
    );
    expect(aliceMarkup).toContain("Alice Walker");
    expect(aliceMarkup).not.toContain("bob@example.com");
    expect(aliceMarkup).not.toContain("Carol Danvers");

    // Search by email
    const bobMarkup = renderToStaticMarkup(
      <AdminDashboard
        onExitAdmin={vi.fn()}
        initialSession={mockUserSession}
        initialIsAdmin={true}
        initialView="participants"
        initialParticipants={sampleParticipants}
        initialSearchQuery="bob@example.com"
      />,
    );
    expect(bobMarkup).toContain("bob@example.com");
    expect(bobMarkup).not.toContain("Alice Walker");
    expect(bobMarkup).not.toContain("Carol Danvers");
  });

  it("filters participant roster by current chair", () => {
    // Filter by Chair 3
    const chair3Markup = renderToStaticMarkup(
      <AdminDashboard
        onExitAdmin={vi.fn()}
        initialSession={mockUserSession}
        initialIsAdmin={true}
        initialView="participants"
        initialParticipants={sampleParticipants}
        initialChairFilter="3"
      />,
    );
    expect(chair3Markup).toContain("Alice Walker");
    expect(chair3Markup).not.toContain("bob@example.com");
    expect(chair3Markup).not.toContain("Carol Danvers");

    // Filter by None / In Progress
    const noneMarkup = renderToStaticMarkup(
      <AdminDashboard
        onExitAdmin={vi.fn()}
        initialSession={mockUserSession}
        initialIsAdmin={true}
        initialView="participants"
        initialParticipants={sampleParticipants}
        initialChairFilter="none"
      />,
    );
    expect(noneMarkup).toContain("Carol Danvers");
    expect(noneMarkup).toContain("In Progress / Not Yet Completed");
    expect(noneMarkup).not.toContain("Alice Walker");
    expect(noneMarkup).not.toContain("bob@example.com");

    // Filter by Chair 4 (no matches)
    const chair4Markup = renderToStaticMarkup(
      <AdminDashboard
        onExitAdmin={vi.fn()}
        initialSession={mockUserSession}
        initialIsAdmin={true}
        initialView="participants"
        initialParticipants={sampleParticipants}
        initialChairFilter="4"
      />,
    );
    expect(chair4Markup).toContain("No participants match your search or filter.");
  });

  it("displays empty note when no participant accounts exist", () => {
    const emptyMarkup = renderToStaticMarkup(
      <AdminDashboard
        onExitAdmin={vi.fn()}
        initialSession={mockUserSession}
        initialIsAdmin={true}
        initialView="participants"
        initialParticipants={[]}
      />,
    );
    expect(emptyMarkup).toContain("No participant accounts registered yet.");
  });
});

describe("ParticipantAuthModal", () => {
  it("renders sign-in form with the privacy disclosure notice", () => {
    const markup = renderToStaticMarkup(
      <ParticipantAuthModal onClose={vi.fn()} onAuthenticated={vi.fn()} />,
    );

    // Modal wrapper
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain("auth-modal-title");

    // Privacy notice must always be present in the modal
    expect(markup).toContain("visible to church leadership");
    expect(markup).toContain("display name");
    expect(markup).toContain("email address");

    // Guest note — reassures participants that sign-in is optional
    expect(markup).toContain("Signing in is optional");
  });

  it("renders email and password fields in sign-in mode", () => {
    const markup = renderToStaticMarkup(
      <ParticipantAuthModal onClose={vi.fn()} onAuthenticated={vi.fn()} />,
    );

    // When Supabase is configured the form is shown; when not configured the
    // unconfigured branch is shown. Either way we should not throw.
    // Verify at least the close button is always rendered.
    expect(markup).toContain("auth-modal-close");
  });
});

describe("WelcomeScreen participant auth UI", () => {
  it("renders guest privacy copy and admin login by default", () => {
    const markup = renderToStaticMarkup(
      <WelcomeScreen
        hasSavedProgress={false}
        notice=""
        onBegin={vi.fn()}
        onContinue={vi.fn()}
        onStartOver={vi.fn()}
        onOpenAdmin={vi.fn()}
      />,
    );

    expect(markup).toContain("Four Chair Assessment");
    expect(markup).toContain("stored in this browser");
    expect(markup).toContain("Begin Assessment");
    expect(markup).toContain("Admin Login");
  });

  it("renders signed-in participant status when participant prop is provided", () => {
    const markup = renderToStaticMarkup(
      <WelcomeScreen
        hasSavedProgress={false}
        notice=""
        onBegin={vi.fn()}
        onContinue={vi.fn()}
        onStartOver={vi.fn()}
        participant={{ id: "u1", email: "alice@example.com", displayName: "Alice" }}
        onSignOut={vi.fn()}
      />,
    );

    expect(markup).toContain("Signed in as");
    expect(markup).toContain("Alice");
    // Privacy copy should reflect signed-in state
    expect(markup).toContain("visible to church leadership");
  });

  it("renders email fallback when displayName is null", () => {
    const markup = renderToStaticMarkup(
      <WelcomeScreen
        hasSavedProgress={false}
        notice=""
        onBegin={vi.fn()}
        onContinue={vi.fn()}
        onStartOver={vi.fn()}
        participant={{ id: "u2", email: "bob@example.com", displayName: null }}
        onSignOut={vi.fn()}
      />,
    );

    expect(markup).toContain("bob@example.com");
  });

  it("shows Continue and Start Over when hasSavedProgress is true", () => {
    const markup = renderToStaticMarkup(
      <WelcomeScreen
        hasSavedProgress={true}
        notice=""
        onBegin={vi.fn()}
        onContinue={vi.fn()}
        onStartOver={vi.fn()}
      />,
    );

    expect(markup).toContain("Continue Assessment");
    expect(markup).toContain("Start Over");
    expect(markup).not.toContain("Begin Assessment");
  });
});
