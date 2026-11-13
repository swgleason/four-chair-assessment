import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ChairScreen } from "./ChairScreen";

function renderChair(chair: 1 | 2 | 3 | 4, segmentProgressPercent: number) {
  return renderToStaticMarkup(
    <ChairScreen
      chair={chair}
      segmentProgressPercent={segmentProgressPercent}
      notice=""
      onStartOver={vi.fn()}
    />,
  );
}

describe("ChairScreen progress", () => {
  it.each([
    [1, 95, 23.8],
    [2, 85.5, 46.4],
    [3, 0, 50],
    [4, 0, 75],
  ] as const)(
    "renders completed, active, and future segments for Chair %i",
    (chair, value, overallProgress) => {
      const markup = renderChair(chair, value);

      expect(markup).toContain(`aria-valuenow="${overallProgress}"`);
      expect(markup).toContain(
        `aria-valuetext="Chair ${chair}; ${value.toFixed(1)}% through the current segment"`,
      );
      expect(markup.match(/aria-current="step"/g)).toHaveLength(1);

      for (let segmentChair = 1; segmentChair <= 4; segmentChair += 1) {
        const isComplete = segmentChair < chair;
        const isCurrent = segmentChair === chair;
        const segmentWidth = segmentChair === 4 ? 12.5 : 25;
        const segmentLeft = 12.5 + (segmentChair - 1) * 25;
        const fillPercent = isComplete ? 100 : isCurrent ? value : 0;
        const segmentClasses = [
          "chair-progress-segment",
          isComplete ? "is-complete" : "",
          isCurrent ? "is-current" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const nodeClasses = [
          "chair-step",
          isComplete ? "is-complete" : "",
          isCurrent ? "is-current" : "",
        ]
          .filter(Boolean)
          .join(" ");

        expect(markup).toContain(
          `<span aria-hidden="true" class="${segmentClasses}" style="left:${segmentLeft}%;width:${segmentWidth}%"><span class="chair-progress-segment-fill" style="width:${fillPercent}%"></span></span>`,
        );
        expect(markup).toContain(`<li class="${nodeClasses}">`);
      }
    },
  );

  it("shows the ongoing growth indicator only for Chair 4", () => {
    expect(renderChair(3, 70)).not.toContain(
      "Spiritual growth and disciple-making continue.",
    );

    const chairFourMarkup = renderChair(4, 100);
    expect(chairFourMarkup).toContain("Spiritual growth and disciple-making continue.");
    expect(chairFourMarkup).toContain(
      '<span aria-hidden="true" class="chair-progress-segment is-current" style="left:87.5%;width:12.5%"><span class="chair-progress-segment-fill" style="width:100%"></span></span>',
    );
    expect(chairFourMarkup).toContain(
      '<span class="chair-growth-arrow" aria-hidden="true">→</span>',
    );
  });
});
