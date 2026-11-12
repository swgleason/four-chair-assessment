import { describe, expect, it } from "vitest";
import { chairOne, chairs } from "./chairs";

describe("Chair 1 introduction", () => {
  it("renders the supplied introduction as three unchanged paragraphs", () => {
    expect(chairOne.explanationParagraphs).toHaveLength(3);
    expect(chairOne.explanationParagraphs).toEqual([
      "I want to thank you for taking the assessment. As a chair one person, I'm genuinely excited for you. I want to give you the same challenge Jesus gave to this initial disciple.",
      "He said, come and see, see that I am the way. See that I am the truth. See that I am the light. (John 14:6)",
      "I really want to encourage you to continue to investigate the faith, and your next step is to ask questions, talk with people, discover how you can know God in a very personal way.",
    ]);
  });

  it("provides all four supplied chair pages without inventing Chair 4 focus items", () => {
    expect(Object.keys(chairs)).toEqual(["1", "2", "3", "4"]);
    expect(Object.values(chairs).map(({ heading }) => heading)).toEqual([
      "What does it mean to be in Chair 1?",
      "What does it mean to be in Chair 2?",
      "What does it mean to be in Chair 3?",
      "What does it mean to be in Chair 4?",
    ]);
    expect(chairs[4].focusHeading).toBeUndefined();
    expect(chairs[4].focusItems).toBeUndefined();
  });
});
