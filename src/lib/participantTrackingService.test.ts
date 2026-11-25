import { describe, expect, it } from "vitest";
import {
  applyCompletedAssessmentToRow,
  applyInProgressPayloadToRow,
  buildCompletedAssessmentPayload,
  buildInitialParticipantRow,
  buildInProgressPayload,
  reconcileProgressOnAuth,
} from "./participantTrackingService";
import type { AssessmentProgress } from "./progressStorage";
import {
  getVisitedChairsSorted,
  mapRowToParticipantChairState,
  type ParticipantChairState,
} from "../types/participantTracking";

function makeInProgress(
  overrides: Partial<AssessmentProgress> = {},
): AssessmentProgress {
  return {
    version: 2,
    answers: { 1: "agree", 2: "agree" },
    currentQuestion: 3,
    completed: false,
    destination: null,
    updatedAt: "2026-11-23T10:00:00.000Z",
    ...overrides,
  };
}

function makeCompleted(
  overrides: Partial<AssessmentProgress> = {},
): AssessmentProgress {
  return {
    version: 2,
    answers: {
      1: "agree",
      2: "agree",
      3: "agree",
      4: "agree",
      5: "agree",
      6: "agree",
      7: "agree",
    },
    currentQuestion: 7,
    completed: true,
    destination: 1,
    updatedAt: "2026-11-23T12:00:00.000Z",
    ...overrides,
  };
}

function makeRemoteState(
  overrides: Partial<ParticipantChairState> = {},
): ParticipantChairState {
  return {
    userId: "test-user-id",
    email: "test@example.com",
    displayName: "Test User",
    currentChair: null,
    currentChairUpdatedAt: null,
    chair1LastAt: null,
    chair2LastAt: null,
    chair3LastAt: null,
    chair4LastAt: null,
    chairScore: null,
    focusResponses: [],
    inProgressState: null,
    updatedAt: new Date("2026-11-23T08:00:00.000Z"),
    ...overrides,
  };
}

describe("participantTrackingService: Strict rule enforcement", () => {
  it("buildInProgressPayload strictly includes only in_progress_state and updated_at", () => {
    const progress = makeInProgress();
    const payload = buildInProgressPayload(progress);

    expect(payload.in_progress_state).toEqual(progress);
    expect(typeof payload.updated_at).toBe("string");

    // Strictly ensure no chair assignment fields are present
    const record = payload as Record<string, unknown>;
    expect(record["current_chair"]).toBeUndefined();
    expect(record["current_chair_updated_at"]).toBeUndefined();
    expect(record["chair_1_last_at"]).toBeUndefined();
    expect(record["chair_2_last_at"]).toBeUndefined();
    expect(record["chair_3_last_at"]).toBeUndefined();
    expect(record["chair_4_last_at"]).toBeUndefined();
    expect(record["chair_score"]).toBeUndefined();
    expect(record["focus_responses"]).toBeUndefined();
  });

  it("buildInProgressPayload sets in_progress_state to null when progress is cleared/null", () => {
    const payload = buildInProgressPayload(null);
    expect(payload.in_progress_state).toBeNull();

    const record = payload as Record<string, unknown>;
    expect(record["current_chair"]).toBeUndefined();
  });

  it("buildInitialParticipantRow with incomplete progress sets chair assignments to null", () => {
    const progress = makeInProgress();
    const user = { id: "user-1", email: "u@example.com", displayName: "User" };
    const row = buildInitialParticipantRow(user, progress);

    expect(row["user_id"]).toBe("user-1");
    expect(row["email"]).toBe("u@example.com");
    expect(row["display_name"]).toBe("User");
    expect(row["current_chair"]).toBeNull();
    expect(row["current_chair_updated_at"]).toBeNull();
    expect(row["chair_1_last_at"]).toBeNull();
    expect(row["chair_2_last_at"]).toBeNull();
    expect(row["chair_3_last_at"]).toBeNull();
    expect(row["chair_4_last_at"]).toBeNull();
    expect(row["chair_score"]).toBeNull();
    expect(row["focus_responses"]).toEqual([]);
    expect(row["in_progress_state"]).toEqual(progress);
  });

  it("buildCompletedAssessmentPayload throws if passed incomplete progress", () => {
    const incomplete = makeInProgress({ completed: false });
    expect(() => buildCompletedAssessmentPayload(incomplete)).toThrow(
      "Cannot record an incomplete or invalid assessment as completed.",
    );

    const missingDestination = makeCompleted({ destination: null });
    expect(() => buildCompletedAssessmentPayload(missingDestination)).toThrow(
      "Cannot record an incomplete or invalid assessment as completed.",
    );
  });

  it("buildCompletedAssessmentPayload throws on invalid chair numbers", () => {
    const invalidLow = makeCompleted({ destination: 0 as any });
    expect(() => buildCompletedAssessmentPayload(invalidLow)).toThrow(
      "Cannot record an incomplete or invalid assessment as completed.",
    );

    const invalidHigh = makeCompleted({ destination: 5 as any });
    expect(() => buildCompletedAssessmentPayload(invalidHigh)).toThrow(
      "Cannot record an incomplete or invalid assessment as completed.",
    );

    const nonInteger = makeCompleted({ destination: 2.5 as any });
    expect(() => buildCompletedAssessmentPayload(nonInteger)).toThrow(
      "Cannot record an incomplete or invalid assessment as completed.",
    );
  });
});

