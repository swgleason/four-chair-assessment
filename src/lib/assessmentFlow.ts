import { questions, type AnswerChoice } from "../content/questions";
import type { AssessmentProgress } from "./progressStorage";
import {
  evaluateAssessmentSection,
  type ChairNumber,
} from "./scoring";

export interface AnswerTransition {
  progress: AssessmentProgress;
  completed: boolean;
  chairScore?: number;
  focusResponses?: readonly string[];
}

/**
 * Handles answering a question and advancing.
 *
 * If answering at a section boundary (Q7, Q14, Q21, Q28):
 * - Evaluates section scores and pass/fail thresholds.
 * - Applies chair routing and offsets:
 *   - S1 < 18 => Chair 1
 *   - S2 < 14 => Chair 2
 *   - S3 < 14 => Chair 2 (via S2 score)
 *   - S4 < 14 => Chair 3 (via S3 score)
 *   - S4 >= 14 => Chair 4 (via S4 score)
 */
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

  // If not at a section boundary (Q7, Q14, Q21, Q28), simply advance
  if (questionId % 7 !== 0) {
    return {
      progress: {
        ...progress,
        answers,
        currentQuestion: questionId + 1,
        updatedAt: new Date().toISOString(),
      },
      completed: false,
    };
  }

  // At a section boundary, evaluate scoring logic
  const evaluation = evaluateAssessmentSection(question.section, answers);

  if (!evaluation.completed) {
    return {
      progress: {
        ...progress,
        answers,
        currentQuestion: evaluation.nextQuestion!,
        updatedAt: new Date().toISOString(),
      },
      completed: false,
      focusResponses: evaluation.focusResponses,
    };
  }

  return {
    progress: {
      ...progress,
      answers,
      completed: true,
      destination: evaluation.chair as ChairNumber,
      updatedAt: new Date().toISOString(),
    },
    completed: true,
    chairScore: evaluation.chairScore,
    focusResponses: evaluation.focusResponses,
  };
}

/**
 * Helper to step backward to a previous question.
 *
 * STRICT RULE:
 * When moving backward to `targetQuestion < currentQuestion`, clears any
 * answers for question IDs > targetQuestion so stale answers from later
 * questions/sections cannot linger or trigger unintended forward evaluation.
 */
export function stepBack(
  progress: AssessmentProgress,
  targetQuestion?: number,
): AssessmentProgress {
  if (progress.completed || progress.currentQuestion <= 1) {
    return progress;
  }

  const destination = targetQuestion ?? progress.currentQuestion - 1;
  if (destination < 1 || destination >= progress.currentQuestion) {
    return progress;
  }

  // Clear any answers for questions > destination
  const cleanedAnswers: Partial<Record<number, AnswerChoice>> = {};
  for (const [key, val] of Object.entries(progress.answers)) {
    const qId = Number(key);
    if (qId <= destination && val) {
      cleanedAnswers[qId] = val;
    }
  }

  return {
    ...progress,
    answers: cleanedAnswers,
    currentQuestion: destination,
    completed: false,
    destination: null,
    chairScore: undefined,
    focusResponses: undefined,
    updatedAt: new Date().toISOString(),
  };
}
