import { questions, type AnswerChoice } from "../content/questions";
import type { AssessmentProgress } from "./progressStorage";
import { routeAfterSection, scoreSection } from "./scoring";

export interface AnswerTransition {
  progress: AssessmentProgress;
  completed: boolean;
}

export function answerAndAdvance(
  progress: AssessmentProgress,
  questionId: number,
  answer: AnswerChoice,
): AnswerTransition {
  if (
    progress.completed ||
    questionId !== progress.currentQuestion ||
    questionId < 1 ||
    questionId > questions.length
  ) {
    throw new RangeError("Only the current question can be answered.");
  }

  const question = questions[questionId - 1];
  if (!question.choices.includes(answer)) {
    throw new TypeError(`Question ${questionId} received an invalid answer.`);
  }

  const answers = { ...progress.answers, [questionId]: answer };
  if (questionId % 7 !== 0) {
    return {
      progress: {
        ...progress,
        answers,
        currentQuestion: questionId + 1,
      },
      completed: false,
    };
  }

  const sectionAnswers = questions
    .filter((item) => item.section === question.section)
    .map(({ id }) => {
      const selected = answers[id];
      if (!selected) {
        throw new Error(`Question ${id} has no answer.`);
      }
      return selected;
    });

  const route = routeAfterSection(
    scoreSection(question.section, sectionAnswers),
  );
  if (route.type === "continue") {
    return {
      progress: {
        ...progress,
        answers,
        currentQuestion: route.nextQuestion,
      },
      completed: false,
    };
  }

  return {
    progress: {
      ...progress,
      answers,
      completed: true,
      destination: route.chair,
    },
    completed: true,
  };
}