describe("participantTrackingService: Completed assessment payload exact keys", () => {
  it.each([1, 2, 3, 4] as const)(
    "for Chair %i, updates ONLY chair_%i_last_at and leaves all other chair timestamps unreferenced",
    (chair) => {
      const timestamp = "2026-11-23T15:00:00.000Z";
      const completed = makeCompleted({ destination: chair, updatedAt: timestamp });
      const payload = buildCompletedAssessmentPayload(completed);

      // Verify exact keys present
      const keys = Object.keys(payload);
      expect(keys).toContain("current_chair");
      expect(keys).toContain("current_chair_updated_at");
      expect(keys).toContain(`chair_${chair}_last_at`);
      expect(keys).toContain("chair_score");
      expect(keys).toContain("focus_responses");
      expect(keys).toContain("in_progress_state");
      expect(keys).toContain("updated_at");
      expect(keys).toHaveLength(7);

      // Verify values
      expect(payload["current_chair"]).toBe(chair);
      expect(payload["current_chair_updated_at"]).toBe(timestamp);
      expect(payload[`chair_${chair}_last_at`]).toBe(timestamp);
      expect(payload["in_progress_state"]).toBeNull();

      // Verify other chair timestamp keys are strictly absent
      for (const otherChair of [1, 2, 3, 4] as const) {
        if (otherChair !== chair) {
          expect(payload[`chair_${otherChair}_last_at`]).toBeUndefined();
        }
      }
    },
  );

  it("buildInitialParticipantRow with completed progress assigns ONLY destination chair field", () => {
    const completed = makeCompleted({
      destination: 2,
      updatedAt: "2026-11-23T14:00:00.000Z",
      chairScore: 2.71,
      focusResponses: ["Chair 1 focus", "Question 15 focus"],
    });
    const user = { id: "user-2", email: "u2@example.com", displayName: "User 2" };
    const row = buildInitialParticipantRow(user, completed);

    expect(row["current_chair"]).toBe(2);
    expect(row["current_chair_updated_at"]).toBe("2026-11-23T14:00:00.000Z");
    expect(row["chair_2_last_at"]).toBe("2026-11-23T14:00:00.000Z");
    expect(row["chair_1_last_at"]).toBeNull();
    expect(row["chair_3_last_at"]).toBeNull();
    expect(row["chair_4_last_at"]).toBeNull();
    expect(row["chair_score"]).toBe(2.71);
    expect(row["focus_responses"]).toEqual([
      "Chair 1 focus",
      "Question 15 focus",
    ]);
    expect(row["in_progress_state"]).toBeNull();
  });
});

