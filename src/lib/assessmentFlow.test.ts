import { describe, expect, it } from "vitest";
import { questions, type AnswerChoice, type SectionNumber } from "../content/questions";
import { answerAndAdvance } from "./assessmentFlow";
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
      failing && questionId < firstQuestion + 2
        ? lowestAnswer(questionId)
        : highestAnswer(questionId);
  }

  return {
    ...createInitialProgress(),
    currentQuestion: lastQuestion,
    answers,
  };
}

describe("automatic assessment progression", () => {
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

  it("continues into the next section without showing a result when the section passes", () => {
    const progress = progressAtSectionEnd(1, false);
    const transition = answerAndAdvance(progress, 7, highestAnswer(7));

    expect(transition.completed).toBe(false);
    expect(transition.progress.currentQuestion).toBe(8);
    expect(transition.progress.destination).toBeNull();
  });

  it.each([1, 2, 3, 4] as const)(
    "stops at the end of Section %i and routes to its chair when it fails",
    (section) => {
      const lastQuestion = section * 7;
      const transition = answerAndAdvance(
        progressAtSectionEnd(section, true),
        lastQuestion,
        highestAnswer(lastQuestion),
      );

      expect(transition.completed).toBe(true);
      expect(transition.progress.currentQuestion).toBe(lastQuestion);
      expect(transition.progress.destination).toBe(section);
    },
  );

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
