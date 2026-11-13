import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { questions } from "../content/questions";
import { AssessmentScreen } from "./AssessmentScreen";

describe("AssessmentScreen", () => {
  it("shows each question's number before its text", () => {
    const markup = renderToStaticMarkup(
      <AssessmentScreen
        progress={{
          version: 2,
          answers: { 1: "agree" },
          currentQuestion: 2,
          completed: false,
          destination: null,
          updatedAt: new Date().toISOString(),
        }}
        notice=""
        onAnswer={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(markup).toContain(
      "<legend class=\"question-text\" tabindex=\"-1\">2. I could never be good enough to earn my way to heaven</legend>",
    );
  });

  it("shows a silent progress bar based on saved answers", () => {
    const markup = renderToStaticMarkup(
      <AssessmentScreen
        progress={{
          version: 2,
          answers: { 1: "agree", 2: "unsure" },
          currentQuestion: 3,
          completed: false,
          destination: null,
          updatedAt: new Date().toISOString(),
        }}
        notice=""
        onAnswer={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(markup).toContain('aria-label="Assessment progress"');
    expect(markup).toContain(`aria-valuemax="${questions.length}"`);
    expect(markup).toContain('aria-valuenow="2"');
    expect(markup).toContain(
      `style="width:${(2 / questions.length) * 100}%"`,
    );
    expect(markup).not.toContain("2 of 28");
    expect(markup).not.toContain("% complete");
  });
});
