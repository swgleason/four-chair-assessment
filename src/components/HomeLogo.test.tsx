import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  createInitialProgress,
  readProgress,
  saveProgress,
} from "../lib/progressStorage";
import { HomeLogo } from "./HomeLogo";

describe("HomeLogo", () => {
  it("renders a labeled home link containing the church logo", () => {
    const markup = renderToStaticMarkup(<HomeLogo />);

    expect(markup).toContain(
      '<a class="brand-home-link" href="/" aria-label="Four Chair Assessment Home">',
    );
    expect(markup).toContain(
      '<img class="brand-logo" src="/ocupc-logo.png" alt="Oregon City United Pentecostal Church"/>',
    );
  });

  it("calls home navigation without clearing saved progress", () => {
    const stored = new Map<string, string>();
    const storage = {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
      removeItem: (key: string) => stored.delete(key),
      clear: () => stored.clear(),
      key: (index: number) => Array.from(stored.keys())[index] ?? null,
      get length() {
        return stored.size;
      },
    } satisfies Storage;
    const progress = {
      ...createInitialProgress(),
      answers: { 1: "disagree" as const },
      currentQuestion: 2,
    };
    saveProgress(progress, storage);
    const onNavigateHome = vi.fn();
    const link = HomeLogo({ onNavigateHome });
    const clickEvent = { preventDefault: vi.fn() };

    link.props.onClick?.(clickEvent as never);

    expect(clickEvent.preventDefault).toHaveBeenCalledOnce();
    expect(onNavigateHome).toHaveBeenCalledOnce();
    expect(readProgress(storage).progress?.answers).toEqual({ 1: "disagree" });
  });

  it("keeps normal link navigation as a fallback when no callback is supplied", () => {
    const link = HomeLogo({});
    const clickEvent = { preventDefault: vi.fn() };

    link.props.onClick?.(clickEvent as never);

    expect(clickEvent.preventDefault).not.toHaveBeenCalled();
  });
});
