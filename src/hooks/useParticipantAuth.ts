/**
 * useParticipantAuth
 *
 * Subscribes to Supabase auth state changes and exposes a stable
 * ParticipantUser object (or null) for the whole app to consume.
 * Also provides signOut.
 */
import { useEffect, useState } from "react";
import {
  signOutParticipant,
  type ParticipantUser,
} from "../lib/participantAuth";
import { supabase } from "../lib/supabaseClient";

export interface UseParticipantAuthReturn {
  /** null = no session; undefined = still loading */
  participant: ParticipantUser | null | undefined;
  signOut: () => Promise<void>;
}

function extractDisplayName(
  meta?: Record<string, unknown> | null,
): string | null {
  if (!meta) return null;
  const name = meta["display_name"];
  return typeof name === "string" && name.trim().length > 0 ? name.trim() : null;
}

export function useParticipantAuth(): UseParticipantAuthReturn {
  // undefined = not yet determined, null = no session
  const [participant, setParticipant] = useState<
    ParticipantUser | null | undefined
  >(undefined);

  useEffect(() => {
    if (!supabase) {
      setParticipant(null);
      return;
    }

    let isMounted = true;

    // Seed from current session on mount
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      const u = data.session?.user;
      setParticipant(
        u
          ? {
              id: u.id,
              email: u.email ?? "",
              displayName: extractDisplayName(
                u.user_metadata as Record<string, unknown> | null,
              ),
            }
          : null,
      );
    });

    // Keep in sync with auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      const u = session?.user;
      setParticipant(
        u
          ? {
              id: u.id,
              email: u.email ?? "",
              displayName: extractDisplayName(
                u.user_metadata as Record<string, unknown> | null,
              ),
            }
          : null,
      );
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    participant,
    signOut: signOutParticipant,
  };
}
