import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ChairScreen } from "./ChairScreen";
import type { ChairLinkItem } from "../types/chairLinks";
import { getDefaultLinksForChair } from "../content/defaultChairLinks";

function renderChair(
  chair: 1 | 2 | 3 | 4,
  segmentProgressPercent: number,
  initialLinks?: readonly ChairLinkItem[],
  disableNextStepsForm?: boolean,
) {
  return renderToStaticMarkup(
    <ChairScreen
      chair={chair}
      segmentProgressPercent={segmentProgressPercent}
      notice=""
      onStartOver={vi.fn()}
      initialLinks={initialLinks}
      disableNextStepsForm={disableNextStepsForm}
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
    expect(chairFourMarkup).toContain(
      "Spiritual growth and disciple-making continue.",
    );
    expect(chairFourMarkup).toContain(
      '<span aria-hidden="true" class="chair-progress-segment is-current" style="left:87.5%;width:12.5%"><span class="chair-progress-segment-fill" style="width:100%"></span></span>',
    );
    expect(chairFourMarkup).toContain(
      '<span class="chair-growth-arrow" aria-hidden="true">→</span>',
    );
  });
});

describe("ChairScreen links sections", () => {
  it("renders both 'Small Groups to Join' and 'Recommended Resources' with titles, descriptions, hrefs, and secure target", () => {
    const testLinks: ChairLinkItem[] = [
      {
        id: "custom-group-1",
        chair: 2,
        category: "group",
        title: "Wednesday Night Community",
        description: "Weekly dinner and study of Romans.",
        url: "https://example.com/wednesday",
        sortOrder: 0,
        isActive: true,
      },
      {
        id: "custom-resource-1",
        chair: 2,
        category: "resource",
        title: "Daily Prayer Guide PDF",
        description: "Guided daily prayers for growing in Christ.",
        url: "https://example.com/prayer.pdf",
        sortOrder: 1,
        isActive: true,
      },
    ];

    const markup = renderChair(2, 50, testLinks);

    // Section headings
    expect(markup).toContain("Small Groups to Join");
    expect(markup).toContain("Recommended Resources");
    expect(markup).toContain('id="chair-groups-heading"');
    expect(markup).toContain('id="chair-resources-heading"');

    // Group item details
    expect(markup).toContain("Wednesday Night Community");
    expect(markup).toContain("Weekly dinner and study of Romans.");
    expect(markup).toContain('href="https://example.com/wednesday"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');

    // Resource item details
    expect(markup).toContain("Daily Prayer Guide PDF");
    expect(markup).toContain("Guided daily prayers for growing in Christ.");
    expect(markup).toContain('href="https://example.com/prayer.pdf"');
  });

  it("omits 'Small Groups to Join' when no group items exist", () => {
    const resourceOnly: ChairLinkItem[] = [
      {
        id: "res-only",
        chair: 3,
        category: "resource",
        title: "Outreach Scripture Cards",
        description: "Pocket scripture cards for personal evangelism.",
        url: "https://example.com/cards",
        sortOrder: 0,
        isActive: true,
      },
    ];

    const markup = renderChair(3, 40, resourceOnly);

    expect(markup).not.toContain("Small Groups to Join");
    expect(markup).not.toContain("chair-groups-heading");
    expect(markup).toContain("Recommended Resources");
    expect(markup).toContain("Outreach Scripture Cards");
  });

  it("omits 'Recommended Resources' when no resource items exist", () => {
    const groupOnly: ChairLinkItem[] = [
      {
        id: "group-only",
        chair: 1,
        category: "group",
        title: "Alpha Gathering",
        description: "Weekly seeker discussion group.",
        url: "https://example.com/alpha",
        sortOrder: 0,
        isActive: true,
      },
    ];

    const markup = renderChair(1, 10, groupOnly);

    expect(markup).toContain("Small Groups to Join");
    expect(markup).toContain("Alpha Gathering");
    expect(markup).not.toContain("Recommended Resources");
    expect(markup).not.toContain("chair-resources-heading");
  });

  it("omits both link sections when initialLinks is empty array", () => {
    const markup = renderChair(4, 100, []);

    expect(markup).not.toContain("Small Groups to Join");
    expect(markup).not.toContain("Recommended Resources");
    expect(markup).not.toContain("chair-links-section");
  });

  it("renders default fallback links when initialLinks is omitted during static rendering", () => {
    const defaultLinksChair1 = getDefaultLinksForChair(1);
    const markup = renderChair(1, 0);

    expect(markup).toContain("Small Groups to Join");
    expect(markup).toContain("Recommended Resources");

    for (const link of defaultLinksChair1) {
      expect(markup).toContain(link.title);
      expect(markup).toContain(link.description);
      expect(markup).toContain(`href="${link.url}"`);
    }
  });
});

describe("ChairScreen Next-Steps Outreach Section", () => {
  it("renders 'Connect About Your Next Steps' outreach form by default", () => {
    const markup = renderChair(2, 50);

    expect(markup).toContain("Connect About Your Next Steps");
    expect(markup).toContain("Your Name");
    expect(markup).toContain("Your Email");
    expect(markup).toContain("What Next Steps or Questions Would You Like to Share?");
    expect(markup).toContain("Send Next Steps Request");
    expect(markup).toContain('name="website"'); // Honeypot exists
  });

  it("omits 'Connect About Your Next Steps' when disableNextStepsForm is true", () => {
    const markup = renderChair(2, 50, undefined, true);

    expect(markup).not.toContain("Connect About Your Next Steps");
    expect(markup).not.toContain("Send Next Steps Request");
  });
});
