import { describe, expect, it } from "vitest";
import {
  type AnswerChoice,
  type SectionNumber,
} from "../content/questions";
import {
  CHAIR_1_FAITH_FOCUS_RESPONSE,
  CHAIR_1_NEW_BIRTH_FOCUS_RESPONSE,
} from "../content/focusResponses";
import {
  ANSWER_POINTS,
  calculateChairScore,
  collectFocusResponses,
  evaluateAssessmentSection,
  scoreSection,
  SECTION_PASS_THRESHOLDS,
} from "./scoring";

function allAnswers(_section: SectionNumber, choice: AnswerChoice): AnswerChoice[] {
  return Array(7).fill(choice);
}

describe("Point values and section thresholds", () => {
  it("assigns exact points (0 / 2 / 3)", () => {
    expect(ANSWER_POINTS.disagree).toBe(0);
    expect(ANSWER_POINTS.unsure).toBe(2);
    expect(ANSWER_POINTS.agree).toBe(3);
    expect(ANSWER_POINTS.weak).toBe(0);
    expect(ANSWER_POINTS.improving).toBe(2);
    expect(ANSWER_POINTS.strong).toBe(3);
  });

  it("scores 7 highest answers as 21 points", () => {
    expect(scoreSection(1, allAnswers(1, "agree")).score).toBe(21);
    expect(scoreSection(2, allAnswers(2, "strong")).score).toBe(21);
    expect(scoreSection(3, allAnswers(3, "strong")).score).toBe(21);
    expect(scoreSection(4, allAnswers(4, "strong")).score).toBe(21);
  });

  it("scores 7 lowest answers as 0 points", () => {
    expect(scoreSection(1, allAnswers(1, "disagree")).score).toBe(0);
    expect(scoreSection(2, allAnswers(2, "weak")).score).toBe(0);
  });

  it("scores 7 middle answers as 14 points", () => {
    expect(scoreSection(1, allAnswers(1, "unsure")).score).toBe(14);
    expect(scoreSection(2, allAnswers(2, "improving")).score).toBe(14);
  });

  it("checks Section 1 pass threshold (>= 18)", () => {
    expect(SECTION_PASS_THRESHOLDS[1]).toBe(18);
    // 7 Agree = 21 -> pass
    expect(scoreSection(1, allAnswers(1, "agree")).failed).toBe(false);
    // 6 Agree (18) + 1 Disagree (0) = 18 -> pass
    expect(scoreSection(1, ["agree", "agree", "agree", "agree", "agree", "agree", "disagree"]).failed).toBe(false);
    // 4 Agree (12) + 3 Unsure (6) = 18 -> pass
    expect(scoreSection(1, ["agree", "agree", "agree", "agree", "unsure", "unsure", "unsure"]).failed).toBe(false);
    // 5 Agree (15) + 1 Unsure (2) + 1 Disagree (0) = 17 -> fail
    expect(scoreSection(1, ["agree", "agree", "agree", "agree", "agree", "unsure", "disagree"]).failed).toBe(true);
    // 7 Unsure = 14 -> fail
    expect(scoreSection(1, allAnswers(1, "unsure")).failed).toBe(true);
  });

  it("checks Sections 2-4 pass threshold (>= 14)", () => {
    for (const sec of [2, 3, 4] as const) {
      expect(SECTION_PASS_THRESHOLDS[sec]).toBe(14);
      // All Improving (7 * 2 = 14) passes
      expect(scoreSection(sec, allAnswers(sec, "improving")).failed).toBe(false);
      // 2 Strong (6) + 4 Improving (8) + 1 Weak (0) = 14 passes
      expect(scoreSection(sec, ["strong", "strong", "improving", "improving", "improving", "improving", "weak"]).failed).toBe(false);
      // 6 Improving (12) + 1 Weak (0) = 12 fails
      expect(scoreSection(sec, ["improving", "improving", "improving", "improving", "improving", "improving", "weak"]).failed).toBe(true);
    }
  });
});

describe("fractional chairScore calculations, caps, and special cases", () => {
  it("calculates basic fractional chairScore", () => {
    // Chair 1, score 0 -> 1.0
    expect(calculateChairScore(1, 0)).toBe(1.0);
    // Chair 1, score 14 -> 1 + 14/21 = 1 + 0.6666... -> 1.67
    expect(calculateChairScore(1, 14)).toBe(1.67);
    // Chair 1, score 17 -> 1 + 17/21 = 1 + 0.8095... -> 1.81
    expect(calculateChairScore(1, 17)).toBe(1.81);
  });

  it("applies special case: score 21 in Chair 2 is 2.9 (not 3.0)", () => {
    expect(calculateChairScore(2, 21)).toBe(2.9);
  });

  it("applies special case: score 21 in Chair 3 is 3.9 (not 4.0)", () => {
    expect(calculateChairScore(3, 21)).toBe(3.9);
  });

  it("caps score >= 5 at 4.9 (Chair 4 with 21)", () => {
    expect(calculateChairScore(4, 21)).toBe(4.9);
  });

  it("rounds properly to 2 decimals for non-special cases", () => {
    // Chair 4, score 14 -> 4 + 14/21 = 4.67
    expect(calculateChairScore(4, 14)).toBe(4.67);
    // Chair 4, score 20 -> 4 + 20/21 = 4.95
    expect(calculateChairScore(4, 20)).toBe(4.95);
  });
});