describe("participantTrackingService: Sonlife result persistence", () => {
  it("persists S3 failure as Chair 2 using Section 2's fractional score", () => {
    const answers: Partial<Record<number, "agree" | "strong" | "weak" | "improving">> =
      {};
    for (let i = 1; i <= 7; i++) answers[i] = "agree";
    for (let i = 8; i <= 14; i++) answers[i] = i === 14 ? "weak" : "strong";
    for (let i = 15; i <= 21; i++) answers[i] = "weak";

    const progress = makeCompleted({
      answers,
      currentQuestion: 21,
      destination: 2,
      chairScore: 2.86,
      focusResponses: ["Focus 1", "Focus 2"],
    });
    const payload = buildCompletedAssessmentPayload(progress);

    expect(payload.current_chair).toBe(2);
    expect(payload.chair_score).toBe(2.86);
    expect(payload.focus_responses).toEqual(["Focus 1", "Focus 2"]);
  });

  it("persists S4 failure as Chair 3 using Section 3's fractional score", () => {
    const answers: Partial<Record<number, "agree" | "strong" | "weak" | "improving">> =
      {};
    for (let i = 1; i <= 7; i++) answers[i] = "agree";
    for (let i = 8; i <= 14; i++) answers[i] = "strong";
    for (let i = 15; i <= 21; i++) answers[i] = "strong";
    for (let i = 22; i <= 28; i++) answers[i] = "weak";

    const progress = makeCompleted({
      answers,
      currentQuestion: 28,
      destination: 3,
      chairScore: 3.9,
      focusResponses: ["Focus 1"],
    });
    const payload = buildCompletedAssessmentPayload(progress);

    expect(payload.current_chair).toBe(3);
    expect(payload.chair_score).toBe(3.9);
  });

  it.each([
    [2, 2.9],
    [3, 3.9],
    [4, 4.9],
  ] as const)("preserves fractional result %s.0 as %s", (chair, score) => {
    const payload = buildCompletedAssessmentPayload(
      makeCompleted({
        destination: chair,
        chairScore: score,
      }),
    );
    expect(payload.chair_score).toBe(score);
  });

  it("normalizes focus responses and caps them at four items", () => {
    const payload = buildCompletedAssessmentPayload(
      makeCompleted({
        destination: 4,
        chairScore: 4.67,
        focusResponses: ["A", "B", "C", "D", "E"],
      }),
    );
    expect(payload.focus_responses).toEqual(["A", "B", "C", "D"]);
  });

  it("applies Sonlife fields to an existing row only during completion", () => {
    const completed = makeCompleted({
      destination: 4,
      chairScore: 4.67,
      focusResponses: ["One", "Two"],
    });
    const user = { id: "user-1", email: "u@example.com", displayName: "User" };
    let row = buildInitialParticipantRow(user, makeInProgress());

    row = applyCompletedAssessmentToRow(row, completed);

    expect(row.current_chair).toBe(4);
    expect(row.chair_score).toBe(4.67);
    expect(row.focus_responses).toEqual(["One", "Two"]);
    expect(row.in_progress_state).toBeNull();

    row = applyInProgressPayloadToRow(row, makeInProgress());
    expect(row.chair_score).toBe(4.67);
    expect(row.focus_responses).toEqual(["One", "Two"]);
  });
});

