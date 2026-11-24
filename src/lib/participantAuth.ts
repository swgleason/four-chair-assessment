/**
 * participantAuth.ts
 *
 * Thin wrappers around Supabase Auth for participant (non-admin) accounts.
 * Cross-device sync and guest-to-account merging are intentionally stubbed here
 * and will be implemented in the next step.
 */
import { supabase } from "./supabaseClient";
import { saveInProgressState } from "./participantTrackingService";

export interface ParticipantUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface AuthResult {
  user: ParticipantUser | null;
  error: string | null;
}

function extractDisplayName(
  user: { user_metadata?: Record<string, unknown> } | null | undefined,
): string | null {
  if (!user?.user_metadata) return null;
  const name = user.user_metadata["display_name"];
  return typeof name === "string" && name.trim().length > 0 ? name.trim() : null;
}

function mapUser(
  raw: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined,
): ParticipantUser | null {
  if (!raw) return null;
  return {
    id: raw.id,
    email: raw.email ?? "",
    displayName: extractDisplayName(raw),
  };
}

/**
 * Returns the currently signed-in user, or null.
 * Never throws — errors are swallowed and treated as "no session".
 */
export async function getParticipantSession(): Promise<ParticipantUser | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return mapUser(data.session?.user);
  } catch {
    return null;
  }
}

/**
 * Signs up a new participant account.
 * On success also upserts their participant_chair_states row (best-effort).
 */
export async function signUpParticipant(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthResult> {
  if (!supabase) return { user: null, error: "Supabase is not configured." };
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: displayName.trim() },
      },
    });

    if (error) return { user: null, error: error.message };
    const user = mapUser(data.user);

    // Best-effort upsert of the participant_chair_states row.
    // Cross-device sync logic (merging guest progress) is stubbed for the next step.
    if (user && data.user) {
      void upsertParticipantState(user);
    }

    return { user, error: null };
  } catch (err) {
    return {
      user: null,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

/**
 * Signs in an existing participant.
 */
export async function signInParticipant(
  email: string,
  password: string,
): Promise<AuthResult> {
  if (!supabase) return { user: null, error: "Supabase is not configured." };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) return { user: null, error: error.message };
    return { user: mapUser(data.user), error: null };
  } catch (err) {
    return {
      user: null,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

/**
 * Signs out the current participant.
 */
export async function signOutParticipant(): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch {
    // Best-effort
  }
}

/**
 * Ensures a participant_chair_states row exists for the given user.
 * Preserves existing chair states and timestamps.
 */
export async function upsertParticipantState(user: ParticipantUser): Promise<void> {
  await saveInProgressState(user.id, null, user);
}

/**
 * Checks whether the currently signed-in user is an admin via is_admin().
 * Returns false on any error (including no session, Supabase not configured).
 */
export async function checkIsAdmin(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.rpc("is_admin");
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}
