import type { ChairNumber } from "../lib/scoring";

export interface ChairContent {
  heading: string;
  explanationParagraphs: readonly string[];
  focusHeading?: string;
  focusItems?: readonly string[];
}

export const chairs: Record<ChairNumber, ChairContent> = {
  1: {
    heading: "What does it mean to be in Chair 1?",
    explanationParagraphs: [
      "I want to thank you for taking the assessment. As a chair one person, I'm genuinely excited for you. I want to give you the same challenge Jesus gave to this initial disciple.",
      "He said, come and see, see that I am the way. See that I am the truth. See that I am the light. (John 14:6)",
      "I really want to encourage you to continue to investigate the faith, and your next step is to ask questions, talk with people, discover how you can know God in a very personal way.",
    ],
    focusHeading: "Where should I focus?",
    focusItems: [
      "Continue to explore the Life of Christ and His remarkable claims of forgiveness, a new nature, and eternal ife. Ask questions and seek biblical answers. When ready, turn to Christ in prayer-inviting Him to take control of your life and cleanse you of your sin, making you His child. (John 1:12, Rom 3:23, 6:23, John 3:16, Rom 10:13)",
    ],
  },
  2: {
    heading: "What does it mean to be in Chair 2?",
    explanationParagraphs: [
      "I want to thank you for taking the assessment. As a chair 2 believer, you have come to know Christ in a personal way. And your next step is to really clearly understand your identity in Christ. The Bible tells us over 30 things happened to you the moment you trusted Christ. You didn't understand whose you are. Secondly, you need to really learn to feed yourself, to feed yourself God's word, to understand what it says, what it means, and how you apply it to your life. You'll also need in that process to learn to talk with God and establish that relationship. to live a cleanse life. These are truths that are next step for you.",
    ],
    focusHeading: "Where should I focus?",
    focusItems: [
      "Though prayer, acknowledge daily your dependence upon the Holy Spirit to develop the fruit of the Spirit in your life (Read Romans 8, Gal 5:22-25)",
      "Pray daily that the Lord would help you develop His priorities in your life. (I John 2:6, Matt. 22:37-39)",
      "Through prayer, ask God to take control of the areas of your life where you most often want to retain control. (Pray through Romans 6-7...notice the term \"yield\" or \"present\" Rom:6:13, 16, 19",
      "Ask Jesus to help you trust Him more and be your guide daily. (Read and meditate upon Ps 25)",
    ],
  },
  3: {
    heading: "What does it mean to be in Chair 3?",
    explanationParagraphs: [
      "I want to thank you for taking the assessment tool. As a chair three believer, the Bible would describe you as a worker, someone engaged in the work of ministry. You've grown, you've been rooted, and established in your faith, and now you're beginning to be really others oriented. You're concerned about the needs of others. You're concerned about your friends who don't know Jesus. They're two next steps for you, for my perspective, and that is how to care for new believers and then how to share with unbelievers. Your next step is to be used by God to see your friends come to Christ.",
    ],
    focusHeading: "Where should I focus?",
    focusItems: [
      "Look for ways to show others how to share their faith and help them to do so. (Matt 9:36-10:1)",
      "Ask God to show you who you should disciple and then begin to meet with them to help them grow in their faith. (2 Tim 2:2)",
      "Commit to finding opportunities to train others on how to be and build disciples as Jesus did. (John 14:12, John 17)",
      "Pray that God would help you live a lifestyle of disciple-making. Make of list of what needs to change in your life to do this better.",
    ],
  },
  4: {
    heading: "What does it mean to be in Chair 4?",
    explanationParagraphs: [
      "I want to thank you for taking this assessment. As a chair for Christ Follower, God's used you in your life. You've been rooted in establishing your faith. You've been equipped to care for new believers and to share with unbelievers. And sure, there are more things you would continually learn in those areas, but you've seen people come to faith in Christ, and your spiritual parent, or maybe even a grandparent. Your next step will be to care for the family that God's entrusted to you, to become not only a parent, but a spiritual grandparent and great grandparent. to create a movement of multiplying disciples.",
    ],
  },
};

export const chairOne = chairs[1];
