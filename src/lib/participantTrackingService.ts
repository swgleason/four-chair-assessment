import { isAssessmentProgress, type AssessmentProgress } from "./progressStorage";
import { supabase } from "./supabaseClient";
import {
  mapRowToParticipantChairState,
  validateParticipantChairStateRow,
  type ParticipantChairState,
  type ParticipantChairStateRow,
} from "../types/participantTracking";
import {
  calculateChairScore,
  resultProgressPercent,
  type ChairNumber,
} from "./scoring";

function normalizeFocusResponses(
  focusResponses: readonly string[] | undefined,
): string[] {
  return (focusResponses ?? []).filter(
    (item): item is string => typeof item === "string",
  ).slice(0, 4);
}

function getPersistedChairScore(progress: AssessmentProgress): number {
  if (
    typeof progress.chairScore === "number" &&
    Number.isFinite(progress.chairScore) &&
    progress.chairScore >= 1 &&
    progress.chairScore <= 4.9
  ) {
    return progress.chairScore;
  }

  if (
    progress.destination !== null &&
    Number.isInteger(progress.destination)
  ) {
    const chair = progress.destination as ChairNumber;
    try {
      const segmentPercent = resultProgressPercent(chair, progress.answers);
      const derivedSectionScore = Math.round((segmentPercent / 100) * 21);
      return calculateChairScore(chair, derivedSectionScore);
    } catch {
      return chair;
    }
  }

  throw new Error("Cannot derive a chair score without a completed destination.");
}

export interface ReconciliationResult {
  /** The effective progress to save and render locally */
  effectiveProgress: AssessmentProgress | null;
  /** Action needed to persist to Supabase, if any */
  remoteAction:
    | { type: "save_completed"; progress: AssessmentProgress }
    | { type: "save_in_progress"; progress: AssessmentProgress }
    | { type: "none" };
}

/**
 * Pure helper: builds the payload for in-progress answers or section state.
 *
 * STRICT RULE:
 * This payload explicitly touches ONLY `in_progress_state` and `updated_at`.
 * It must NEVER include `current_chair`, `current_chair_updated_at`, or any
 * `chair_1_last_at`..`chair_4_last_at` timestamp.
 */