describe("participantTrackingService: Sequential completions across different chairs", () => {
  it("preserves prior chair timestamps when updating to subsequent chairs", () => {
    const user = { id: "seq-user-1", email: "seq@example.com", displayName: "Seq User" };

    // Step 1: User completes in Chair 1 on Day 1
    const t1 = "2026-01-01T10:00:00.000Z";
    const run1 = makeCompleted({ destination: 1, updatedAt: t1 });
    let row = buildInitialParticipantRow(user, run1);

    expect(row.current_chair).toBe(1);
    expect(row.current_chair_updated_at).toBe(t1);
    expect(row.chair_1_last_at).toBe(t1);
    expect(row.chair_2_last_at).toBeNull();
    expect(row.chair_3_last_at).toBeNull();
    expect(row.chair_4_last_at).toBeNull();
    expect(row.in_progress_state).toBeNull();

    let state = mapRowToParticipantChairState(row);
    let visited = getVisitedChairsSorted(state);
    expect(visited).toHaveLength(1);
    expect(visited[0]).toEqual({ chair: 1, lastAt: new Date(t1), isCurrent: true });

    // Step 2: User completes in Chair 2 on Day 10
    const t2 = "2026-01-10T12:00:00.000Z";
    const run2 = makeCompleted({ destination: 2, updatedAt: t2 });
    row = applyCompletedAssessmentToRow(row, run2);

    expect(row.current_chair).toBe(2);
    expect(row.current_chair_updated_at).toBe(t2);
    expect(row.chair_2_last_at).toBe(t2);
    // Prior Chair 1 timestamp MUST be untouched
    expect(row.chair_1_last_at).toBe(t1);
    // Chairs 3 and 4 remain null
    expect(row.chair_3_last_at).toBeNull();
    expect(row.chair_4_last_at).toBeNull();
    expect(row.in_progress_state).toBeNull();

    state = mapRowToParticipantChairState(row);
    visited = getVisitedChairsSorted(state);
    expect(visited).toHaveLength(2);
    expect(visited[0]).toEqual({ chair: 2, lastAt: new Date(t2), isCurrent: true });
    expect(visited[1]).toEqual({ chair: 1, lastAt: new Date(t1), isCurrent: false });

    // Step 3: Mid-assessment answers saved on Day 15 (incomplete attempt)
    const t3 = "2026-01-15T09:00:00.000Z";
    const inProgressAttempt = makeInProgress({
      currentQuestion: 4,
      answers: { 1: "agree", 2: "agree", 3: "agree" },
      updatedAt: t3,
    });
    row = applyInProgressPayloadToRow(row, inProgressAttempt);

    // Incomplete attempt MUST NOT modify any chair assignments or timestamps
    expect(row.current_chair).toBe(2);
    expect(row.current_chair_updated_at).toBe(t2);
    expect(row.chair_1_last_at).toBe(t1);
    expect(row.chair_2_last_at).toBe(t2);
    expect(row.chair_3_last_at).toBeNull();
    expect(row.chair_4_last_at).toBeNull();
    expect(row.in_progress_state).toEqual(inProgressAttempt);

    // Step 4: User abandons/clears the attempt (startOver) on Day 16
    row = applyInProgressPayloadToRow(row, null);
    expect(row.in_progress_state).toBeNull();
    // Prior completed chair history remains 100% intact
    expect(row.current_chair).toBe(2);
    expect(row.current_chair_updated_at).toBe(t2);
    expect(row.chair_1_last_at).toBe(t1);
    expect(row.chair_2_last_at).toBe(t2);
    expect(row.chair_3_last_at).toBeNull();
    expect(row.chair_4_last_at).toBeNull();

    // Step 5: User takes another assessment and completes in Chair 4 on Day 30
    const t5 = "2026-01-30T16:00:00.000Z";
    const run4 = makeCompleted({ destination: 4, updatedAt: t5 });
    row = applyCompletedAssessmentToRow(row, run4);

    expect(row.current_chair).toBe(4);
    expect(row.current_chair_updated_at).toBe(t5);
    expect(row.chair_4_last_at).toBe(t5);
    // Prior timestamps remain intact
    expect(row.chair_2_last_at).toBe(t2);
    expect(row.chair_1_last_at).toBe(t1);
    // Chair 3 was passed but never landed on as destination, so remains null
    expect(row.chair_3_last_at).toBeNull();
    expect(row.in_progress_state).toBeNull();

    state = mapRowToParticipantChairState(row);
    visited = getVisitedChairsSorted(state);
    expect(visited).toHaveLength(3);
    expect(visited[0]).toEqual({ chair: 4, lastAt: new Date(t5), isCurrent: true });
    expect(visited[1]).toEqual({ chair: 2, lastAt: new Date(t2), isCurrent: false });
    expect(visited[2]).toEqual({ chair: 1, lastAt: new Date(t1), isCurrent: false });

    // Step 6: User retakes and lands in Chair 2 again on Day 60
    const t6 = "2026-03-01T11:00:00.000Z";
    const run2Repeat = makeCompleted({ destination: 2, updatedAt: t6 });
    row = applyCompletedAssessmentToRow(row, run2Repeat);

    expect(row.current_chair).toBe(2);
    expect(row.current_chair_updated_at).toBe(t6);
    expect(row.chair_2_last_at).toBe(t6);
    // Chair 4 timestamp stays at t5
    expect(row.chair_4_last_at).toBe(t5);
    // Chair 1 timestamp stays at t1
    expect(row.chair_1_last_at).toBe(t1);
    // Chair 3 still null
    expect(row.chair_3_last_at).toBeNull();

    state = mapRowToParticipantChairState(row);
    visited = getVisitedChairsSorted(state);
    expect(visited).toHaveLength(3);
    // Chair 2 is now most recent and marked current
    expect(visited[0]).toEqual({ chair: 2, lastAt: new Date(t6), isCurrent: true });
    expect(visited[1]).toEqual({ chair: 4, lastAt: new Date(t5), isCurrent: false });
    expect(visited[2]).toEqual({ chair: 1, lastAt: new Date(t1), isCurrent: false });
  });
});

