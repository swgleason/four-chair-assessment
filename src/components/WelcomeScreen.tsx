interface WelcomeScreenProps {
  hasSavedProgress: boolean;
  notice: string;
  onBegin: () => void;
  onContinue: () => void;
  onStartOver: () => void;
}

export function WelcomeScreen({
  hasSavedProgress,
  notice,
  onBegin,
  onContinue,
  onStartOver,
}: WelcomeScreenProps) {
  return (
    <main className="page-shell">
      <header className="brand-header">
        <img
          className="brand-logo"
          src="/ocupc-logo.png"
          alt="Oregon City United Pentecostal Church"
        />
      </header>
      <section className="welcome-card" aria-labelledby="welcome-title">
        <p className="eyebrow">A tool for reflection</p>
        <h1 id="welcome-title">Four Chair Assessment</h1>
        <p className="intro-copy">
          A tool for reflection and identifying next steps.
        </p>
        <p className="privacy-copy">
          Your progress is stored in this browser on this device and does not
          sync to other devices.
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
      </section>
    </main>
  );
}
