import { useState } from "react";
import type { ParticipantUser } from "../lib/participantAuth";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { ParticipantAuthModal } from "./ParticipantAuthModal";
import { HomeLogo } from "./HomeLogo";

export interface WelcomeScreenProps {
  hasSavedProgress: boolean;
  notice: string;
  onBegin: () => void;
  onContinue: () => void;
  onStartOver: () => void;
  onOpenAdmin?: () => void;
  onNavigateHome?: () => void;
  /** Currently signed-in participant, or null/undefined (undefined = still loading) */
  participant?: ParticipantUser | null | undefined;
  onSignOut?: () => Promise<void>;
  onAuthenticated?: (user: ParticipantUser) => void;
}

export function WelcomeScreen({
  hasSavedProgress,
  notice,
  onBegin,
  onContinue,
  onStartOver,
  onOpenAdmin,
  onNavigateHome,
  participant,
  onSignOut,
  onAuthenticated,
}: WelcomeScreenProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);

  const supportsAuth = isSupabaseConfigured;

  function handleAuthenticated(user: ParticipantUser) {
    setShowAuthModal(false);
    onAuthenticated?.(user);
  }

  return (
    <>
      <main className="page-shell">
        <header className="brand-header">
          <HomeLogo onNavigateHome={onNavigateHome} />
        </header>
        <section className="welcome-card" aria-labelledby="welcome-title">
          <p className="eyebrow">A tool for reflection</p>
          <h1 id="welcome-title">Four Chair Assessment</h1>
          <p className="intro-copy">
            Jesus invited people to follow Him in stages: Come and see, Follow
            me, Fish for people, Go and bear fruit. Answer a few questions to
            find which chair you're in today and what comes next.
          </p>

          {/* Participant account status bar */}
          {supportsAuth && (
            <div className="participant-auth-bar">
              {participant === undefined ? null /* still loading */ : participant ? (
                <div className="participant-signed-in">
                  <span className="participant-signed-in-name">
                    Signed in as{" "}
                    <strong>{participant.displayName ?? participant.email}</strong>
                  </span>
                  <button
                    type="button"
                    className="auth-toggle-link"
                    onClick={onSignOut}
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="auth-signin-prompt"
                  onClick={() => setShowAuthModal(true)}
                >
                  Sign in or create account to sync across devices →
                </button>
              )}
            </div>
          )}

          {/* Storage / privacy note — accurate for both guests and signed-in participants */}
          <p className="privacy-copy">
            {participant
              ? "Your progress syncs across devices through your account. Your name, email, and results are visible to church leadership."
              : "Your progress is stored in this browser on this device and does not sync to other devices. Signing in (optional) enables cross-device sync."}
          </p>

          {notice && (
            <p className="status-message" role="status">
              {notice}
            </p>
          )}

          {hasSavedProgress ? (
            <div className="action-stack">
              <button className="button button-primary" onClick={onContinue}>
                Continue Assessment
              </button>
              <button className="button button-secondary" onClick={onStartOver}>
                Start Over
              </button>
            </div>
          ) : (
            <button className="button button-primary" onClick={onBegin}>
              Begin Assessment
            </button>
          )}

          {onOpenAdmin && (
            <div className="admin-entry-footer">
              <button
                type="button"
                className="admin-entry-button"
                onClick={onOpenAdmin}
              >
                Admin Login
              </button>
            </div>
          )}
        </section>
      </main>

      {showAuthModal && (
        <ParticipantAuthModal
          onClose={() => setShowAuthModal(false)}
          onAuthenticated={handleAuthenticated}
        />
      )}
    </>
  );
}
