import type { ChairNumber } from "../lib/scoring";

// ============================================================
// Database row type (snake_case mirrors Supabase columns)
// ============================================================

export interface ParticipantChairStateRow {
  user_id: string;
  email: string;
  display_name: string | null;
  current_chair: number | null;
  current_chair_updated_at: string | null;
  chair_1_last_at: string | null;
  chair_2_last_at: string | null;
  chair_3_last_at: string | null;
  chair_4_last_at: string | null;
  chair_score?: number | string | null;
  focus_responses?: unknown | null;
  in_progress_state: unknown | null;
  updated_at: string;
}

// ============================================================
// Application model type (camelCase, narrowed types)
// ============================================================

export interface ParticipantChairState {
  userId: string;
  email: string;
  displayName: string | null;
  /** Null until the participant has completed at least one assessment. */
  currentChair: ChairNumber | null;
  currentChairUpdatedAt: Date | null;
  /** Per-chair timestamps, null until the participant has visited that chair. */
  chair1LastAt: Date | null;
  chair2LastAt: Date | null;
  chair3LastAt: Date | null;
  chair4LastAt: Date | null;
  chairScore: number | null;
  focusResponses: string[];
  /** Serialised in-progress assessment for cross-device sync. */
  inProgressState: unknown | null;
  updatedAt: Date;
}

// ============================================================
// Visited-chair entry returned by getVisitedChairsSorted
// ============================================================

export interface VisitedChairEntry {
  chair: ChairNumber;
  lastAt: Date;
  /** True when this chair is the participant's current_chair. */
  isCurrent: boolean;
}

// ============================================================
// Validation
// ============================================================

/** Validates that a raw DB row has the expected shape. */
export function validateParticipantChairStateRow(
  value: unknown,
): value is ParticipantChairStateRow {
  if (typeof value !== "object" || value === null) return false;

  const row = value as Record<string, unknown>;

  if (typeof row.user_id !== "string" || row.user_id.trim().length === 0) {
    return false;
  }

  if (typeof row.email !== "string" || row.email.trim().length === 0) {
    return false;
  }

  if (row.display_name !== null && typeof row.display_name !== "string") {
    return false;
  }

  if (row.current_chair !== null) {
    if (
      typeof row.current_chair !== "number" ||
      !Number.isInteger(row.current_chair) ||
      row.current_chair < 1 ||
      row.current_chair > 4
    ) {
      return false;
    }
  }

  for (const field of [
    "current_chair_updated_at",
    "chair_1_last_at",
    "chair_2_last_at",
    "chair_3_last_at",
    "chair_4_last_at",
  ] as const) {
    if (row[field] !== null && typeof row[field] !== "string") return false;
    if (
      typeof row[field] === "string" &&
      !Number.isFinite(Date.parse(row[field] as string))
    ) {
      return false;
    }
  }

  if (
    row.chair_score !== undefined &&
    row.chair_score !== null &&
    (() => {
      const numericScore =
        typeof row.chair_score === "number"
          ? row.chair_score
          : typeof row.chair_score === "string"
            ? Number(row.chair_score)
            : NaN;
      return (
        !Number.isFinite(numericScore) ||
        numericScore < 1 ||
        numericScore > 4.9
      );
    })()
  ) {
    return false;
  }

  if (
    row.focus_responses !== undefined &&
    row.focus_responses !== null &&
    (!Array.isArray(row.focus_responses) ||
      row.focus_responses.length > 4 ||
      row.focus_responses.some((item) => typeof item !== "string"))
  ) {
    return false;
  }

  if (typeof row.updated_at !== "string") return false;
  if (!Number.isFinite(Date.parse(row.updated_at as string))) return false;

  return true;
}

// ============================================================
// Row → model mapper
// ============================================================

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

function parseFocusResponses(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .slice(0, 4);
}

export function mapRowToParticipantChairState(
  row: ParticipantChairStateRow,
): ParticipantChairState {
  return {
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    currentChair:
      row.current_chair !== null
        ? (row.current_chair as ChairNumber)
        : null,
    currentChairUpdatedAt: parseDate(row.current_chair_updated_at),
    chair1LastAt: parseDate(row.chair_1_last_at),
    chair2LastAt: parseDate(row.chair_2_last_at),
    chair3LastAt: parseDate(row.chair_3_last_at),
    chair4LastAt: parseDate(row.chair_4_last_at),
    chairScore: (() => {
      const numericScore =
        typeof row.chair_score === "number"
          ? row.chair_score
          : typeof row.chair_score === "string"
            ? Number(row.chair_score)
            : NaN;
      return Number.isFinite(numericScore) ? numericScore : null;
    })(),
    focusResponses: parseFocusResponses(row.focus_responses),
    inProgressState: row.in_progress_state ?? null,
    updatedAt: new Date(row.updated_at),
  };
}

// ============================================================
// getVisitedChairsSorted
// ============================================================

/**
 * Returns all chairs the participant has visited — defined as:
 *   • Any chair 1–4 that has a non-null `chairN_last_at` timestamp, OR
 *   • The `current_chair` (even if its `last_at` is somehow null, it is
 *     included with `lastAt` falling back to `currentChairUpdatedAt ?? updatedAt`).
 *
 * The list is sorted descending by `lastAt` (most recent first).
 * Each entry is tagged with `isCurrent: true` when it matches `currentChair`.
 *
 * If a chair appears in both the per-chair timestamps AND is the current
 * chair, it appears only once (merged entry, `isCurrent: true`).
 */
export function getVisitedChairsSorted(
  state: ParticipantChairState,
): VisitedChairEntry[] {
  const perChairLastAt: Record<ChairNumber, Date | null> = {
    1: state.chair1LastAt,
    2: state.chair2LastAt,
    3: state.chair3LastAt,
    4: state.chair4LastAt,
  };

  const entries = new Map<ChairNumber, VisitedChairEntry>();

  // Collect all chairs with a known lastAt timestamp.
  for (const chairKey of [1, 2, 3, 4] as ChairNumber[]) {
    const lastAt = perChairLastAt[chairKey];
    if (lastAt !== null) {
      entries.set(chairKey, {
        chair: chairKey,
        lastAt,
        isCurrent: chairKey === state.currentChair,
      });
    }
  }

  // Ensure currentChair is always included, even if its per-chair timestamp
  // is null (edge case: DB updated current_chair but not the per-chair field).
  if (state.currentChair !== null && !entries.has(state.currentChair)) {
    const fallbackLastAt =
      state.currentChairUpdatedAt ?? state.updatedAt;
    entries.set(state.currentChair, {
      chair: state.currentChair,
      lastAt: fallbackLastAt,
      isCurrent: true,
    });
  }

  return Array.from(entries.values()).sort(
    (a, b) => b.lastAt.getTime() - a.lastAt.getTime(),
  );
}