describe("Scoring section routing and offsets", () => {
  it("fails Section 1 (< 18) -> Chair 1", () => {
    const answers: Partial<Record<number, AnswerChoice>> = {};
    for (let i = 1; i <= 7; i++) answers[i] = "unsure"; // 14 < 18
    const result = evaluateAssessmentSection(1, answers);

    expect(result.completed).toBe(true);
    expect(result.chair).toBe(1);
    expect(result.chairScore).toBe(1.67);
  });

  it("passes Section 1 (>= 18) -> continues to Section 2", () => {
    const answers: Partial<Record<number, AnswerChoice>> = {};
    for (let i = 1; i <= 7; i++) answers[i] = "agree"; // 21
    const result = evaluateAssessmentSection(1, answers);

    expect(result.completed).toBe(false);
    expect(result.nextSection).toBe(2);
    expect(result.nextQuestion).toBe(8);
  });

  it("passes Section 1 and fails Section 2 (< 14) -> Chair 2 using Section 2 score", () => {
    const answers: Partial<Record<number, AnswerChoice>> = {};
    for (let i = 1; i <= 7; i++) answers[i] = "agree"; // 21
    for (let i = 8; i <= 14; i++) answers[i] = i <= 10 ? "weak" : "improving"; // 3*0 + 4*2 = 8 (< 14)
    const result = evaluateAssessmentSection(2, answers);

    expect(result.completed).toBe(true);
    expect(result.chair).toBe(2);
    expect(result.chairScore).toBe(calculateChairScore(2, 8)); // 2 + 8/21 = 2.38
  });

  it("passes Section 1 & 2, fails Section 3 (< 14) -> Chair 2 using Section 2's score (OFFSET)", () => {
    const answers: Partial<Record<number, AnswerChoice>> = {};
    for (let i = 1; i <= 7; i++) answers[i] = "agree"; // S1 = 21
    // S2 = 6 Strong (18) + 1 Weak (0) = 18 (passed)
    for (let i = 8; i <= 13; i++) answers[i] = "strong";
    answers[14] = "weak";
    // S3 = 4 Weak (0) + 3 Improving (6) = 6 (< 14, failed)
    for (let i = 15; i <= 18; i++) answers[i] = "weak";
    for (let i = 19; i <= 21; i++) answers[i] = "improving";

    const result = evaluateAssessmentSection(3, answers);
    expect(result.completed).toBe(true);
    // OFFSET: Placed in Chair 2, score comes from Section 2 (18)
    expect(result.chair).toBe(2);
    expect(result.chairScore).toBe(calculateChairScore(2, 18)); // 2 + 18/21 = 2.86
  });

  it("passes Section 1, 2, 3, fails Section 4 (< 14) -> Chair 3 using Section 3's score (OFFSET)", () => {
    const answers: Partial<Record<number, AnswerChoice>> = {};
    for (let i = 1; i <= 7; i++) answers[i] = "agree"; // S1 = 21
    for (let i = 8; i <= 14; i++) answers[i] = "strong"; // S2 = 21
    // S3 = 5 Strong (15) + 2 Improving (4) = 19 (passed)
    for (let i = 15; i <= 19; i++) answers[i] = "strong";
    for (let i = 20; i <= 21; i++) answers[i] = "improving";
    // S4 = 5 Weak (0) + 2 Improving (4) = 4 (< 14, failed)
    for (let i = 22; i <= 26; i++) answers[i] = "weak";
    for (let i = 27; i <= 28; i++) answers[i] = "improving";

    const result = evaluateAssessmentSection(4, answers);
    expect(result.completed).toBe(true);
    // OFFSET: Placed in Chair 3, score comes from Section 3 (19)
    expect(result.chair).toBe(3);
    expect(result.chairScore).toBe(calculateChairScore(3, 19)); // 3 + 19/21 = 3.90
  });

  it("passes Section 1, 2, 3, 4 (>= 14) -> Chair 4 using Section 4 score", () => {
    const answers: Partial<Record<number, AnswerChoice>> = {};
    for (let i = 1; i <= 7; i++) answers[i] = "agree"; // S1 = 21
    for (let i = 8; i <= 14; i++) answers[i] = "improving"; // S2 = 14
    for (let i = 15; i <= 21; i++) answers[i] = "improving"; // S3 = 14
    for (let i = 22; i <= 28; i++) answers[i] = "improving"; // S4 = 14

    const result = evaluateAssessmentSection(4, answers);
    expect(result.completed).toBe(true);
    expect(result.chair).toBe(4);
    expect(result.chairScore).toBe(calculateChairScore(4, 14)); // 4.67
  });
});

