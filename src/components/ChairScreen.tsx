import { useEffect, useState } from "react";
import { chairs } from "../content/chairs";
import { getDefaultLinksForChair } from "../content/defaultChairLinks";
import { fetchLinksForChair } from "../lib/chairLinksService";
import type { ParticipantUser } from "../lib/participantAuth";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import type { ChairNumber } from "../lib/scoring";
import type { ChairLinkItem } from "../types/chairLinks";
import { ParticipantAuthModal } from "./ParticipantAuthModal";
import { HomeLogo } from "./HomeLogo";

const chairNumbers: readonly ChairNumber[] = [1, 2, 3, 4];

export interface ChairScreenProps {
  chair: ChairNumber;
  segmentProgressPercent: number;
  chairScore?: number;
  focusResponses?: readonly string[];
  notice: string;
  onStartOver: () => void;
  onNavigateHome?: () => void;
  initialLinks?: readonly ChairLinkItem[];
  disableNextStepsForm?: boolean;
  /** Currently signed-in participant (optional, for pre-fill + auth prompt) */
  participant?: ParticipantUser | null | undefined;
  onSignOut?: () => Promise<void>;
  onAuthenticated?: (user: ParticipantUser) => void;
}

export function ChairScreen({
  chair,
  segmentProgressPercent,
  chairScore,
  focusResponses = [],
  notice,
  onStartOver,
  onNavigateHome,
  initialLinks,
  disableNextStepsForm = false,
  participant,
  onSignOut,
  onAuthenticated,
}: ChairScreenProps) {
  const [links, setLinks] = useState<readonly ChairLinkItem[]>(() =>
    initialLinks !== undefined ? initialLinks : getDefaultLinksForChair(chair),
  );
  const [showAuthModal, setShowAuthModal] = useState(false);

  const supportsAuth = isSupabaseConfigured;

  // Next Steps form states
  const [senderName, setSenderName] = useState(
    () => participant?.displayName ?? "",
  );
  const [senderEmail, setSenderEmail] = useState(
    () => participant?.email ?? "",
  );
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (initialLinks !== undefined) {
      setLinks(initialLinks);
      return;
    }

    let isMounted = true;
    setLinks(getDefaultLinksForChair(chair));
    fetchLinksForChair(chair).then((result) => {
      if (isMounted) {
        setLinks(result.items);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [chair, initialLinks]);

  // Pre-fill Next Steps form fields when participant signs in mid-session
  useEffect(() => {
    if (participant) {
      setSenderName((prev) =>
        prev.trim() === "" ? (participant.displayName ?? "") : prev,
      );
      setSenderEmail((prev) =>
        prev.trim() === "" ? participant.email : prev,
      );
    }
  }, [participant]);

  function handleAuthenticated(user: ParticipantUser) {
    setShowAuthModal(false);
    onAuthenticated?.(user);
  }

  async function handleSendNextSteps(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setSubmissionResult(null);

    try {
      const res = await fetch("/api/send-next-steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chair,
          senderName: senderName.trim(),
          senderEmail: senderEmail.trim(),
          message: message.trim(),
          website: honeypot,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setSubmissionResult({
          ok: true,
          message:
            "Thank you! Your message has been sent to our leadership team. We look forward to connecting with you soon.",
        });
        setMessage("");
      } else {
        setSubmissionResult({
          ok: false,
          message:
            data.error ||
            "Unable to send your request at this time. Please try again later.",
        });
      }
    } catch {
      setSubmissionResult({
        ok: false,
        message:
          "Unable to connect to the email service. Please try again later.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const activeLinks = links.filter((item) => item.isActive !== false);
  const groups = activeLinks.filter((item) => item.category === "group");
  const resources = activeLinks.filter((item) => item.category === "resource");

  const content = chairs[chair];
  const effectiveSegmentProgressPercent =
    chairScore !== undefined && Number.isFinite(chairScore)
      ? Math.round(
          Math.max(
            0,
            Math.min(100, (chairScore - Math.floor(chairScore)) * 100),
          ) * 10,
        ) / 10
      : segmentProgressPercent;
  const overallProgress =
    Math.round(
      ((chair - 1 + effectiveSegmentProgressPercent / 100) / 4) * 1000,
    ) / 10;
  const progressLabel =
    chair === 4
      ? "Progress toward ongoing growth beyond Chair 4"
      : `Progress through the four chairs`;

  return (
    <>
      <main className="page-shell">
        <header className="brand-header">
          <HomeLogo onNavigateHome={onNavigateHome} />
        </header>
        <article className="result-card" aria-labelledby="completion-title">
          <header className="result-header">
            <h1 id="completion-title" className="completion-heading">
              <span className="completion-badge" aria-hidden="true">
                ✓
              </span>
              <span>Assessment Complete!</span>
            </h1>
            <h2 className="chair-status">You are in Chair {chair}.</h2>
            <p className="chair-type-badge">{content.stageLabel}</p>
            <nav className="chair-progress" aria-label="Four Chair Progress">
              <div
                className="chair-progress-track"
                role="progressbar"
                aria-label={progressLabel}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={overallProgress}
                aria-valuetext={`Chair ${chair}; ${effectiveSegmentProgressPercent.toFixed(1)}% through the current segment`}
              >
                {chairNumbers.map((stageChair) => {
                  const isComplete = stageChair < chair;
                  const isCurrent = stageChair === chair;
                  const segmentWidth = stageChair === 4 ? 12.5 : 25;
                  const segmentLeft = 12.5 + (stageChair - 1) * 25;
                  const fillPercent = isComplete
                    ? 100
                    : isCurrent
                      ? effectiveSegmentProgressPercent
                      : 0;

                  return (
                    <span
                      aria-hidden="true"
                      className={[
                        "chair-progress-segment",
                        isComplete ? "is-complete" : "",
                        isCurrent ? "is-current" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={stageChair}
                      style={{
                        left: `${segmentLeft}%`,
                        width: `${segmentWidth}%`,
                      }}
                    >
                      <span
                        className="chair-progress-segment-fill"
                        style={{ width: `${fillPercent}%` }}
                      />
                    </span>
                  );
                })}
                {content.growthNote && (
                  <span className="chair-growth-arrow" aria-hidden="true">
                    →
                  </span>
                )}
              </div>
              <ol className="chair-progress-list">
                {chairNumbers.map((stageChair) => {
                  const stage = chairs[stageChair];
                  const isCurrent = stageChair === chair;
                  const isComplete = stageChair < chair;

                  return (
                    <li
                      className={[
                        "chair-step",
                        isComplete ? "is-complete" : "",
                        isCurrent ? "is-current" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={stageChair}
                    >
                      <span
                        className="chair-step-node"
                        aria-current={isCurrent ? "step" : undefined}
                      >
                        {stageChair}
                      </span>
                      <span className="chair-step-label">{stage.stageLabel}</span>
                    </li>
                  );
                })}
              </ol>
              {content.growthNote && (
                <p className="chair-growth-note">{content.growthNote}</p>
              )}
            </nav>
          </header>

          <section
            className="result-content"
            aria-labelledby="chair-content-title"
          >
            <h2 id="chair-content-title">{content.heading}</h2>
            {content.explanationParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {focusResponses.length > 0 && (
              <>
                <h3>Where should I focus?</h3>
                <ul>
                  {focusResponses.slice(0, 4).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {groups.length > 0 && (
            <section
              className="chair-links-section"
              aria-labelledby="chair-groups-heading"
            >
              <h3 id="chair-groups-heading">Small Groups to Join</h3>
              <div className="chair-link-list">
                {groups.map((group) => (
                  <article className="chair-link-card" key={group.id}>
                    <div className="chair-link-card-body">
                      <h4 className="chair-link-title">{group.title}</h4>
                      <p className="chair-link-description">
                        {group.description}
                      </p>
                    </div>
                    <a
                      href={group.url}
                      className="chair-link-action"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View &amp; Join Group
                    </a>
                  </article>
                ))}
              </div>
            </section>
          )}

          {resources.length > 0 && (
            <section
              className="chair-links-section"
              aria-labelledby="chair-resources-heading"
            >
              <h3 id="chair-resources-heading">Recommended Resources</h3>
              <div className="chair-link-list">
                {resources.map((resource) => (
                  <article className="chair-link-card" key={resource.id}>
                    <div className="chair-link-card-body">
                      <h4 className="chair-link-title">{resource.title}</h4>
                      <p className="chair-link-description">
                        {resource.description}
                      </p>
                    </div>
                    <a
                      href={resource.url}
                      className="chair-link-action"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Resource
                    </a>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Optional account save prompt (shown only to guests when Supabase is configured) */}
          {supportsAuth && !participant && (
            <section className="chair-account-prompt" aria-label="Save your result">
              <p className="chair-account-prompt-text">
                <strong>Want to track your journey across devices?</strong>{" "}
                Create a free account to save and sync your chair results.
              </p>
              <button
                type="button"
                className="button button-secondary auth-account-button"
                onClick={() => setShowAuthModal(true)}
              >
                Save My Result →
              </button>
            </section>
          )}

          {/* Signed-in account status */}
          {supportsAuth && participant && (
            <div className="participant-auth-bar">
              <div className="participant-signed-in">
                <span className="participant-signed-in-name">
                  Signed in as{" "}
                  <strong>{participant.displayName ?? participant.email}</strong> (results saved to your account)
                </span>
                {onSignOut && (
                  <button
                    type="button"
                    className="auth-toggle-link"
                    onClick={onSignOut}
                  >
                    Sign out
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Connect About Your Next Steps */}
          {!disableNextStepsForm && (
            <section
              className="chair-next-steps-section"
              aria-labelledby="next-steps-heading"
            >
              <h3 id="next-steps-heading">Connect About Your Next Steps</h3>
              <p className="chair-next-steps-intro">
                Whether you have questions about your result in{" "}
                <strong>
                  Chair {chair} ({content.stageLabel})
                </strong>{" "}
                or want personal encouragement and guidance for your spiritual
                journey, our ministry team would love to connect with you.
              </p>

              {submissionResult && (
                <div
                  className={`status-message ${
                    submissionResult.ok
                      ? "admin-success-message"
                      : "admin-error-message"
                  }`}
                  role="status"
                >
                  {submissionResult.message}
                </div>
              )}

              {(!submissionResult || !submissionResult.ok) && (
                <form
                  className="chair-next-steps-form"
                  onSubmit={handleSendNextSteps}
                >
                  <div className="chair-next-steps-field">
                    <label htmlFor="next-steps-name">Your Name</label>
                    <input
                      id="next-steps-name"
                      type="text"
                      required
                      placeholder="Your Name"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      disabled={submitting}
                    />
                  </div>

                  <div className="chair-next-steps-field">
                    <label htmlFor="next-steps-email">Your Email</label>
                    <input
                      id="next-steps-email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      disabled={submitting}
                    />
                  </div>

                  <div className="chair-next-steps-field">
                    <label htmlFor="next-steps-message">
                      What Next Steps or Questions Would You Like to Share?
                    </label>
                    <textarea
                      id="next-steps-message"
                      required
                      rows={4}
                      placeholder={`Share any questions, prayer requests, or thoughts about taking your next step in Chair ${chair}...`}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={submitting}
                    />
                  </div>

                  {/* Honeypot field */}
                  <div className="visually-hidden" aria-hidden="true">
                    <label htmlFor="website-hp">Website</label>
                    <input
                      id="website-hp"
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="button button-primary chair-next-steps-submit"
                    disabled={submitting}
                  >
                    {submitting ? "Sending Request..." : "Send Next Steps Request"}
                  </button>
                </form>
              )}
            </section>
          )}

          {notice && (
            <p className="status-message" role="status">
              {notice}
            </p>
          )}
          <button className="button button-secondary" onClick={onStartOver}>
            Start Over
          </button>
        </article>
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
