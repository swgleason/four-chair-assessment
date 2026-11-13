import { chairs } from "../content/chairs";
import type { ChairNumber } from "../lib/scoring";

const chairNumbers: readonly ChairNumber[] = [1, 2, 3, 4];

interface ChairScreenProps {
  chair: ChairNumber;
  segmentProgressPercent: number;
  notice: string;
  onStartOver: () => void;
}

export function ChairScreen({
  chair,
  segmentProgressPercent,
  notice,
  onStartOver,
}: ChairScreenProps) {
  const content = chairs[chair];
  const overallProgress =
    Math.round(((chair - 1 + segmentProgressPercent / 100) / 4) * 1000) / 10;
  const progressLabel =
    chair === 4
      ? "Progress toward ongoing growth beyond Chair 4"
      : `Progress through the four chairs`;

  return (
    <main className="page-shell">
      <header className="brand-header">
        <img
          className="brand-logo"
          src="/ocupc-logo.png"
          alt="Oregon City United Pentecostal Church"
        />
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
              aria-valuetext={`Chair ${chair}; ${segmentProgressPercent.toFixed(1)}% through the current segment`}
            >
              {chairNumbers.map((stageChair) => {
                const isComplete = stageChair < chair;
                const isCurrent = stageChair === chair;
                const segmentWidth = stageChair === 4 ? 12.5 : 25;
                const segmentLeft = 12.5 + (stageChair - 1) * 25;
                const fillPercent = isComplete
                  ? 100
                  : isCurrent
                    ? segmentProgressPercent
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

        <section className="result-content" aria-labelledby="chair-content-title">
          <h2 id="chair-content-title">{content.heading}</h2>
          {content.explanationParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {content.focusHeading && content.focusItems && (
            <>
              <h3>{content.focusHeading}</h3>
              <ul>
                {content.focusItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
        </section>

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
  );
}
