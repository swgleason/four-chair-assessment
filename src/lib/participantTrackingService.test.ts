import { describe, expect, it } from "vitest";
import {
  buildCompletedAssessmentPayload,
  buildInitialParticipantRow,
  buildInProgressPayload,
  reconcileProgressOnAuth,
} from "./participantTrackingService";
import type { AssessmentProgress } from "./progressStorage";
import type { ParticipantChairState } from "../types/participantTracking";

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
    answers: { 1: "agree", 2: "agree", 3: "agree", 4: "agree", 5: "agree", 6: "agree", 7: "agree" },
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
    expect(row["in_progress_state"]).toEqual(progress);
  });

  it("buildCompletedAssessmentPayload throws if passed incomplete progress", () => {
    const incomplete = makeInProgress({ completed: false });
    expect(() => buildCompletedAssessmentPayload(incomplete)).toThrow(
      "Cannot record an incomplete assessment as completed.",
    );

    const missingDestination = makeCompleted({ destination: null });
    expect(() => buildCompletedAssessmentPayload(missingDestination)).toThrow(
      "Cannot record an incomplete assessment as completed.",
    );
  });
});

describe("participantTrackingService: Completed assessment payload", () => {
  it("buildCompletedAssessmentPayload correctly sets chair assignment and clears in_progress_state", () => {
    const completed = makeCompleted({ destination: 3, updatedAt: "2026-11-23T15:00:00.000Z" });
    const payload = buildCompletedAssessmentPayload(completed);

    expect(payload["current_chair"]).toBe(3);
    expect(payload["current_chair_updated_at"]).toBe("2026-11-23T15:00:00.000Z");
    expect(payload["chair_3_last_at"]).toBe("2026-11-23T15:00:00.000Z");
    expect(payload["in_progress_state"]).toBeNull();
    expect(typeof payload["updated_at"]).toBe("string");
  });

  it("buildInitialParticipantRow with completed progress assigns chair fields", () => {
    const completed = makeCompleted({ destination: 2, updatedAt: "2026-11-23T14:00:00.000Z" });
    const user = { id: "user-2", email: "u2@example.com", displayName: "User 2" };
    const row = buildInitialParticipantRow(user, completed);

    expect(row["current_chair"]).toBe(2);
    expect(row["current_chair_updated_at"]).toBe("2026-11-23T14:00:00.000Z");
    expect(row["chair_2_last_at"]).toBe("2026-11-23T14:00:00.000Z");
    expect(row["chair_1_last_at"]).toBeNull();
    expect(row["in_progress_state"]).toBeNull();
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
      updatedAt: "2026-11-23T14:00:00.000Z",
    });
    const remoteInProgress = makeInProgress({
      currentQuestion: 3,
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
