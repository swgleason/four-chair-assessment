import { questions, type AnswerChoice } from "../content/questions";
import type { ChairNumber } from "./scoring";

export const PROGRESS_STORAGE_KEY = "ocupc-four-chair-assessment:v2";
export const LEGACY_PROGRESS_STORAGE_KEY = "ocupc-four-chair-assessment:v1";
const PROGRESS_VERSION = 2;

export interface AssessmentProgress {
  version: 2;
  answers: Partial<Record<number, AnswerChoice>>;
  currentQuestion: number;
  completed: boolean;
  destination: ChairNumber | null;
  updatedAt: string;
  chairScore?: number;
  focusResponses?: string[];
}

interface LegacyProgress {
  version: 1;
  answers: Partial<Record<number, AnswerChoice>>;
  currentQuestion: number;
  completed: boolean;
  destination: "chair-1" | "section-1-complete" | null;
  updatedAt: string;
}

export interface ProgressReadResult {
  progress: AssessmentProgress | null;
  error: string | null;
}

const validAnswers = new Set<string>([
  "disagree",
  "unsure",
  "agree",
  "weak",
  "improving",
  "strong",
]);

export function createInitialProgress(): AssessmentProgress {
  return {
    version: PROGRESS_VERSION,
    answers: {},
    currentQuestion: 1,
    completed: false,
    destination: null,
    updatedAt: new Date().toISOString(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAnswerChoice(value: unknown): value is AnswerChoice {
  return typeof value === "string" && validAnswers.has(value);
}

function answersAreValid(
  value: unknown,
  maxQuestion: number,
): value is Partial<Record<number, AnswerChoice>> {
  if (!isRecord(value)) return false;

  return !Object.entries(value).some(([questionId, answer]) => {
    const id = Number(questionId);
    if (
      !Number.isInteger(id) ||
      id < 1 ||
      id > maxQuestion ||
      String(id) !== questionId ||
      !isAnswerChoice(answer)
    ) {
      return true;
    }

    return !questions[id - 1].choices.includes(answer);
  });
}

function hasEarlierAnswers(
  answers: Partial<Record<number, AnswerChoice>>,
  currentQuestion: number,
): boolean {
  for (let questionId = 1; questionId < currentQuestion; questionId += 1) {
    if (!Object.prototype.hasOwnProperty.call(answers, questionId)) return false;
  }
  return true;
}

function hasAnswersThrough(
  answers: Partial<Record<number, AnswerChoice>>,
  finalQuestion: number,
): boolean {
  for (let questionId = 1; questionId <= finalQuestion; questionId += 1) {
    if (!Object.prototype.hasOwnProperty.call(answers, questionId)) return false;
  }
  return true;
}

export function isAssessmentProgress(value: unknown): value is AssessmentProgress {
  if (!isRecord(value)) return false;

  const {
    currentQuestion,
    completed,
    answers,
    updatedAt,
    destination,
    chairScore,
    focusResponses,
  } = value;
  if (
    value.version !== PROGRESS_VERSION ||
    typeof currentQuestion !== "number" ||
    !Number.isInteger(currentQuestion) ||
    currentQuestion < 1 ||
    currentQuestion > questions.length ||
    typeof completed !== "boolean" ||
    typeof updatedAt !== "string" ||
    !Number.isFinite(Date.parse(updatedAt)) ||
    !answersAreValid(answers, questions.length) ||
    (chairScore !== undefined &&
      (typeof chairScore !== "number" ||
        !Number.isFinite(chairScore) ||
        chairScore < 1 ||
        chairScore > 4.9)) ||
    (focusResponses !== undefined &&
      (!Array.isArray(focusResponses) ||
        focusResponses.length > 4 ||
        focusResponses.some((item) => typeof item !== "string")))
  ) {
    return false;
  }

  if (completed) {
    const validDestination =
      (currentQuestion === 7 && destination === 1) ||
      (currentQuestion === 14 && destination === 2) ||
      (currentQuestion === 21 && destination === 2) ||
      (currentQuestion === 28 &&
        (destination === 3 || destination === 4));

    return (
      currentQuestion % 7 === 0 &&
      validDestination &&
      hasAnswersThrough(answers, currentQuestion) &&
      Object.keys(answers).every((id) => Number(id) <= currentQuestion)
    );
  }

  return value.destination === null && hasEarlierAnswers(answers, currentQuestion);
}

function isProgress(value: unknown): value is AssessmentProgress {
  return isAssessmentProgress(value);
}

function isLegacyProgress(value: unknown): value is LegacyProgress {
  if (!isRecord(value)) return false;

  const { currentQuestion, completed, answers, destination, updatedAt } = value;
  if (
    value.version !== 1 ||
    typeof currentQuestion !== "number" ||
    !Number.isInteger(currentQuestion) ||
    currentQuestion < 1 ||
    currentQuestion > 7 ||
    typeof completed !== "boolean" ||
    typeof updatedAt !== "string" ||
    !Number.isFinite(Date.parse(updatedAt)) ||
    !answersAreValid(answers, 7) ||
    Object.values(answers).some(
      (answer) => answer !== "disagree" && answer !== "unsure" && answer !== "agree",
    )
  ) {
    return false;
  }

  if (completed) {
    return (
      currentQuestion === 7 &&
      hasAnswersThrough(answers, 7) &&
      (destination === "chair-1" || destination === "section-1-complete")
    );
  }

  return destination === null && hasEarlierAnswers(answers, currentQuestion);
}

function migrateLegacyProgress(legacy: LegacyProgress): AssessmentProgress {
  const completedWithChairOne =
    legacy.completed && legacy.destination === "chair-1";
  const passedFirstSection =
    legacy.completed && legacy.destination === "section-1-complete";

  return {
    version: PROGRESS_VERSION,
    answers: legacy.answers,
    currentQuestion: passedFirstSection ? 8 : legacy.currentQuestion,
    completed: completedWithChairOne,
    destination: completedWithChairOne ? 1 : null,
    updatedAt: new Date().toISOString(),
  };
}

function getStorage(storage?: Storage): Storage {
  return storage ?? window.localStorage;
}

export function readProgress(storage?: Storage): ProgressReadResult {
  try {
    const store = getStorage(storage);
    const currentRaw = store.getItem(PROGRESS_STORAGE_KEY);
    if (currentRaw !== null) {
      const current: unknown = JSON.parse(currentRaw);
      if (!isProgress(current)) {
        return {
          progress: null,
          error: "Saved progress was invalid or outdated and has been ignored.",
        };
      }
      return { progress: current, error: null };
    }

    const legacyRaw = store.getItem(LEGACY_PROGRESS_STORAGE_KEY);
    if (legacyRaw === null) return { progress: null, error: null };

    const legacy: unknown = JSON.parse(legacyRaw);
    if (!isLegacyProgress(legacy)) {
      return {
        progress: null,
        error: "Saved progress was invalid or outdated and has been ignored.",
      };
    }

    const migrated = migrateLegacyProgress(legacy);
    try {
      store.setItem(
        PROGRESS_STORAGE_KEY,
        JSON.stringify({ ...migrated, updatedAt: new Date().toISOString() }),
      );
      store.removeItem(LEGACY_PROGRESS_STORAGE_KEY);
      return { progress: migrated, error: null };
    } catch (error) {
      if (error instanceof DOMException) {
        return {
          progress: migrated,
          error: "Progress was restored but could not be updated to the newer format.",
        };
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof DOMException) {
      return {
        progress: null,
        error: "Saved progress could not be read in this browser.",
      };
    }
    throw error;
  }
}

export function saveProgress(
  progress: AssessmentProgress,
  storage?: Storage,
): boolean {
  try {
    getStorage(storage).setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ ...progress, updatedAt: new Date().toISOString() }),
    );
    return true;
  } catch (error) {
    if (error instanceof DOMException) return false;
    throw error;
  }
}

export function clearProgress(storage?: Storage): boolean {
  try {
    const store = getStorage(storage);
    store.removeItem(PROGRESS_STORAGE_KEY);
    store.removeItem(LEGACY_PROGRESS_STORAGE_KEY);
    return true;
  } catch (error) {
    if (error instanceof DOMException) return false;
    throw error;
  }
}