export function buildInProgressPayload(
  progress: AssessmentProgress | null,
): {
  in_progress_state: AssessmentProgress | null;
  updated_at: string;
} {
  return {
    in_progress_state: progress && !progress.completed ? progress : null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Pure helper: builds the payload when an assessment is completed.
 * Sets `current_chair`, `current_chair_updated_at`, and the chair's `last_at`.
 * Clears `in_progress_state` to null.
 *
 * STRICT RULE:
 * Only the destination chair's `chair_${N}_last_at` is included in the payload.
 * Other chairs (whether lower or previously visited) are NEVER in the payload,
 * ensuring database updates leave them untouched.
 */
export function buildCompletedAssessmentPayload(
  progress: AssessmentProgress,
): Record<string, unknown> {
  if (
    !progress.completed ||
    progress.destination === null ||
    !Number.isInteger(progress.destination) ||
    progress.destination < 1 ||
    progress.destination > 4
  ) {
    throw new Error("Cannot record an incomplete or invalid assessment as completed.");
  }
  const chair = progress.destination as ChairNumber;
  const timestamp = progress.updatedAt || new Date().toISOString();
  const chairScore = getPersistedChairScore(progress);
  const focusResponses = normalizeFocusResponses(progress.focusResponses);

  return {
    current_chair: chair,
    current_chair_updated_at: timestamp,
    [`chair_${chair}_last_at`]: timestamp,
    chair_score: chairScore,
    focus_responses: focusResponses,
    in_progress_state: null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Pure helper: applies a completed assessment payload onto an existing row,
 * simulating an in-place database UPDATE.
 */
export function applyCompletedAssessmentToRow(
  currentRow: ParticipantChairStateRow,
  progress: AssessmentProgress,
): ParticipantChairStateRow {
  const payload = buildCompletedAssessmentPayload(progress);
  return {
    ...currentRow,
    ...payload,
  } as ParticipantChairStateRow;
}

/**
 * Pure helper: applies an in-progress payload onto an existing row,
 * simulating an in-place database UPDATE for mid-assessment sync or restart.
 */
export function applyInProgressPayloadToRow(
  currentRow: ParticipantChairStateRow,
  progress: AssessmentProgress | null,
): ParticipantChairStateRow {
  const payload = buildInProgressPayload(progress);
  return {
    ...currentRow,
    ...payload,
  } as ParticipantChairStateRow;
}

/**
 * Pure helper: constructs a new row for `participant_chair_states` on first insertion.
 *
 * STRICT RULE:
 * If `progress` is incomplete or null, chair assignments remain strictly `null`.
 */
export function buildInitialParticipantRow(
  user: { id: string; email: string; displayName?: string | null },
  progress: AssessmentProgress | null,
): ParticipantChairStateRow {
  const isCompleted = Boolean(
    progress?.completed &&
      progress?.destination !== null &&
      Number.isInteger(progress?.destination) &&
      progress.destination >= 1 &&
      progress.destination <= 4,
  );

  if (isCompleted && progress && progress.destination !== null) {
    const chair = progress.destination;
    const timestamp = progress.updatedAt || new Date().toISOString();
    return {
      user_id: user.id,
      email: user.email,
      display_name: user.displayName ?? null,
      current_chair: chair,
      current_chair_updated_at: timestamp,
      chair_1_last_at: chair === 1 ? timestamp : null,
      chair_2_last_at: chair === 2 ? timestamp : null,
      chair_3_last_at: chair === 3 ? timestamp : null,
      chair_4_last_at: chair === 4 ? timestamp : null,
      chair_score: getPersistedChairScore(progress),
      focus_responses: normalizeFocusResponses(progress.focusResponses),
      in_progress_state: null,
      updated_at: new Date().toISOString(),
    };
  }

  return {
    user_id: user.id,
    email: user.email,
    display_name: user.displayName ?? null,
    current_chair: null,
    current_chair_updated_at: null,
    chair_1_last_at: null,
    chair_2_last_at: null,
    chair_3_last_at: null,
    chair_4_last_at: null,
    chair_score: null,
    focus_responses: [],
    in_progress_state: progress && !progress.completed ? progress : null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Pure reconciliation logic for guest-to-account handoff and cross-device sync.
 *
 * Reconciles the client's local progress with the remote participant chair state.
 */
export function reconcileProgressOnAuth(
  localProgress: AssessmentProgress | null,
  remoteState: ParticipantChairState | null,
): ReconciliationResult {
  // 1. Guest completed locally
  if (localProgress && localProgress.completed && localProgress.destination !== null) {
    if (!remoteState || !remoteState.currentChairUpdatedAt) {
      return {
        effectiveProgress: localProgress,
        remoteAction: { type: "save_completed", progress: localProgress },
      };
    }

    const localTime = Date.parse(localProgress.updatedAt);
    const remoteTime = remoteState.currentChairUpdatedAt.getTime();

    if (localTime >= remoteTime) {
      return {
        effectiveProgress: localProgress,
        remoteAction: { type: "save_completed", progress: localProgress },
      };
    }

    // Remote has a more recent completed chair. Check if remote has an in-progress state.
    if (isAssessmentProgress(remoteState.inProgressState)) {
      return {
        effectiveProgress: remoteState.inProgressState,
        remoteAction: { type: "none" },
      };
    }

    return {
      effectiveProgress: null,
      remoteAction: { type: "none" },
    };
  }

  // 2. Guest has in-progress answers locally
  if (localProgress && !localProgress.completed) {
    const remoteProgress = isAssessmentProgress(remoteState?.inProgressState)
      ? (remoteState!.inProgressState as AssessmentProgress)
      : null;

    if (!remoteProgress) {
      return {
        effectiveProgress: localProgress,
        remoteAction: { type: "save_in_progress", progress: localProgress },
      };
    }

    // Both local and remote have in-progress answers. Compare timestamps.
    const localTime = Date.parse(localProgress.updatedAt);
    const remoteTime = Date.parse(remoteProgress.updatedAt);

    if (localTime >= remoteTime) {
      return {
        effectiveProgress: localProgress,
        remoteAction: { type: "save_in_progress", progress: localProgress },
      };
    }

    return {
      effectiveProgress: remoteProgress,
      remoteAction: { type: "none" },
    };
  }

  // 3. No local progress (guest had not started or cleared progress)
  if (isAssessmentProgress(remoteState?.inProgressState)) {
    return {
      effectiveProgress: remoteState!.inProgressState as AssessmentProgress,
      remoteAction: { type: "none" },
    };
  }

  return {
    effectiveProgress: null,
    remoteAction: { type: "none" },
  };
}

/**
 * Fetches the participant's state from `public.participant_chair_states`.
 */
export async function fetchParticipantChairState(
  userId: string,
): Promise<ParticipantChairState | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("participant_chair_states")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return mapRowToParticipantChairState(data as ParticipantChairStateRow);
  } catch {
    return null;
  }
}

/**
 * Persists mid-assessment answers/progress for a signed-in participant.
 *
 * STRICT RULE:
 * This function NEVER modifies `current_chair`, `current_chair_updated_at`,
 * or any `chair_X_last_at` timestamps.
 */
export async function saveInProgressState(
  userId: string,
  progress: AssessmentProgress | null,
  userDetails?: { email?: string; displayName?: string | null },
): Promise<void> {
  if (!supabase) return;
  try {
    const payload = buildInProgressPayload(progress);

    // Update existing row
    const { data, error } = await supabase
      .from("participant_chair_states")
      .update(payload)
      .eq("user_id", userId)
      .select("user_id");

    if (!error && data && data.length > 0) {
      return;
    }

    // If row doesn't exist yet, insert new row with null chair assignments
    const row = buildInitialParticipantRow(
      {
        id: userId,
        email: userDetails?.email ?? "",
        displayName: userDetails?.displayName ?? null,
      },
      progress,
    );

    await supabase.from("participant_chair_states").insert(row);
  } catch {
    // Best-effort non-blocking
  }
}

/**
 * Persists a completed assessment result for a signed-in participant.
 */
export async function saveCompletedAssessment(
  userId: string,
  progress: AssessmentProgress,
  userDetails?: { email?: string; displayName?: string | null },
): Promise<void> {
  if (!supabase) return;
  try {
    const payload = buildCompletedAssessmentPayload(progress);

    // Update existing row
    const { data, error } = await supabase
      .from("participant_chair_states")
      .update(payload)
      .eq("user_id", userId)
      .select("user_id");

    if (!error && data && data.length > 0) {
      return;
    }

    // Insert new row if not present
    const row = buildInitialParticipantRow(
      {
        id: userId,
        email: userDetails?.email ?? "",
        displayName: userDetails?.displayName ?? null,
      },
      progress,
    );

    await supabase.from("participant_chair_states").insert(row);
  } catch {
    // Best-effort non-blocking
  }
}

/**
 * Reconciles local progress with remote state upon user authentication.
 * Merges any guest progress or in-progress answers into their account.
 */
export async function syncGuestProgressToAccount(
  user: { id: string; email: string; displayName?: string | null },
  localProgress: AssessmentProgress | null,
): Promise<AssessmentProgress | null> {
  if (!supabase) return localProgress;
  try {
    const remoteState = await fetchParticipantChairState(user.id);
    const { effectiveProgress, remoteAction } = reconcileProgressOnAuth(
      localProgress,
      remoteState,
    );

    if (remoteAction.type === "save_completed") {
      await saveCompletedAssessment(user.id, remoteAction.progress, user);
    } else if (remoteAction.type === "save_in_progress") {
      await saveInProgressState(user.id, remoteAction.progress, user);
    } else if (!remoteState) {
      // Ensure row exists even if no progress exists yet
      await saveInProgressState(user.id, null, user);
    }

    return effectiveProgress;
  } catch {
    return localProgress;
  }
}

/**
 * Fetches all participant chair states from `public.participant_chair_states`.
 * Accessible only to leaders with `is_admin()` authorization via Supabase RLS.
 */
export async function fetchAllParticipantChairStates(): Promise<ParticipantChairState[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("participant_chair_states")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error || !data) return [];
    return (data as unknown[])
      .filter(validateParticipantChairStateRow)
      .map(mapRowToParticipantChairState);
  } catch {
    return [];
  }
}
