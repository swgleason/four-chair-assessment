export interface WelcomeScreenProps {
  hasSavedProgress: boolean;
  notice: string;
  onBegin: () => void;
  onContinue: () => void;
  onStartOver: () => void;
  onOpenAdmin?: () => void;
}

export function WelcomeScreen({
  hasSavedProgress,
  notice,
  onBegin,
  onContinue,
  onStartOver,
  onOpenAdmin,
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
          Jesus invited people to follow Him in stages: Come and see, Follow me,
          Fish for people, Go and bear fruit. Answer a few questions to find
          which chair you’re in today and what comes next.
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

        {onOpenAdmin && (
          <div className="admin-entry-footer">
            <button
              type="button"
              className="admin-entry-button"
              onClick={onOpenAdmin}
            >
              Manage Chair Links (Admin)
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
