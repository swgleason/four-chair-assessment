import { describe, expect, it } from "vitest";
import {
  getVisitedChairsSorted,
  mapRowToParticipantChairState,
  validateParticipantChairStateRow,
  type ParticipantChairState,
  type ParticipantChairStateRow,
} from "./participantTracking";

// ============================================================
// Helpers
// ============================================================

function makeRow(
  overrides: Partial<ParticipantChairStateRow> = {},
): ParticipantChairStateRow {
  return {
    user_id: "00000000-0000-0000-0000-000000000001",
    email: "test@example.com",
    display_name: null,
    current_chair: null,
    current_chair_updated_at: null,
    chair_1_last_at: null,
    chair_2_last_at: null,
    chair_3_last_at: null,
    chair_4_last_at: null,
    chair_score: null,
    focus_responses: [],
    in_progress_state: null,
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeState(
  overrides: Partial<ParticipantChairState> = {},
): ParticipantChairState {
  return {
    userId: "00000000-0000-0000-0000-000000000001",
    email: "test@example.com",
    displayName: null,
    currentChair: null,
    currentChairUpdatedAt: null,
    chair1LastAt: null,
    chair2LastAt: null,
    chair3LastAt: null,
    chair4LastAt: null,
    chairScore: null,
    focusResponses: [],
    inProgressState: null,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

// ============================================================
// validateParticipantChairStateRow
// ============================================================

describe("validateParticipantChairStateRow", () => {
  it("accepts a minimal valid row", () => {
    expect(validateParticipantChairStateRow(makeRow())).toBe(true);
  });

  it("accepts a fully populated valid row", () => {
    const row = makeRow({
      display_name: "Alice",
      current_chair: 2,
      current_chair_updated_at: "2026-06-01T10:00:00.000Z",
      chair_1_last_at: "2026-03-01T08:00:00.000Z",
      chair_2_last_at: "2026-06-01T10:00:00.000Z",
      chair_score: 2.71,
      focus_responses: ["Focus one", "Focus two"],
      in_progress_state: { currentQuestion: 3, answers: {} },
    });
    expect(validateParticipantChairStateRow(row)).toBe(true);
  });

  it("rejects null", () => {
    expect(validateParticipantChairStateRow(null)).toBe(false);
  });

  it("rejects non-object", () => {
    expect(validateParticipantChairStateRow("string")).toBe(false);
    expect(validateParticipantChairStateRow(42)).toBe(false);
  });

  it("rejects missing / empty user_id", () => {
    expect(validateParticipantChairStateRow(makeRow({ user_id: "" }))).toBe(false);
    expect(validateParticipantChairStateRow(makeRow({ user_id: "   " }))).toBe(false);
  });

  it("rejects missing / empty email", () => {
    expect(validateParticipantChairStateRow(makeRow({ email: "" }))).toBe(false);
  });

  it("rejects non-null, non-string display_name", () => {
    expect(
      validateParticipantChairStateRow(makeRow({ display_name: 42 as unknown as string })),
    ).toBe(false);
  });

  it("rejects out-of-range current_chair", () => {
    expect(validateParticipantChairStateRow(makeRow({ current_chair: 0 }))).toBe(false);
    expect(validateParticipantChairStateRow(makeRow({ current_chair: 5 }))).toBe(false);
  });

  it("rejects non-integer current_chair", () => {
    expect(validateParticipantChairStateRow(makeRow({ current_chair: 1.5 }))).toBe(false);
  });

  it("accepts current_chair of 1, 2, 3, 4", () => {
    for (const chair of [1, 2, 3, 4] as const) {
      expect(validateParticipantChairStateRow(makeRow({ current_chair: chair }))).toBe(true);
    }
  });

  it("rejects invalid ISO date strings for timestamp fields", () => {
    expect(
      validateParticipantChairStateRow(makeRow({ chair_1_last_at: "not-a-date" })),
    ).toBe(false);
    expect(
      validateParticipantChairStateRow(makeRow({ current_chair_updated_at: "bad" })),
    ).toBe(false);
    expect(
      validateParticipantChairStateRow(makeRow({ updated_at: "bad" })),
    ).toBe(false);
  });

  it("rejects non-string timestamp fields", () => {
    expect(
      validateParticipantChairStateRow(makeRow({ chair_2_last_at: 12345 as unknown as string })),
    ).toBe(false);
  });
});

// ============================================================
// mapRowToParticipantChairState
// ============================================================

describe("mapRowToParticipantChairState", () => {
  it("maps a minimal row correctly", () => {
    const state = mapRowToParticipantChairState(makeRow());
    expect(state.userId).toBe("00000000-0000-0000-0000-000000000001");
    expect(state.email).toBe("test@example.com");
    expect(state.displayName).toBeNull();
    expect(state.currentChair).toBeNull();
    expect(state.currentChairUpdatedAt).toBeNull();
    expect(state.chair1LastAt).toBeNull();
    expect(state.chair2LastAt).toBeNull();
    expect(state.chair3LastAt).toBeNull();
    expect(state.chair4LastAt).toBeNull();
    expect(state.chairScore).toBeNull();
    expect(state.focusResponses).toEqual([]);
    expect(state.inProgressState).toBeNull();
    expect(state.updatedAt).toEqual(new Date("2026-01-01T00:00:00.000Z"));
  });

  it("maps a fully populated row correctly", () => {
    const row = makeRow({
      display_name: "Bob",
      current_chair: 3,
      current_chair_updated_at: "2026-09-01T12:00:00.000Z",
      chair_1_last_at: "2026-03-01T08:00:00.000Z",
      chair_2_last_at: "2026-06-01T10:00:00.000Z",
      chair_3_last_at: "2026-09-01T12:00:00.000Z",
      chair_4_last_at: null,
      chair_score: 3.71,
      focus_responses: ["One", "Two"],
      in_progress_state: { q: 1 },
    });
    const state = mapRowToParticipantChairState(row);
    expect(state.displayName).toBe("Bob");
    expect(state.currentChair).toBe(3);
    expect(state.currentChairUpdatedAt).toEqual(new Date("2026-09-01T12:00:00.000Z"));
    expect(state.chair1LastAt).toEqual(new Date("2026-03-01T08:00:00.000Z"));
    expect(state.chair2LastAt).toEqual(new Date("2026-06-01T10:00:00.000Z"));
    expect(state.chair3LastAt).toEqual(new Date("2026-09-01T12:00:00.000Z"));
    expect(state.chair4LastAt).toBeNull();
    expect(state.chairScore).toBe(3.71);
    expect(state.focusResponses).toEqual(["One", "Two"]);
    expect(state.inProgressState).toEqual({ q: 1 });
  });

  it("casts current_chair to ChairNumber", () => {
    const state = mapRowToParticipantChairState(makeRow({ current_chair: 4 }));
    expect(state.currentChair).toBe(4);
  });
});

// ============================================================
// getVisitedChairsSorted
// ============================================================

describe("getVisitedChairsSorted", () => {
  it("returns an empty list for a brand-new participant", () => {
    const result = getVisitedChairsSorted(makeState());
    expect(result).toHaveLength(0);
  });

  it("returns a single entry when only currentChair is set (no per-chair timestamps)", () => {
    const updatedAt = new Date("2026-06-15T09:00:00.000Z");
    const currentChairUpdatedAt = new Date("2026-06-15T09:00:00.000Z");
    const state = makeState({ currentChair: 2, currentChairUpdatedAt, updatedAt });
    const result = getVisitedChairsSorted(state);
    expect(result).toHaveLength(1);
    expect(result[0].chair).toBe(2);
    expect(result[0].isCurrent).toBe(true);
    expect(result[0].lastAt).toEqual(currentChairUpdatedAt);
  });

  it("falls back to updatedAt when currentChair has no timestamp", () => {
    const updatedAt = new Date("2026-06-15T09:00:00.000Z");
    const state = makeState({ currentChair: 1, updatedAt });
    const result = getVisitedChairsSorted(state);
    expect(result).toHaveLength(1);
    expect(result[0].lastAt).toEqual(updatedAt);
    expect(result[0].isCurrent).toBe(true);
  });

  it("sorts multiple chairs most-recent to least-recent", () => {
    const state = makeState({
      currentChair: 3,
      currentChairUpdatedAt: new Date("2026-09-01T00:00:00.000Z"),
      chair1LastAt: new Date("2026-03-01T00:00:00.000Z"),
      chair2LastAt: new Date("2026-06-01T00:00:00.000Z"),
      chair3LastAt: new Date("2026-09-01T00:00:00.000Z"),
    });
    const result = getVisitedChairsSorted(state);
    expect(result.map((e) => e.chair)).toEqual([3, 2, 1]);
    expect(result[0].lastAt.getTime()).toBeGreaterThan(result[1].lastAt.getTime());
    expect(result[1].lastAt.getTime()).toBeGreaterThan(result[2].lastAt.getTime());
  });

  it("tags only the currentChair entry as isCurrent", () => {
    const state = makeState({
      currentChair: 2,
      chair1LastAt: new Date("2026-03-01T00:00:00.000Z"),
      chair2LastAt: new Date("2026-06-01T00:00:00.000Z"),
      chair3LastAt: new Date("2026-09-01T00:00:00.000Z"),
    });
    const result = getVisitedChairsSorted(state);
    for (const entry of result) {
      expect(entry.isCurrent).toBe(entry.chair === 2);
    }
  });

  it("includes all four chairs with correct timestamps", () => {
    const state = makeState({
      currentChair: 4,
      chair1LastAt: new Date("2026-01-01T00:00:00.000Z"),
      chair2LastAt: new Date("2026-04-01T00:00:00.000Z"),
      chair3LastAt: new Date("2026-07-01T00:00:00.000Z"),
      chair4LastAt: new Date("2026-10-01T00:00:00.000Z"),
    });
    const result = getVisitedChairsSorted(state);
    expect(result).toHaveLength(4);
    expect(result.map((e) => e.chair)).toEqual([4, 3, 2, 1]);
    expect(result[0].isCurrent).toBe(true);
    expect(result[1].isCurrent).toBe(false);
  });

  it("does not duplicate currentChair when its per-chair timestamp is also set", () => {
    const chair2LastAt = new Date("2026-06-01T00:00:00.000Z");
    const state = makeState({
      currentChair: 2,
      currentChairUpdatedAt: new Date("2026-06-01T00:00:00.000Z"),
      chair2LastAt,
    });
    const result = getVisitedChairsSorted(state);
    expect(result).toHaveLength(1);
    expect(result[0].chair).toBe(2);
    expect(result[0].isCurrent).toBe(true);
    // Per-chair timestamp wins (it was set in the map before the current_chair fallback path).
    expect(result[0].lastAt).toEqual(chair2LastAt);
  });

  it("uses per-chair lastAt, not currentChairUpdatedAt, for the current entry when both exist", () => {
    const perChairTime = new Date("2026-06-01T10:00:00.000Z");
    const updatedTime = new Date("2026-06-01T11:00:00.000Z"); // different
    const state = makeState({
      currentChair: 1,
      currentChairUpdatedAt: updatedTime,
      chair1LastAt: perChairTime,
    });
    const result = getVisitedChairsSorted(state);
    expect(result[0].lastAt).toEqual(perChairTime);
  });

  it("handles ties in timestamp order stably (all chairs at same time)", () => {
    const sameTime = new Date("2026-06-01T00:00:00.000Z");
    const state = makeState({
      currentChair: 3,
      chair1LastAt: sameTime,
      chair2LastAt: sameTime,
      chair3LastAt: sameTime,
    });
    const result = getVisitedChairsSorted(state);
    expect(result).toHaveLength(3);
    // All lastAt should be equal
    result.forEach((e) => expect(e.lastAt).toEqual(sameTime));
    // isCurrent still correctly tagged
    const currentEntry = result.find((e) => e.isCurrent);
    expect(currentEntry?.chair).toBe(3);
  });

  it("includes currentChair at chair 4 not duplicated when per-chair timestamp set", () => {
    const state = makeState({
      currentChair: 4,
      currentChairUpdatedAt: new Date("2026-10-01T00:00:00.000Z"),
      chair_4_last_at: undefined, // won't apply directly; use the field name on state
      chair4LastAt: new Date("2026-10-01T00:00:00.000Z"),
    } as Partial<ParticipantChairState>);
    const result = getVisitedChairsSorted(state);
    const chair4Entries = result.filter((e) => e.chair === 4);
    expect(chair4Entries).toHaveLength(1);
    expect(chair4Entries[0].isCurrent).toBe(true);
  });
});
