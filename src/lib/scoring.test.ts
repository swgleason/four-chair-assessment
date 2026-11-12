import { describe, expect, it } from "vitest";
import {
  GROWTH_SECTION_CHOICES,
  questions,
  SECTION_ONE_CHOICES,
  type AnswerChoice,
  type SectionNumber,
} from "../content/questions";
import { routeAfterSection, scoreSection } from "./scoring";

function highAnswers(section: SectionNumber): AnswerChoice[] {
  return Array(7).fill(section === 1 ? "agree" : "strong");
}

describe("section scoring", () => {
  it.each([1, 2, 3, 4] as const)(
    "scores all highest answers in Section %i as zero",
    (section) => {
      expect(scoreSection(section, highAnswers(section))).toEqual({
        section,
        failurePoints: 0,
        failed: false,
      });
    },
  );

  it("passes with three middle-option points", () => {
    const answers = highAnswers(2);
    answers.splice(0, 3, "improving", "improving", "improving");

    expect(scoreSection(2, answers)).toEqual({
      section: 2,
      failurePoints: 3,
      failed: false,
    });
  });

  it.each([
    [["improving", "improving", "improving", "improving"], 4],
    [["weak", "improving", "improving"], 4],
    [["weak", "weak"], 4],
  ] as const)("fails at %i points for responses %j", (leadingAnswers, points) => {
    const answers = highAnswers(3);
    answers.splice(0, leadingAnswers.length, ...leadingAnswers);

    expect(scoreSection(3, answers)).toEqual({
      section: 3,
      failurePoints: points,
      failed: true,
    });
  });

  it("passes with one lowest and one middle answer", () => {
    const answers = highAnswers(4);
    answers.splice(0, 2, "weak", "improving");

    expect(scoreSection(4, answers)).toEqual({
      section: 4,
      failurePoints: 3,
      failed: false,
    });
  });

  it("scores each section independently", () => {
    expect(scoreSection(1, Array(7).fill("disagree")).failurePoints).toBe(14);
    expect(scoreSection(2, highAnswers(2)).failurePoints).toBe(0);
  });

  it.each([1, 2, 3, 4] as const)(
    "routes a failure in Section %i to its corresponding chair",
    (section) => {
      const answers = Array(7).fill(section === 1 ? "disagree" : "weak");
      const score = scoreSection(section, answers);

      expect(score.failed).toBe(true);
      expect(routeAfterSection(score)).toEqual({ type: "chair", chair: section });
    },
  );

  it.each([
    [1, 2, 8],
    [2, 3, 15],
    [3, 4, 22],
  ] as const)(
    "continues from Section %i to Section %i at question %i when passed",
    (section, nextSection, nextQuestion) => {
      expect(
        routeAfterSection(scoreSection(section, highAnswers(section))),
      ).toEqual({
        type: "continue",
        nextSection,
        nextQuestion,
      });
    },
  );

  it("routes an all-sections pass to Chair 4", () => {
    expect(routeAfterSection(scoreSection(4, highAnswers(4)))).toEqual({
      type: "chair",
      chair: 4,
    });
  });

  it("assigns the correct choices and section to all 28 questions", () => {
    expect(questions).toHaveLength(28);

    for (let section = 1; section <= 4; section += 1) {
      const sectionQuestions = questions.filter(
        (question) => question.section === section,
      );
      expect(sectionQuestions).toHaveLength(7);
      expect(
        sectionQuestions.map(({ id }) => id),
      ).toEqual(Array.from({ length: 7 }, (_, index) => section * 7 - 6 + index));

      const expectedChoices =
        section === 1 ? SECTION_ONE_CHOICES : GROWTH_SECTION_CHOICES;
      expect(sectionQuestions.every((question) => question.choices === expectedChoices)).toBe(
        true,
      );
    }
  });

  it("requires exactly seven answers with choices for the given section", () => {
    expect(() => scoreSection(1, ["agree"])).toThrow(RangeError);
    expect(() =>
      scoreSection(1, ["strong", "strong", "strong", "strong", "strong", "strong", "strong"]),
    ).toThrow(TypeError);
  });
});
