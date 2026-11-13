import type { ChairNumber } from "../lib/scoring";

export interface ChairContent {
  heading: string;
  stageLabel: string;
  explanationParagraphs: readonly string[];
  focusHeading?: string;
  focusItems?: readonly string[];
  growthNote?: string;
}

export const chairs: Record<ChairNumber, ChairContent> = {
  1: {
    heading: "What does it mean to be in Chair 1?",
    stageLabel: "The Seeker",
    explanationParagraphs: [
      "I want to thank you for taking the assessment. As a Chair 1 person, I'm genuinely excited for you. I want to give you the same challenge Jesus gave to this initial disciple.",
      "He said, come and see. See that I am the way. See that I am the truth. See that I am the light (John 14:6).",
      "I really want to encourage you to continue to investigate the faith, and your next step is to ask questions, talk with people, discover how you can know God in a very personal way.",
    ],
    focusHeading: "Where should I focus?",
    focusItems: [
      "Continue to explore the Life of Christ and His power to forgive sin, transform your life through the new birth, and give you eternal life. Ask questions and seek biblical answers. When you are ready turn to Christ in repentance and faith, obey His Word in baptism in Jesus’ name for the remission of sins and receive the gift of the Holy Ghost. Through the new birth, God will forgive your sins, make you His child, and give you new life in Him (John 1:12; Romans 3:23; 6:23; John 3:3–5, 16; Acts 2:38).",
    ],
  },
  2: {
    heading: "What does it mean to be in Chair 2?",
    stageLabel: "The Believer",
    explanationParagraphs: [
      "I want to thank you for taking the assessment. As a Chair 2 believer, you have come to know Christ in a personal way. And your next step is to really clearly understand your identity in Christ. You need to understand whose you are.",
      "Secondly, you need to really learn to feed yourself, to feed yourself God's word, to understand what it says, what it means, and how you apply it to your life.",
      "You'll also need to learn to talk with God and establish that relationship and to live a cleansed life. These are truths that are the next step for you.",
    ],
    focusHeading: "Where should I focus?",
    focusItems: [
      "Through prayer, acknowledge daily your dependence upon the Holy Spirit to develop the fruit of the Spirit in your life (Read Romans 8, Gal 5:22-25).",
      "Pray daily that the Lord would help you develop His priorities in your life (I John 2:6, Matt. 22:37-39).",
      "Through prayer, ask God to take control of the areas of your life where you most often want to retain control (Pray through Romans 6-7...notice the term \"yield\" or \"present\" Rom 6:13, 16, 19).",
      "Ask Jesus to help you trust Him more and be your guide daily (Read and meditate upon Ps 25).",
    ],
  },
  3: {
    heading: "What does it mean to be in Chair 3?",
    stageLabel: "The Worker",
    explanationParagraphs: [
      "I want to thank you for taking the assessment tool. As a Chair 3 believer, the Bible would describe you as a worker, someone engaged in the work of ministry. You've grown, you've been rooted, and established in your faith, and now you're beginning to be really others-oriented.",
      "You're concerned about the needs of others. You're concerned about your friends who don't know Jesus. There are two next steps for you and that is how to care for new believers and then how to share with unbelievers.",
      "Your next step is to be used by God to see your friends come to Christ.",
    ],
    focusHeading: "Where should I focus?",
    focusItems: [
      "Look for ways to show others how to share their faith and help them to do so (Matt 9:36-10:1).",
      "Ask God to show you who you should disciple and then begin to meet with them to help them grow in their faith (2 Tim 2:2).",
      "Commit to finding opportunities to train others on how to be and build disciples as Jesus did (John 14:12, John 17).",
      "Pray that God would help you live a lifestyle of disciple-making. Make of list of what needs to change in your life to do this better.",
    ],
  },
  4: {
    heading: "What does it mean to be in Chair 4?",
    stageLabel: "Disciple-Maker",
    growthNote: "Spiritual growth and disciple-making continue.",
    explanationParagraphs: [
      "I want to thank you for taking this assessment. As a Chair 4 Christ Follower, God's used you in your life. You've been rooted in establishing your faith.",
      "You've been equipped to care for new believers and to share with unbelievers. And sure, there are more things you will continually learn in those areas, but you've seen people come to faith in Christ, and your spiritual parent, or maybe even a grandparent. Your next step will be to care for the family that God's entrusted to you, to become not only a parent, but a spiritual grandparent and great-grandparent, to create a movement of multiplying disciples.",
    ],
  },
};

export const chairOne = chairs[1];