describe("focusResponses collection and worked examples from Focus Response Script.csv", () => {
  it("preserves the exact Section 1 response texts", () => {
    expect(CHAIR_1_NEW_BIRTH_FOCUS_RESPONSE).toBe(
      "Continue to explore the life of Christ and His power to forgive sin, transform your life through the new birth, and give you eternal life. Ask questions and seek biblical answers. When you are ready, turn to Christ in repentance and faith, obey His Word in baptism in Jesus’ name for the remission of sins and receive the gift of the Holy Ghost. Through the new birth, God will forgive your sins, make you His child, and give you new life in Him (John 1:12; Romans 3:23; 6:23; John 3:3-5, 16; Acts 2:38).",
    );
    expect(CHAIR_1_FAITH_FOCUS_RESPONSE).toBe(
      "Continue to explore the life of Christ and His remarkable claims of forgiveness, a new nature, and eternal life. Ask questions and seek biblical answers. When ready, turn to Christ in prayer, inviting Him to take control of your life. (1 John 5:13, Romans  3:23, 6:23, Galatians 2:16, John 14:6, Ephesians 2:10)",
    );
  });

  it("Worked Example E1: All Unsure in Section 1 produces empty focus list", () => {
    const answers: Partial<Record<number, AnswerChoice>> = {};
    for (let i = 1; i <= 7; i++) answers[i] = "unsure";
    const focus = collectFocusResponses(answers, 1);
    expect(focus).toEqual([]);
  });

  it.each([1, 2, 3, 4, 6, 7] as const)(
    "uses the faith response for a disagreement on Section 1 question %i",
    (questionId) => {
      const answers: Partial<Record<number, AnswerChoice>> = {
        [questionId]: "disagree",
      };

      expect(collectFocusResponses(answers, 1)).toEqual([
        CHAIR_1_FAITH_FOCUS_RESPONSE,
      ]);
    },
  );

  it("uses only the new birth response when question 5 is disagreed with", () => {
    expect(collectFocusResponses({ 5: "disagree" }, 1)).toEqual([
      CHAIR_1_NEW_BIRTH_FOCUS_RESPONSE,
    ]);
  });

  it("prioritizes the new birth response when question 5 and other Section 1 questions are disagreed with", () => {
    const answers: Partial<Record<number, AnswerChoice>> = {};
    for (let questionId = 1; questionId <= 7; questionId++) {
      answers[questionId] = "disagree";
    }

    expect(collectFocusResponses(answers, 1)).toEqual([
      CHAIR_1_NEW_BIRTH_FOCUS_RESPONSE,
    ]);
  });

  it("Worked Example E2: S1 (6 Agree + 1 Disagree), S2 (Q9, Q12 Weak, rest Strong), S3 (Q15, Q16, Q17 Weak, rest Strong)", () => {
    const answers: Partial<Record<number, AnswerChoice>> = {};
    // S1: 6 Agree + 1 Disagree on Q7 (score 18)
    for (let i = 1; i <= 6; i++) answers[i] = "agree";
    answers[7] = "disagree";
    // S2: Q9, Q12 Weak, rest Strong (score 15)
    for (let i = 8; i <= 14; i++) answers[i] = "strong";
    answers[9] = "weak";
    answers[12] = "weak";
    // S3: Q15, Q16, Q17 Weak, rest Strong (score 12)
    for (let i = 15; i <= 21; i++) answers[i] = "strong";
    answers[15] = "weak";
    answers[16] = "weak";
    answers[17] = "weak";

    const focus = collectFocusResponses(answers, 3);
    // Cap is 4 items: Chair 1 paragraph, Q9, Q12, Q15. Q16 and Q17 crowded out!
    expect(focus.length).toBe(4);
    expect(focus[0]).toBe(CHAIR_1_FAITH_FOCUS_RESPONSE);
    expect(focus[1]).toContain("Pray daily that the Lord would help you develop His priorities"); // Q9
    expect(focus[2]).toContain("Set a goal to spend time in God's Word"); // Q12
    expect(focus[3]).toContain("Pray for God to show you who to begin praying for that does not know Christ."); // Q15
  });

  it("Worked Example E4: S1 all Agree, S2, S3, S4 all Improving produces empty focus list", () => {
    const answers: Partial<Record<number, AnswerChoice>> = {};
    for (let i = 1; i <= 7; i++) answers[i] = "agree";
    for (let i = 8; i <= 28; i++) answers[i] = "improving";

    const focus = collectFocusResponses(answers, 4);
    expect(focus).toEqual([]);
  });
});
