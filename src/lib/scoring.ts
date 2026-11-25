import {
  GROWTH_SECTION_CHOICES,
  questions,
  SECTION_ONE_CHOICES,
  type AnswerChoice,
  type SectionNumber,
} from "../content/questions";
import { FOCUS_RESPONSES } from "../content/focusResponses";

export type ChairNumber = 1 | 2 | 3 | 4;

export interface SectionScore {
  section: SectionNumber;
  /** Sum of answer points for this section: 0 to 21 */
  score: number;
  /** Whether the section failed (S1: < 18, S2-4: < 14) */
  failed: boolean;
  /**
   * Compatibility alias for legacy consumers (21 - score)
   * Deprecated in favor of positive `score`.
   */
  failurePoints: number;
}

export type SectionRoute =
  | { type: "continue"; nextSection: SectionNumber; nextQuestion: number }
  | {
      type: "chair";
      chair: ChairNumber;
      chairScore: number;
      focusResponses: readonly string[];
    };

/**
 * Scoring answer point weights (0 / 2 / 3):
 * - 1st choice ("disagree" in S1; "weak" in S2-4) = 0 points
 * - 2nd choice ("unsure" in S1; "improving" in S2-4) = 2 points
 * - 3rd choice ("agree" in S1; "strong" in S2-4) = 3 points
 */
export const ANSWER_POINTS: Record<AnswerChoice, number> = {
  disagree: 0,
  unsure: 2,
  agree: 3,
  weak: 0,
  improving: 2,
  strong: 3,
};

/**
 * Passing thresholds per section:
 * - Section 1 requires score >= 18
 * - Sections 2-4 require score >= 14
 */
export const SECTION_PASS_THRESHOLDS: Record<SectionNumber, number> = {
  1: 18,
  2: 14,
  3: 14,
  4: 14,
};

export function getAnswerPoints(answer: AnswerChoice): number {
  return ANSWER_POINTS[answer];
}

/**
 * Computes the score for a single 7-question section (0 to 21).
 */
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

  const score = answers.reduce(
    (total, answer) => total + ANSWER_POINTS[answer],
    0,
  );

  const threshold = SECTION_PASS_THRESHOLDS[section];
  const failed = score < threshold;

  return {
    section,
    score,
    failed,
    // Compatibility shim: failurePoints where lower is better
    failurePoints: 21 - score,
  };
}

/**
 * Calculates the fractional chairScore following Sonlife rules:
 * - base = chair + (score / 21)
 * - if chair === 2 and score === 21 => 2.9
 * - if chair === 3 and score === 21 => 3.9
 * - round to 2 decimals (Number(val.toFixed(2)))
 * - if >= 5 => cap at 4.9
 */
export function calculateChairScore(chair: ChairNumber, score: number): number {
  let val = chair + score / 21;
  if (chair === 2 && score === 21) {
    val = 2.9;
  } else if (chair === 3 && score === 21) {
    val = 3.9;
  }

  let rounded = Number(val.toFixed(2));
  if (rounded >= 5) {
    rounded = 4.9;
  }
  return rounded;
}

/**
 * Collects focus responses from 0-point answers across all evaluated sections.
 *
 * Rules:
 * - Triggered ONLY by 0-point answers ("disagree" in S1, "weak" in S2-4).
 * - Process sections 1, 2, 3, 4 in order, questions in ascending ID order.
 * - S1 questions share a single paragraph, added only if list is empty.
 * - S2-4 questions add their focus response while list.length < 4 and not duplicate.
 * - Cap at 4 items total.
 * - Always computed cleanly from answers (no stale items).
 */
export function collectFocusResponses(
  answers: Partial<Record<number, AnswerChoice>>,
  maxSection: SectionNumber,
): string[] {
  const result: string[] = [];

  for (let s = 1; s <= maxSection; s++) {
    const sec = s as SectionNumber;
    const secQuestions = questions.filter((q) => q.section === sec);

    for (const q of secQuestions) {
      const ans = answers[q.id];
      if (!ans) continue;

      if (ANSWER_POINTS[ans] === 0) {
        const text = FOCUS_RESPONSES[q.id];
        if (!text) continue;

        if (sec === 1) {
          if (result.length === 0) {
            result.push(text);
          }
        } else {
          if (result.length < 4 && !result.includes(text)) {
            result.push(text);
          }
        }
      }
    }
  }

  return result;
}

export interface AssessmentEvaluationResult {
  completed: boolean;
  nextSection?: SectionNumber;
  nextQuestion?: number;
  chair?: ChairNumber;
  chairScore?: number;
  focusResponses: string[];
}

/**
 * Evaluates assessment progression at a section boundary (Q7, Q14, Q21, Q28).
 *
 * Implements Sonlife section thresholds and offsets:
 * - Section 1 (< 18) -> Chair 1 via S1 score
 * - Section 2 (< 14) -> Chair 2 via S2 score
 * - Section 3 (< 14) -> Chair 2 via Section 2 score (offset)
 * - Section 4 (< 14) -> Chair 3 via Section 3 score (offset)
 * - Section 4 (>= 14) -> Chair 4 via Section 4 score
 */
