import { useEffect, useRef, useState } from "react";
import {
  signInParticipant,
  signUpParticipant,
} from "../lib/participantAuth";
import type { ParticipantUser } from "../lib/participantAuth";
import { isSupabaseConfigured } from "../lib/supabaseClient";

export interface ParticipantAuthModalProps {
  onClose: () => void;
  onAuthenticated: (user: ParticipantUser) => void;
}

type Mode = "signin" | "signup";

const PRIVACY_NOTICE =
  "By creating an account your display name, email address, and chair assessment results and history will be visible to church leadership. This allows leaders to support your spiritual growth journey.";

interface AuthModeToggleProps {
  mode: Mode;
  onSwitch: (mode: Mode) => void;
}

export function AuthModeToggle({ mode, onSwitch }: AuthModeToggleProps) {
  const nextMode = mode === "signin" ? "signup" : "signin";

  return (
    <div className="auth-modal-toggle">
      <span>
        {mode === "signin"
          ? "Don't have an account?"
          : "Already have an account?"}
      </span>
      <button
        type="button"
        className="auth-toggle-link"
        onClick={() => onSwitch(nextMode)}
      >
        {mode === "signin" ? "Create one" : "Sign in"}
      </button>
    </div>
  );
}

export function ParticipantAuthModal({
  onClose,
  onAuthenticated,
}: ParticipantAuthModalProps) {
  const [mode, setMode] = useState<Mode>("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signupConfirmed, setSignupConfirmed] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    (emailInputRef.current ?? closeButtonRef.current)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, []);

  function switchMode(next: Mode) {
    setMode(next);
    setErrorMessage(null);
    setSignupConfirmed(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      if (mode === "signup") {
        if (!displayName.trim()) {
          setErrorMessage("Please enter your display name.");
          return;
        }
        const result = await signUpParticipant(
          email,
          password,
          displayName.trim(),
        );
        if (result.error) {
          setErrorMessage(result.error);
        } else if (result.user) {
          onAuthenticated(result.user);
        } else {
          // Email confirmation required
          setSignupConfirmed(true);
        }
      } else {
        const result = await signInParticipant(email, password);
        if (result.error) {
          setErrorMessage(result.error);
        } else if (result.user) {
          onAuthenticated(result.user);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  // Overlay backdrop — click outside to close
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="auth-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={handleBackdropClick}
    >
      <div className="auth-modal" role="document">
        <button
          type="button"
          className="auth-modal-close"
          aria-label="Close sign-in panel"
          ref={closeButtonRef}
          onClick={onClose}
        >
          ✕
        </button>

        {!isSupabaseConfigured ? (
          <div>
            <h2 id="auth-modal-title" className="auth-modal-title">
              Account Sign-In
            </h2>
            <p className="status-message" role="status" aria-live="polite">
              Cross-device tracking is not available in this environment.
            </p>
            <button
              type="button"
              className="button button-secondary auth-modal-action"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        ) : signupConfirmed ? (
          <div>
            <h2 id="auth-modal-title" className="auth-modal-title">
              Check Your Email
            </h2>
            <p
              className="intro-copy auth-signup-confirmation"
              role="status"
              aria-live="polite"
            >
              We've sent a confirmation link to <strong>{email}</strong>. Click
              the link in that email to activate your account, then come back
              here to sign in.
            </p>
            <button
              type="button"
              className="button button-secondary auth-modal-action"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h2 id="auth-modal-title" className="auth-modal-title">
              {mode === "signin"
                ? "Sign In to Your Account"
                : "Create an Account"}
            </h2>

            <p className="intro-copy">
              {mode === "signin"
                ? "Sign in to track your chair assessment results across devices."
                : "Create a free account to save and sync your assessment results."}
            </p>

            {/* Privacy notice — always shown */}
            <div className="auth-privacy-notice" role="note">
              <strong>Privacy:</strong> {PRIVACY_NOTICE}
            </div>

            {errorMessage && (
              <p
                className="status-message admin-error-message"
                role="status"
                aria-live="polite"
              >
                {errorMessage}
              </p>
            )}

            <form
              className="auth-modal-form"
              onSubmit={handleSubmit}
              noValidate
            >
              {mode === "signup" && (
                <div className="admin-form-group">
                  <label htmlFor="auth-display-name">Display Name</label>
                  <input
                    id="auth-display-name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Your Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              )}

              <div className="admin-form-group">
                <label htmlFor="auth-email">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  ref={emailInputRef}
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="auth-modal-actions">
                <button
                  type="submit"
                  className="button button-primary auth-modal-submit"
                  disabled={loading}
                >
                  {loading
                    ? mode === "signin"
                      ? "Signing In…"
                      : "Creating Account…"
                    : mode === "signin"
                      ? "Sign In"
                      : "Create Account"}
                </button>
              </div>
            </form>

            <AuthModeToggle mode={mode} onSwitch={switchMode} />

            <div className="auth-modal-guest-note">
              <strong>Signing in is optional.</strong> You can take the
              assessment as a guest at any time — your progress is saved in
              this browser without creating an account.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