describe("participantTrackingService: Guest-to-account handoff and reconciliation", () => {
  it("merges guest completed assessment when remote has no previous assessment", () => {
    const guestCompleted = makeCompleted({ destination: 1 });
    const remote = makeRemoteState({ currentChair: null, currentChairUpdatedAt: null });

    const result = reconcileProgressOnAuth(guestCompleted, remote);

    expect(result.effectiveProgress).toEqual(guestCompleted);
    expect(result.remoteAction).toEqual({
      type: "save_completed",
      progress: guestCompleted,
    });
  });

  it("merges guest completed assessment when local is newer than remote completion", () => {
    const guestCompleted = makeCompleted({
      destination: 2,
      updatedAt: "2026-11-23T16:00:00.000Z",
    });
    const remote = makeRemoteState({
      currentChair: 1,
      currentChairUpdatedAt: new Date("2026-11-20T10:00:00.000Z"),
    });

    const result = reconcileProgressOnAuth(guestCompleted, remote);

    expect(result.effectiveProgress).toEqual(guestCompleted);
    expect(result.remoteAction).toEqual({
      type: "save_completed",
      progress: guestCompleted,
    });
  });

  it("preserves remote completion when remote is more recent than local completed progress", () => {
    const guestCompleted = makeCompleted({
      destination: 1,
      updatedAt: "2026-11-20T10:00:00.000Z",
    });
    const remote = makeRemoteState({
      currentChair: 2,
      currentChairUpdatedAt: new Date("2026-11-23T16:00:00.000Z"),
      inProgressState: null,
    });

    const result = reconcileProgressOnAuth(guestCompleted, remote);

    expect(result.effectiveProgress).toBeNull();
    expect(result.remoteAction).toEqual({ type: "none" });
  });

  it("merges guest in-progress answers when remote has no in-progress state", () => {
    const guestInProgress = makeInProgress();
    const remote = makeRemoteState({ inProgressState: null });

    const result = reconcileProgressOnAuth(guestInProgress, remote);

    expect(result.effectiveProgress).toEqual(guestInProgress);
    expect(result.remoteAction).toEqual({
      type: "save_in_progress",
      progress: guestInProgress,
    });
  });

  it("keeps local in-progress answers when local timestamp is newer than remote in-progress", () => {
    const localInProgress = makeInProgress({
      currentQuestion: 5,
      answers: { 1: "agree", 2: "agree", 3: "agree", 4: "agree" },
      updatedAt: "2026-11-23T14:00:00.000Z",
    });
    const remoteInProgress = makeInProgress({
      currentQuestion: 3,
      answers: { 1: "agree", 2: "agree" },
      updatedAt: "2026-11-23T12:00:00.000Z",
    });
    const remote = makeRemoteState({ inProgressState: remoteInProgress });

    const result = reconcileProgressOnAuth(localInProgress, remote);

    expect(result.effectiveProgress).toEqual(localInProgress);
    expect(result.remoteAction).toEqual({
      type: "save_in_progress",
      progress: localInProgress,
    });
  });

  it("hydrates remote in-progress answers when remote timestamp is newer than local in-progress", () => {
    const localInProgress = makeInProgress({
      currentQuestion: 3,
      answers: { 1: "agree", 2: "agree" },
      updatedAt: "2026-11-23T10:00:00.000Z",
    });
    const remoteInProgress = makeInProgress({
      currentQuestion: 4,
      answers: { 1: "agree", 2: "agree", 3: "agree" },
      updatedAt: "2026-11-23T14:00:00.000Z",
    });
    const remote = makeRemoteState({ inProgressState: remoteInProgress });

    const result = reconcileProgressOnAuth(localInProgress, remote);

    expect(result.effectiveProgress).toEqual(remoteInProgress);
    expect(result.remoteAction).toEqual({ type: "none" });
  });

  it("hydrates remote in-progress state when guest has no local progress", () => {
    const remoteInProgress = makeInProgress({
      currentQuestion: 3,
      answers: { 1: "agree", 2: "agree" },
    });
    const remote = makeRemoteState({ inProgressState: remoteInProgress });

    const result = reconcileProgressOnAuth(null, remote);

    expect(result.effectiveProgress).toEqual(remoteInProgress);
    expect(result.remoteAction).toEqual({ type: "none" });
  });

  it("returns null when neither local nor remote has progress", () => {
    const remote = makeRemoteState({ inProgressState: null });

    const result = reconcileProgressOnAuth(null, remote);

    expect(result.effectiveProgress).toBeNull();
    expect(result.remoteAction).toEqual({ type: "none" });
  });
});
