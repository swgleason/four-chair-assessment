export type SectionNumber = 1 | 2 | 3 | 4;
export type AnswerChoice =
  | "disagree"
  | "unsure"
  | "agree"
  | "weak"
  | "improving"
  | "strong";

export interface AssessmentQuestion {
  id: number;
  section: SectionNumber;
  text: string;
  choices: readonly AnswerChoice[];
}

export const SECTION_ONE_CHOICES: readonly AnswerChoice[] = [
  "disagree",
  "unsure",
  "agree",
];

export const GROWTH_SECTION_CHOICES: readonly AnswerChoice[] = [
  "weak",
  "improving",
  "strong",
];

export const ANSWER_LABELS: Record<AnswerChoice, string> = {
  disagree: "Disagree",
  unsure: "Unsure",
  agree: "Agree",
  weak: "Weak",
  improving: "Improving",
  strong: "Strong",
};

export const questions: readonly AssessmentQuestion[] = [
  {
    id: 1,
    section: 1,
    text: "I am confident that I will be with God in heaven after I die",
    choices: SECTION_ONE_CHOICES,
  },
  {
    id: 2,
    section: 1,
    text: "I could never be good enough to earn my way to heaven",
    choices: SECTION_ONE_CHOICES,
  },
  {
    id: 3,
    section: 1,
    text: "Religious acts like going to church, reading my bible, or following religious rules do not make me a Christian",
    choices: SECTION_ONE_CHOICES,
  },
  {
    id: 4,
    section: 1,
    text: "There is only one way to God and that is through faith in His Son, Jesus Christ.",
    choices: SECTION_ONE_CHOICES,
  },
  {
    // The owner confirmed this current app wording; do not reconcile it with the PRD.
    id: 5,
    section: 1,
    text: "I have put my faith in Christ’s death through repentance, His burial through baptism in Jesus name and His resurrection through the infilling of the Holy Ghost evidenced by speaking in tongues.",
    choices: SECTION_ONE_CHOICES,
  },
  {
    id: 6,
    section: 1,
    text: "My commitment to follow Christ is a response to God’s grace and the gift of salvation I’ve received.",
    choices: SECTION_ONE_CHOICES,
  },
  {
    id: 7,
    section: 1,
    text: "Those who don’t put their faith in Christ will be separated from God for eternity in hell.",
    choices: SECTION_ONE_CHOICES,
  },
  {
    id: 8,
    section: 2,
    text: "I am consistently developing the character of Christ (love, joy, peace, patience, kindness…Galatians 5:22-23).",
    choices: GROWTH_SECTION_CHOICES,
  },
  {
    id: 9,
    section: 2,
    text: "I am consistantly developing the priorities of Christ daily (Love God and Love People… Matthew 22:37-39).",
    choices: GROWTH_SECTION_CHOICES,
  },
  {
    id: 10,
    section: 2,
    text: "I am consistently putting Christ first in every area of my life (time, money, relationships).",
    choices: GROWTH_SECTION_CHOICES,
  },
  {
    id: 11,
    section: 2,
    text: "I am dependent on God’s Spirit for strength and direction in my everyday life.",
    choices: GROWTH_SECTION_CHOICES,
  },
  {
    id: 12,
    section: 2,
    text: "I spend time with God each day by reading His Word and talking to Him through prayer.",
    choices: GROWTH_SECTION_CHOICES,
  },
  {
    id: 13,
    section: 2,
    text: "I know my spiritual gifts and am actively using them in serving others.",
    choices: GROWTH_SECTION_CHOICES,
  },
  {
    id: 14,
    section: 2,
    text: "I am concerned for those who don’t know Jesus and want to share Him with them.",
    choices: GROWTH_SECTION_CHOICES,
  },
  {
    id: 15,
    section: 3,
    text: "I am pursuing relationships with spiritually lost people and praying for their salvation.",
    choices: GROWTH_SECTION_CHOICES,
  },
  {
    id: 16,
    section: 3,
    text: "I know how to communicate my salvation story well (my testimony).",
    choices: GROWTH_SECTION_CHOICES,
  },
  {
    id: 17,
    section: 3,
    text: "I know how to share the gospel message simply and clearly (in a few minutes).",
    choices: GROWTH_SECTION_CHOICES,
  },
  {
    id: 18,
    section: 3,
    text: "I am looking for and acting upon opportunities to share the gospel message verbally with spiritually lost people.",
    choices: GROWTH_SECTION_CHOICES,
  },
  {
    id: 19,
    section: 3,
    text: "I am pursuing discipling relationships with other believers and pray for their growth into Christlikeness.",
    choices: GROWTH_SECTION_CHOICES,
  },
  {
    id: 20,
    section: 3,
    text: "I know the basics from scripture what a new believer needs to understand to grow in their faith.",
    choices: GROWTH_SECTION_CHOICES,
  },
  {
    id: 21,
    section: 3,
    text: "I am consistently sharing what God is teaching me with others to encourage them in their faith.",
    choices: GROWTH_SECTION_CHOICES,
  },
  {
    id: 22,
    section: 4,
    text: "I have shown and continue to show others how to share their faith and they are actively putting it into practice.",
    choices: GROWTH_SECTION_CHOICES,
  },
  {
    id: 23,
    section: 4,
    text: "I am regularly meeting with at least one other believer to show them how to follow Christ.",
    choices: GROWTH_SECTION_CHOICES,
  },
  {
    id: 24,
    section: 4,
    text: "I am walking with others through the process of becoming a disciple who makes disciples.",
    choices: GROWTH_SECTION_CHOICES,
  },
  {
    id: 25,
    section: 4,
    text: "I model a disciple-making lifestyle that encourages and inspires others to make disciples.",
    choices: GROWTH_SECTION_CHOICES,
  },
  {
    id: 26,
    section: 4,
    text: "I prioritize my schedule to spend time with spiritually lost people and disciples believers.",
    choices: GROWTH_SECTION_CHOICES,
  },
  {
    // TODO(owner review): preserve this supplied wording until approved.
    id: 27,
    section: 4,
    text: "I have discipled someone I lead to Christ, and they are now disciplining someone they led to Christ.",
    choices: GROWTH_SECTION_CHOICES,
  },
  {
    id: 28,
    section: 4,
    text: "I initiate new relationships for the purpose of making disciples that will make disciples.",
    choices: GROWTH_SECTION_CHOICES,
  },
];
