import { useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { HomeLogo } from "./HomeLogo";

export interface AdminLoginProps {
  onBackToAssessment: () => void;
  onNavigateHome?: () => void;
  onSuccess?: () => void;
}

export function AdminLogin({
  onBackToAssessment,
  onNavigateHome,
  onSuccess,
}: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        onSuccess?.();
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during sign in.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <header className="brand-header">
        <HomeLogo onNavigateHome={onNavigateHome} />
      </header>
      <section className="welcome-card" aria-labelledby="admin-login-title">
        <p className="eyebrow">Leader Access</p>
        <h1 id="admin-login-title">Admin Dashboard</h1>

        {!isSupabaseConfigured || !supabase ? (
          <div>
            <p className="status-message" role="status">
              Supabase environment variables (<code>VITE_SUPABASE_URL</code> and{" "}
              <code>VITE_SUPABASE_ANON_KEY</code>) must be configured in your{" "}
              <code>.env</code> file before you can sign in to manage chair
              links.
            </p>
            <div className="action-stack">
              <button
                type="button"
                className="button button-secondary"
                onClick={onBackToAssessment}
              >
                Back to Assessment
              </button>
            </div>
          </div>
        ) : (
          <form className="admin-form" onSubmit={handleSubmit} noValidate>
            <p className="intro-copy">
              Sign in with your leadership credentials.
            </p>

            {errorMessage && (
              <p
                className="status-message admin-error-message"
                role="status"
                aria-live="polite"
              >
                {errorMessage}
              </p>
            )}

            <div className="admin-form-group">
              <label htmlFor="admin-email">Email</label>
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="leader@ocupc.com"
                disabled={loading}
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <div className="action-stack">
              <button
                type="submit"
                className="button button-primary"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={onBackToAssessment}
                disabled={loading}
              >
                Back to Assessment
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
