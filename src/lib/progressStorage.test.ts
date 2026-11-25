import { describe, expect, it } from "vitest";
import type { AnswerChoice } from "../content/questions";
import {
  clearProgress,
  createInitialProgress,
  LEGACY_PROGRESS_STORAGE_KEY,
  PROGRESS_STORAGE_KEY,
  readProgress,
  saveProgress,
} from "./progressStorage";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, String(value));
  }
}

describe("progress storage", () => {
  it("saves and restores selected answers and question position", () => {
    const storage = new MemoryStorage();
    const progress = {
      ...createInitialProgress(),
      answers: {
        1: "agree" as const,
        2: "unsure" as const,
        3: "agree" as const,
        4: "agree" as const,
        5: "unsure" as const,
        6: "agree" as const,
        7: "agree" as const,
        8: "weak" as const,
      },
      currentQuestion: 9,
    };

    expect(saveProgress(progress, storage)).toBe(true);
    expect(readProgress(storage)).toMatchObject({
      progress: {
        answers: { 1: "agree", 2: "unsure", 8: "weak" },
        currentQuestion: 9,
        completed: false,
      },
      error: null,
    });
  });

  it("migrates valid incomplete progress from the previous schema", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      LEGACY_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        answers: { 1: "agree", 2: "unsure" },
        currentQuestion: 3,
        completed: false,
        destination: null,
        updatedAt: new Date().toISOString(),
      }),
    );

    expect(readProgress(storage)).toMatchObject({
      progress: {
        version: 2,
        currentQuestion: 3,
        answers: { 1: "agree", 2: "unsure" },
        completed: false,
      },
      error: null,
    });
    expect(storage.getItem(LEGACY_PROGRESS_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(PROGRESS_STORAGE_KEY)).not.toBeNull();
  });

  it("continues after saved progress that passed the former first-section slice", () => {
    const storage = new MemoryStorage();
    const answers = Object.fromEntries(
      Array.from({ length: 7 }, (_, index) => [index + 1, "agree"]),
    );
    storage.setItem(
      LEGACY_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        answers,
        currentQuestion: 7,
        completed: true,
        destination: "section-1-complete",
        updatedAt: new Date().toISOString(),
      }),
    );

    expect(readProgress(storage)).toMatchObject({
      progress: {
        version: 2,
        currentQuestion: 8,
        completed: false,
        destination: null,
      },
      error: null,
    });
  });

  it("ignores malformed or invalid saved data without throwing", () => {
    const storage = new MemoryStorage();
    storage.setItem(PROGRESS_STORAGE_KEY, "{not-json");

    expect(readProgress(storage)).toMatchObject({
      progress: null,
      error: expect.any(String),
    });

    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({ version: 99 }));
    expect(readProgress(storage)).toMatchObject({
      progress: null,
      error: expect.any(String),
    });

    storage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        ...createInitialProgress(),
        currentQuestion: 3,
        answers: { 1: "agree" },
      }),
    );
    expect(readProgress(storage)).toMatchObject({
      progress: null,
      error: expect.any(String),
    });
  });

  it("saves and restores Sonlife completed-result fields", () => {
    const storage = new MemoryStorage();
    const answers = Object.fromEntries(
      Array.from({ length: 21 }, (_, index) => [
        index + 1,
        index < 7 ? "agree" : "strong",
      ]),
    ) as Partial<Record<number, AnswerChoice>>;
    const progress = {
      ...createInitialProgress(),
      answers,
      currentQuestion: 21,
      completed: true,
      destination: 2 as const,
      chairScore: 2.71,
      focusResponses: ["Chair 1 response", "Question 15 response"],
    };

    expect(saveProgress(progress, storage)).toBe(true);
    expect(readProgress(storage)).toMatchObject({
      progress,
      error: null,
    });
  });

  it("accepts completed offset destinations for Sections 3 and 4", () => {
    const sectionThreeAnswers = Object.fromEntries(
      Array.from({ length: 21 }, (_, index) => [
        index + 1,
        index < 7 ? "agree" : "strong",
      ]),
    ) as Partial<Record<number, AnswerChoice>>;
    expect(
      readProgress(
        (() => {
          const storage = new MemoryStorage();
          storage.setItem(
            PROGRESS_STORAGE_KEY,
            JSON.stringify({
              ...createInitialProgress(),
              answers: sectionThreeAnswers,
              currentQuestion: 21,
              completed: true,
              destination: 2,
              chairScore: 2.71,
              focusResponses: [],
              updatedAt: new Date().toISOString(),
            }),
          );
          return storage;
        })(),
      ).progress?.destination,
    ).toBe(2);
  });

  it("clears only the assessment key", () => {
    const storage = new MemoryStorage();
    storage.setItem(PROGRESS_STORAGE_KEY, "saved");
    storage.setItem(LEGACY_PROGRESS_STORAGE_KEY, "legacy");
    storage.setItem("another-app:key", "keep");

    expect(clearProgress(storage)).toBe(true);
    expect(storage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_PROGRESS_STORAGE_KEY)).toBeNull();
    expect(storage.getItem("another-app:key")).toBe("keep");
  });
});
