import {
  GROWTH_SECTION_CHOICES,
  SECTION_ONE_CHOICES,
  type AnswerChoice,
  type SectionNumber,
} from "../content/questions";

export type ChairNumber = 1 | 2 | 3 | 4;

export interface SectionScore {
  section: SectionNumber;
  failurePoints: number;
  failed: boolean;
}

export type SectionRoute =
  | { type: "continue"; nextSection: SectionNumber; nextQuestion: number }
  | { type: "chair"; chair: ChairNumber };

const FAILURE_POINTS: Record<AnswerChoice, number> = {
  disagree: 2,
  unsure: 1,
  agree: 0,
  weak: 2,
  improving: 1,
  strong: 0,
};

export function scoreSection(
  section: SectionNumber,
  answers: readonly AnswerChoice[],
): SectionScore {
  if (answers.length !== 7) {
    throw new RangeError(`Section ${section} requires exactly seven answers.`);
  }

  const allowedChoices =
    section === 1 ? SECTION_ONE_CHOICES : GROWTH_SECTION_CHOICES;
  if (answers.some((answer) => !allowedChoices.includes(answer))) {
    throw new TypeError(`Section ${section} received an invalid answer choice.`);
  }

  const failurePoints = answers.reduce(
    (total, answer) => total + FAILURE_POINTS[answer],
    0,
  );

  return {
    section,
    failurePoints,
    failed: failurePoints >= 4,
  };
}

export function routeAfterSection(score: SectionScore): SectionRoute {
  if (score.failed || score.section === 4) {
    return { type: "chair", chair: score.section };
  }

  const nextSection = (score.section + 1) as SectionNumber;
  return {
    type: "continue",
    nextSection,
    nextQuestion: score.section * 7 + 1,
  };
}
