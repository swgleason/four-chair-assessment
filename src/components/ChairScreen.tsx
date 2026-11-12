import { chairs } from "../content/chairs";
import type { ChairNumber } from "../lib/scoring";

interface ChairScreenProps {
  chair: ChairNumber;
  notice: string;
  onStartOver: () => void;
}

export function ChairScreen({
  chair,
  notice,
  onStartOver,
}: ChairScreenProps) {
  const content = chairs[chair];

  return (
    <main className="page-shell">
      <header className="brand-header">
        <img
          className="brand-logo"
          src="/ocupc-logo.png"
          alt="Oregon City United Pentecostal Church"
        />
      </header>
      <article className="result-card" aria-labelledby="chair-title">
        <p className="eyebrow">Chair {chair}</p>
        <h1 id="chair-title">{content.heading}</h1>
        {content.explanationParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {content.focusHeading && content.focusItems && (
          <>
            <h2>{content.focusHeading}</h2>
            <ul>
              {content.focusItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
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
  );
}
