import { describe, expect, it } from "vitest";
import { questions, type AnswerChoice, type SectionNumber } from "../content/questions";
import { answerAndAdvance, stepBack } from "./assessmentFlow";
import { createInitialProgress } from "./progressStorage";

function highestAnswer(questionId: number): AnswerChoice {
  return questionId <= 7 ? "agree" : "strong";
}

function lowestAnswer(questionId: number): AnswerChoice {
  return questionId <= 7 ? "disagree" : "weak";
}

function progressAtSectionEnd(
  section: SectionNumber,
  failing: boolean,
) {
  const firstQuestion = (section - 1) * 7 + 1;
  const lastQuestion = section * 7;
  const answers: Partial<Record<number, AnswerChoice>> = {};

  for (let questionId = 1; questionId < firstQuestion; questionId += 1) {
    answers[questionId] = highestAnswer(questionId);
  }
  for (let questionId = firstQuestion; questionId < lastQuestion; questionId += 1) {
    answers[questionId] =
      failing && questionId < firstQuestion + 4
        ? lowestAnswer(questionId) // 4 weak = 0 pts -> fail
        : highestAnswer(questionId);
  }

  return {
    ...createInitialProgress(),
    currentQuestion: lastQuestion,
    answers,
  };
}

describe("automatic assessment progression with Sonlife rules", () => {
  it("saves the selected answer and advances to the next question", () => {
    const transition = answerAndAdvance(createInitialProgress(), 1, "unsure");

    expect(transition.completed).toBe(false);
    expect(transition.progress.currentQuestion).toBe(2);
    expect(transition.progress.answers[1]).toBe("unsure");
  });

  it("replaces an answer when revisiting a question and advances again", () => {
    const progress = {
      ...createInitialProgress(),
      answers: { 1: "disagree" as const },
    };
    const transition = answerAndAdvance(progress, 1, "agree");

    expect(transition.progress.answers[1]).toBe("agree");
    expect(transition.progress.currentQuestion).toBe(2);
  });

  it("continues into the next section when the section passes", () => {
    const progress = progressAtSectionEnd(1, false);
    const transition = answerAndAdvance(progress, 7, highestAnswer(7));

    expect(transition.completed).toBe(false);
    expect(transition.progress.currentQuestion).toBe(8);
    expect(transition.progress.destination).toBeNull();
  });

  it("stops at Q7 and routes to Chair 1 when Section 1 fails (< 18)", () => {
    const progress = progressAtSectionEnd(1, true);
    const transition = answerAndAdvance(progress, 7, lowestAnswer(7));

    expect(transition.completed).toBe(true);
    expect(transition.progress.currentQuestion).toBe(7);
    expect(transition.progress.destination).toBe(1);
    expect(transition.chairScore).toBeDefined();
    expect(transition.focusResponses).toBeDefined();
  });

  it("stops at Q14 and routes to Chair 2 when Section 2 fails (< 14)", () => {
    const progress = progressAtSectionEnd(2, true);
    const transition = answerAndAdvance(progress, 14, lowestAnswer(14));

    expect(transition.completed).toBe(true);
    expect(transition.progress.currentQuestion).toBe(14);
    expect(transition.progress.destination).toBe(2);
  });

  it("stops at Q21 and routes to Chair 2 (OFFSET) when Section 3 fails (< 14)", () => {
    const progress = progressAtSectionEnd(3, true);
    const transition = answerAndAdvance(progress, 21, lowestAnswer(21));

    expect(transition.completed).toBe(true);
    expect(transition.progress.currentQuestion).toBe(21);
    // OFFSET: Section 3 fail sends user to Chair 2
    expect(transition.progress.destination).toBe(2);
  });

  it("stops at Q28 and routes to Chair 3 (OFFSET) when Section 4 fails (< 14)", () => {
    const progress = progressAtSectionEnd(4, true);
    const transition = answerAndAdvance(progress, 28, lowestAnswer(28));

    expect(transition.completed).toBe(true);
    expect(transition.progress.currentQuestion).toBe(28);
    // OFFSET: Section 4 fail sends user to Chair 3
    expect(transition.progress.destination).toBe(3);
  });

  it("routes passing all four sections to Chair 4", () => {
    const transition = answerAndAdvance(
      progressAtSectionEnd(4, false),
      questions.length,
      highestAnswer(questions.length),
    );

    expect(transition.completed).toBe(true);
    expect(transition.progress.destination).toBe(4);
  });
});

describe("back navigation and clearing stale answers (stepBack)", () => {
  it("clears answers for questions beyond the target question", () => {
    const initial = {
      ...createInitialProgress(),
      currentQuestion: 5,
      answers: {
        1: "agree" as const,
        2: "unsure" as const,
        3: "agree" as const,
        4: "agree" as const,
        5: "disagree" as const, // stale future answer
        6: "unsure" as const, // stale future answer
      },
    };

    const stepped = stepBack(initial, 3);
    expect(stepped.currentQuestion).toBe(3);
    expect(stepped.answers[1]).toBe("agree");
    expect(stepped.answers[2]).toBe("unsure");
    expect(stepped.answers[3]).toBe("agree");
    expect(stepped.answers[4]).toBeUndefined();
    expect(stepped.answers[5]).toBeUndefined();
    expect(stepped.answers[6]).toBeUndefined();
  });

  it("defaults to previous question if target not specified", () => {
    const initial = {
      ...createInitialProgress(),
      currentQuestion: 4,
      answers: {
        1: "agree" as const,
        2: "unsure" as const,
        3: "agree" as const,
        4: "disagree" as const,
      },
    };

    const stepped = stepBack(initial);
    expect(stepped.currentQuestion).toBe(3);
    expect(stepped.answers[4]).toBeUndefined();
    expect(stepped.answers[3]).toBe("agree");
  });
});