export function evaluateAssessmentSection(
  section: SectionNumber,
  answers: Partial<Record<number, AnswerChoice>>,
): AssessmentEvaluationResult {
  // Collect scores of all completed sections 1..section
  const sectionScores: Record<SectionNumber, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  };

  for (let s = 1; s <= section; s++) {
    const sec = s as SectionNumber;
    const secAnswers = questions
      .filter((q) => q.section === sec)
      .map((q) => {
        const ans = answers[q.id];
        if (!ans) {
          throw new RangeError(`Question ${q.id} has no saved answer.`);
        }
        return ans;
      });

    const evaluated = scoreSection(sec, secAnswers);
    sectionScores[sec] = evaluated.score;
  }

  const focusResponses = collectFocusResponses(answers, section);

  // Evaluate boundaries in sequence
  // Section 1
  if (section === 1) {
    if (sectionScores[1] < 18) {
      const chair: ChairNumber = 1;
      const chairScore = calculateChairScore(chair, sectionScores[1]);
      return { completed: true, chair, chairScore, focusResponses };
    }
    return {
      completed: false,
      nextSection: 2,
      nextQuestion: 8,
      focusResponses,
    };
  }

  // Section 2
  if (section === 2) {
    if (sectionScores[2] < 14) {
      const chair: ChairNumber = 2;
      const chairScore = calculateChairScore(chair, sectionScores[2]);
      return { completed: true, chair, chairScore, focusResponses };
    }
    return {
      completed: false,
      nextSection: 3,
      nextQuestion: 15,
      focusResponses,
    };
  }

  // Section 3
  if (section === 3) {
    if (sectionScores[3] < 14) {
      // Offset: Failing Section 3 sends user to Chair 2 using Section 2's score
      const chair: ChairNumber = 2;
      const chairScore = calculateChairScore(chair, sectionScores[2]);
      return { completed: true, chair, chairScore, focusResponses };
    }
    return {
      completed: false,
      nextSection: 4,
      nextQuestion: 22,
      focusResponses,
    };
  }

  // Section 4
  if (section === 4) {
    if (sectionScores[4] < 14) {
      // Offset: Failing Section 4 sends user to Chair 3 using Section 3's score
      const chair: ChairNumber = 3;
      const chairScore = calculateChairScore(chair, sectionScores[3]);
      return { completed: true, chair, chairScore, focusResponses };
    }
    // Section 4 passed -> Chair 4 using Section 4's score
    const chair: ChairNumber = 4;
    const chairScore = calculateChairScore(chair, sectionScores[4]);
    return { completed: true, chair, chairScore, focusResponses };
  }

  throw new Error(`Unexpected section: ${section}`);
}

/**
 * Legacy router shim for existing consumers.
 */
export function routeAfterSection(score: SectionScore): SectionRoute {
  if (score.failed || score.section === 4) {
    const chair = score.section as ChairNumber;
    const chairScore = calculateChairScore(chair, score.score);
    return {
      type: "chair",
      chair,
      chairScore,
      focusResponses: [],
    };
  }

  const nextSection = (score.section + 1) as SectionNumber;
  return {
    type: "continue",
    nextSection,
    nextQuestion: score.section * 7 + 1,
  };
}

/**
 * Calculates a progress percentage within the chair segment for UI display.
 */
export function failingSectionProgressPercent(failurePoints: number): number {
  const score = Math.max(0, Math.min(21, 21 - failurePoints));
  return Math.round((score / 21) * 1000) / 10;
}

/**
 * Compatibility helper for result progress percent.
 * Maps the fractional chair score or section score into a segment percentage (0-100).
 */
export function resultProgressPercent(
  chair: ChairNumber,
  answers: Partial<Record<number, AnswerChoice>>,
): number {
  // Find which section's score determines this chair placement
  // If user passed S4 -> section 4
  // If user failed S4 -> placed in Chair 3 via Section 3
  // If user failed S3 -> placed in Chair 2 via Section 2
  // Otherwise section === chair
  let scoringSection: SectionNumber = chair;
  const ans28 = answers[28];
  const ans21 = answers[21];

  if (chair === 3 && ans28 !== undefined) {
    scoringSection = 3;
  } else if (chair === 2 && ans21 !== undefined) {
    scoringSection = 2;
  }

  const sectionAnswers = questions
    .filter(({ section }) => section === scoringSection)
    .map(({ id }) => {
      const answer = answers[id];
      if (answer === undefined) {
        throw new RangeError(`Question ${id} has no saved answer.`);
      }
      return answer;
    });

  const sectionScore = scoreSection(scoringSection, sectionAnswers);
  return Math.round((sectionScore.score / 21) * 1000) / 10;
}
