import {
  GROWTH_SECTION_CHOICES,
  questions,
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

const MAX_SECTION_FAILURE_POINTS = 14;
const SECTION_FAILURE_THRESHOLD = 4;

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
    failed: failurePoints >= SECTION_FAILURE_THRESHOLD,
  };
}

export function failingSectionProgressPercent(failurePoints: number): number {
  if (
    !Number.isInteger(failurePoints) ||
    failurePoints < SECTION_FAILURE_THRESHOLD ||
    failurePoints > MAX_SECTION_FAILURE_POINTS
  ) {
    throw new RangeError("A failed section must have 4 to 14 failure points.");
  }

  return Math.round(
    ((MAX_SECTION_FAILURE_POINTS - failurePoints) /
      (MAX_SECTION_FAILURE_POINTS - SECTION_FAILURE_THRESHOLD)) *
      950,
  ) / 10;
}

export function resultProgressPercent(
  chair: ChairNumber,
  answers: Partial<Record<number, AnswerChoice>>,
): number {
  const sectionAnswers = questions
    .filter(({ section }) => section === chair)
    .map(({ id }) => {
      const answer = answers[id];
      if (answer === undefined) {
        throw new RangeError(`Question ${id} has no saved answer.`);
      }
      return answer;
    });
  const sectionScore = scoreSection(chair, sectionAnswers);

  if (chair === 4 && !sectionScore.failed) return 100;
  return failingSectionProgressPercent(sectionScore.failurePoints);
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
