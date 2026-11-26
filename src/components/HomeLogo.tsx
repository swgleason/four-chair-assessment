export interface HomeLogoProps {
  onNavigateHome?: () => void;
  logoClassName?: string;
}

export function HomeLogo({
  onNavigateHome,
  logoClassName,
}: HomeLogoProps) {
  return (
    <a
      className="brand-home-link"
      href="/"
      aria-label="Four Chair Assessment Home"
      onClick={(event) => {
        if (onNavigateHome) {
          event.preventDefault();
          onNavigateHome();
        }
      }}
    >
      <img
        className={["brand-logo", logoClassName].filter(Boolean).join(" ")}
        src="/ocupc-logo.png"
        alt="Oregon City United Pentecostal Church"
      />
    </a>
  );
}
