import type { SectionNumber } from "./questions";

export interface FocusResponseDefinition {
  id: number; // Question number 1-28
  chair: SectionNumber; // 1 | 2 | 3 | 4
  triggerAnswer: "disagree" | "weak";
  text: string;
}

export const CHAIR_1_FOCUS_RESPONSE =
  "Continue to explore the life of Christ and His power to forgive sin, transform your life through the new birth, and give you eternal life. Ask questions and seek biblical answers. When you are ready, turn to Christ in repentance and faith, obey His Word in baptism in Jesus’ name for the remission of sins and receive the gift of the Holy Ghost. Through the new birth, God will forgive your sins, make you His child, and give you new life in Him (John 1:12; Romans 3:23; 6:23; John 3:3-5, 16; Acts 2:38).";

export const FOCUS_RESPONSES: Record<number, string> = {
  // Chair 1 (Questions 1-7) share identical paragraph
  1: CHAIR_1_FOCUS_RESPONSE,
  2: CHAIR_1_FOCUS_RESPONSE,
  3: CHAIR_1_FOCUS_RESPONSE,
  4: CHAIR_1_FOCUS_RESPONSE,
  5: CHAIR_1_FOCUS_RESPONSE,
  6: CHAIR_1_FOCUS_RESPONSE,
  7: CHAIR_1_FOCUS_RESPONSE,

  // Chair 2 (Questions 8-14)
  8: "Through prayer, acknowledge daily your dependence upon the Holy Spirit to develop the fruit of the Spirit in your life (Read Romans 8, Gal 5:22-25)",
  9: "Pray daily that the Lord would help you develop His priorities in your life.  (I John 2:6, Matt. 22:37-39)",
  10: 'Through prayer, ask God to take control of the areas of your life where you most often want to retain control.  (Pray through Romans 6-7...notice the term "yield" or "present" Rom 6:13, 16, 19)',
  11: "Ask Jesus to help you trust Him more and be your guide daily.  (Read and meditate upon Ps 25)",
  12: "Set a goal to spend time in God's Word and prayer each day.  (Read Ps 119 and list all the benefits of His Word)",
  13: "Take a spiritual gifts test and then find ways to use those gifts to serve others.  (I Cor 12, Romans 12)",
  14: "Ask God to give you His passion for the lost. (For the next 10 days, pray daily and specifically for your lost friends)",

  // Chair 3 (Questions 15-21)
  15: "Pray for God to show you who to begin praying for that does not know Christ.",
  16: "Take some time to write out your testimony and commit it to memory.  (Ask God for the chance to share it with someone this week)",
  17: "Write out how you would share the gospel. Once written, practice sharing it with someone this week.  (1 Cor 15:1-4, Acts 2:38)",
  18: "Pray today that God would open up opportunities for you to share the gospel.  (Col 4:2-6)",
  19: "Identify two younger believers that you can build a disciple-making relationship with to help them grow.",
  20: "Go through your Bible and identify the most important verses that you think a new believer needs to know to grow in their faith. Share these with a new believer. (2 Tim 2:2)",
  21: "Read in the Word each day until God shows you something new, try that day to share it with as many people as possible. (John 17:8)",

  // Chair 4 (Questions 22-28)
  22: "Look for ways to show others how to share their faith and help them to do so. (Matt 9:36-10:1)",
  23: "Ask God to show you who you should disciple and then begin to meet with them to help them grow in their faith. (2 Tim 2:2)",
  24: "Commit to finding opportunities to train others on how to be and build disciples as Jesus did.  (John 14:12, John 17)",
  25: "Pray that God would help you live a lifestyle of disciple-making.  Make a list of what needs to change in your life to do this better.",
  26: "Work on prioritizing your schedule to spend time with the spiritually lost and discipling new believers.  What needs to happen to be better at this?",
  27: "Pray that God would work through your disciples and they would lead others to Christ.  Ask God for spiritual grand-children!",
  28: "Pray that God would open doors and give you new relationships to make disciples.  (Matthew 28:16-20, John 15:16, John 16:24)",
};
