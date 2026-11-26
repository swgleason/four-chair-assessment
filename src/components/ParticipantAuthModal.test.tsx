import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ChairScreen } from "./ChairScreen";
import { AuthModeToggle, ParticipantAuthModal } from "./ParticipantAuthModal";
import { WelcomeScreen } from "./WelcomeScreen";

vi.mock("../lib/supabaseClient", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../lib/supabaseClient")>();
  return { ...actual, isSupabaseConfigured: true };
});

describe("ParticipantAuthModal", () => {
  it("renders a centered-dialog structure with styled form and close actions", () => {
    const markup = renderToStaticMarkup(
      <ParticipantAuthModal onClose={vi.fn()} onAuthenticated={vi.fn()} />,
    );

    expect(markup).toContain(
      'class="auth-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title"',
    );
    expect(markup).toContain('class="auth-modal" role="document"');
    expect(markup).toContain('class="auth-modal-close"');
    expect(markup).toContain('aria-label="Close sign-in panel"');
    expect(markup).toContain('class="auth-modal-form"');
    expect(markup).toContain('class="button button-primary auth-modal-submit"');
    expect(markup).toContain('class="auth-toggle-link"');
    expect(markup).toContain('id="auth-email"');
    expect(markup).toContain("visible to church leadership");
  });

  it("switches the mode toggle in both directions", () => {
    const onSwitch = vi.fn();
    const signInToggle = AuthModeToggle({ mode: "signin", onSwitch });
    const signInMarkup = renderToStaticMarkup(signInToggle);
    expect(signInMarkup).toContain("Don&#x27;t have an account?");
    expect(signInMarkup).toContain("Create one");

    const signUpButton = signInToggle.props.children[1];
    if (!isValidElement<{ onClick?: () => void }>(signUpButton)) {
      throw new Error("Sign-up mode toggle button was not rendered.");
    }
    signUpButton.props.onClick?.();
    expect(onSwitch).toHaveBeenCalledWith("signup");

    const signUpToggle = AuthModeToggle({ mode: "signup", onSwitch });
    const signUpMarkup = renderToStaticMarkup(signUpToggle);
    expect(signUpMarkup).toContain("Already have an account?");
    expect(signUpMarkup).toContain("Sign in");

    const signInButton = signUpToggle.props.children[1];
    if (!isValidElement<{ onClick?: () => void }>(signInButton)) {
      throw new Error("Sign-in mode toggle button was not rendered.");
    }
    signInButton.props.onClick?.();
    expect(onSwitch).toHaveBeenLastCalledWith("signin");
  });

  it("renders styled account controls on Welcome and Chair screens", () => {
    const welcomeMarkup = renderToStaticMarkup(
      <WelcomeScreen
        hasSavedProgress={false}
        notice=""
        onBegin={vi.fn()}
        onContinue={vi.fn()}
        onStartOver={vi.fn()}
        participant={null}
      />,
    );
    expect(welcomeMarkup).toContain('class="auth-signin-prompt"');

    const chairMarkup = renderToStaticMarkup(
      <ChairScreen
        chair={1}
        segmentProgressPercent={0}
        notice=""
        onStartOver={vi.fn()}
        participant={null}
        initialLinks={[]}
        disableNextStepsForm
      />,
    );
    expect(chairMarkup).toContain('class="button button-secondary auth-account-button"');
    expect(chairMarkup).toContain("Save My Result");
  });
});
