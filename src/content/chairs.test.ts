import { describe, expect, it } from "vitest";
import { chairOne, chairs } from "./chairs";

describe("Chair 1 introduction", () => {
  it("renders the supplied introduction as three unchanged paragraphs", () => {
    expect(chairOne.explanationParagraphs).toHaveLength(3);
    expect(chairOne.explanationParagraphs).toEqual([
      "I want to thank you for taking the assessment. As a Chair 1 person, I'm genuinely excited for you. I want to give you the same challenge Jesus gave to this initial disciple.",
      "He said, come and see. See that I am the way. See that I am the truth. See that I am the light (John 14:6).",
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
    expect(Object.values(chairs).map(({ stageLabel }) => stageLabel)).toEqual([
      "The Seeker",
      "The Believer",
      "The Worker",
      "Disciple-Maker",
    ]);
    expect(chairs[4].focusHeading).toBeUndefined();
    expect(chairs[4].focusItems).toBeUndefined();
    expect(chairs[4].growthNote).toBe(
      "Spiritual growth and disciple-making continue.",
    );
  });

  it("preserves the supplied paragraph breaks for Chairs 2, 3, and 4", () => {
    expect(chairs[2].explanationParagraphs).toEqual([
      "I want to thank you for taking the assessment. As a Chair 2 believer, you have come to know Christ in a personal way. And your next step is to really clearly understand your identity in Christ. You need to understand whose you are.",
      "Secondly, you need to really learn to feed yourself, to feed yourself God's word, to understand what it says, what it means, and how you apply it to your life.",
      "You'll also need to learn to talk with God and establish that relationship and to live a cleansed life. These are truths that are the next step for you.",
    ]);
    expect(chairs[3].explanationParagraphs).toEqual([
      "I want to thank you for taking the assessment tool. As a Chair 3 believer, the Bible would describe you as a worker, someone engaged in the work of ministry. You've grown, you've been rooted, and established in your faith, and now you're beginning to be really others-oriented.",
      "You're concerned about the needs of others. You're concerned about your friends who don't know Jesus. There are two next steps for you and that is how to care for new believers and then how to share with unbelievers.",
      "Your next step is to be used by God to see your friends come to Christ.",
    ]);
    expect(chairs[4].explanationParagraphs).toEqual([
      "I want to thank you for taking this assessment. As a Chair 4 Christ Follower, God's used you in your life. You've been rooted in establishing your faith.",
      "You've been equipped to care for new believers and to share with unbelievers. And sure, there are more things you will continually learn in those areas, but you've seen people come to faith in Christ, and your spiritual parent, or maybe even a grandparent. Your next step will be to care for the family that God's entrusted to you, to become not only a parent, but a spiritual grandparent and great-grandparent, to create a movement of multiplying disciples.",
    ]);
  });
});
