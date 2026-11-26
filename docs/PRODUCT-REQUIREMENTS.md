# Product Requirements Document — OCUPC Four Chair Assessment

## 1. Product summary

Create a mobile-first, responsive web application for Oregon City United Pentecostal Church (OCUPC). Participants use their own phones, tablets, or computers to complete a 28-question spiritual assessment. The assessment is divided into four seven-question sections. At the end of each section, a weighted score determines whether the participant continues or is directed to the corresponding Chair landing page.

The app should feel like a welcoming spiritual growth tool, not an exam.

## 2. Primary goals

1. Present all 28 assessment statements and their correct answer choices.
2. Divide the assessment into four clearly identified sections of seven questions.
3. Calculate each section independently using the specified weighted scoring.
4. Stop after the first failed section and show its matching Chair page.
5. If all four sections are passed, show Chair 4.
6. Save progress automatically so a participant can resume on the same device and browser.
7. Work well on mobile, tablet, and desktop.
8. Match OCUPC's branding as closely as can be verified from https://ocupc.com/.

## 3. Out of scope for first release

- User accounts or passwords
- Email-based recovery
- Cross-device synchronization
- Server-side database
- Admin dashboard or pastoral reporting
- Analytics or tracking
- Public deployment or custom-domain configuration

## 4. Participant experience

### Welcome screen

- App title: “Four Chair Assessment”
- Short, warm introduction explaining that the assessment is a tool for reflection and identifying next steps.
- Explain that answers are saved in this browser on this device.
- Primary action: “Begin Assessment”.
- If saved progress exists, offer “Continue Assessment” and “Start Over”.
- Start Over requires confirmation.

### Assessment screens

- Show the current section name and a clear progress indicator.
- Show one question at a time (preferred for focused mobile use), with question number such as “Question 3 of 7” and overall progress.
- Present the three choices as large, accessible selectable controls.
- Require one answer before continuing.
- Provide Back and Continue controls. Back allows changing an answer within the current section.
- Save every answer immediately.
- At the end of a section, calculate its score and route according to the rules below.
- Do not reveal a numerical grade or use harsh pass/fail language in participant-facing copy.

### Chair destination

- Show the matching chair heading, explanation, and “Where should I focus?” action list.
- Preserve the supplied chair text. Formatting and paragraph breaks may be improved without changing meaning.
- Provide a gentle next-step action such as “Talk with someone at OCUPC” only if the owner approves adding contact links/copy. Do not invent additional pastoral promises.
- Provide a way to restart the assessment, with confirmation.

## 5. Assessment sections

### Section 1 — Questions 1–7

Answer choices for every question: **Disagree | Unsure | Agree**

1. I am confident that I will be with God in heaven after I die
2. I could never be good enough to earn my way to heaven
3. Religious acts like going to church, reading my bible, or following religious rules do not make me a Christian
4. There is only one way to God and that is through faith in Jesus Christ.
5. I have put my faith in Christ’s death through repentance, His burial through baptism in Jesus name and His resurrection through the infilling of the Holy Ghost evidenced by speaking in tongues.
6. My commitment to follow Christ is a response to God’s grace and the gift of salvation I’ve received.
7. Those who don’t put their faith in Christ will be separated from God for eternity in hell.

### Section 2 — Questions 8–14

Answer choices for every question: **Weak | Improving | Strong**

8. I am consistently developing the character of Christ (love, joy, peace, patience, kindness…Galatians 5:22-23).
9. I am consistantly developing the priorities of Christ daily (Love God and Love People… Matthew 22:37-39).
10. I am consistently putting Christ first in every area of my life (time, money, relationships).
11. I am dependent on God’s Spirit for strength and direction in my everyday life.
12. I spend time with God each day by reading His Word and talking to Him through prayer.
13. I know my spiritual gifts and am actively using them in serving others.
14. I am concerned for those who don’t know Jesus and want to share Him with them.

### Section 3 — Questions 15–21

Answer choices for every question: **Weak | Improving | Strong**

15. I am pursuing relationships with spiritually lost people and praying for their salvation.
16. I know how to communicate my salvation story well (my testimony).
17. I know how to share the gospel message simply and clearly (in a few minutes).
18. I am looking for and acting upon opportunities to share the gospel message verbally with spiritually lost people.
19. I am pursuing discipling relationships with other believers and pray for their growth into Christlikeness.
20. I know the basics from scripture what a new believer needs to understand to grow in their faith.
21. I am consistently sharing what God is teaching me with others to encourage them in their faith.

### Section 4 — Questions 22–28

Answer choices for every question: **Weak | Improving | Strong**

22. I have shown and continue to show others how to share their faith and they are actively putting it into practice.
23. I am regularly meeting with at least one other believer to show them how to follow Christ.
24. I am walking with others through the process of becoming a disciple who makes disciples.
25. I model a disciple-making lifestyle that encourages and inspires others to make disciples.
26. I prioritize my schedule to spend time with spiritually lost people and disciples believers.
27. I have discipled someone I lead to Christ, and they are not disciplining someone they led to Christ.
28. I initiate new relationships for the purpose of making disciples that will make disciples.

## 6. Scoring specification

Use a failure-point model. The first/lowest answer option receives 2 failure points, the middle answer receives 1, and the highest answer receives 0.

| Response type | Display labels in section 1 | Display labels in sections 2–4 | Failure points |
| ------------- | --------------------------- | ------------------------------ | -------------: |
| Lowest        | Disagree                    | Weak                           |              2 |
| Middle        | Unsure                      | Improving                      |              1 |
| Highest       | Agree                       | Strong                         |              0 |

Each section contains exactly seven questions. Calculate a separate section total from 0 to 14.

- Section result is failing when `failurePoints >= 4`.
- Section result is passing when `failurePoints < 4`.
- Stop after the first failing section.
- Do not carry failure points between sections.
- The maximum possible section failure points is 14.
- The participant-facing UI should not show a grade percentage in the first release.

Examples:

- 0 lowest + 3 middle = 3 points → continue.
- 1 lowest + 2 middle = 4 points → stop.
- 2 lowest + 0 middle = 4 points → stop.
- 0 lowest + 4 middle = 4 points → stop.
- 1 lowest + 1 middle = 3 points → continue.
- 3 lowest + 0 middle = 6 points → stop.

### Chair routing

| Outcome                                        | Destination |
| ---------------------------------------------- | ----------- |
| Section 1 reaches 4+ points                    | Chair 1     |
| Section 1 passes, Section 2 reaches 4+ points  | Chair 2     |
| Sections 1–2 pass, Section 3 reaches 4+ points | Chair 3     |
| Sections 1–3 pass, Section 4 reaches 4+ points | Chair 4     |
| All four sections pass                         | Chair 4     |

Note: Chair 4 is intentionally the destination both when Section 4 fails and when all four sections pass. Preserve this until the owner specifies otherwise.

## 7. Chair landing page content

The following is source content. Preserve wording exactly. Do not correct apparent transcription errors without owner approval.

### Chair 1

**Heading:** What does it mean to be in Chair 1?

I want to thank you for taking the assessment. As a Chair 1 person, I'm genuinely excited for you. I want to give you the same challenge Jesus gave to this initial disciple.

He said, come and see. See that I am the way. See that I am the truth. See that I am the light (John 14:6).

I really want to encourage you to continue to investigate the faith, and your next step is to ask questions, talk with people, discover how you can know God in a very personal way.

**Where should I focus?**

- Continue to explore the Life of Christ and His power to forgive sin, transform your life through the new birth, and give you eternal life. Ask questions and seek biblical answers. When you are ready turn to Christ in repentance and faith, obey His Word in baptism in Jesus’ name for the remission of sins and receive the gift of the Holy Ghost. Through the new birth, God will forgive your sins, make you His child, and give you new life in Him. (John 1:12; Romans 3:23; 6:23; John 3:3–5, 16; Acts 2:38)

### Chair 2

**Heading:** What does it mean to be in Chair 2?

I want to thank you for taking the assessment. As a Chair 2 believer, you have come to know Christ in a personal way. And your next step is to really clearly understand your identity in Christ. You need to understand whose you are.

Secondly, you need to really learn to feed yourself, to feed yourself God's word, to understand what it says, what it means, and how you apply it to your life.

You'll also need to learn to talk with God and establish that relationship and to live a cleansed life. These are truths that are the next step for you.

**Where should I focus?**

- Through prayer, acknowledge daily your dependence upon the Holy Spirit to develop the fruit of the Spirit in your life (Read Romans 8, Gal 5:22-25)
- Pray daily that the Lord would help you develop His priorities in your life. (I John 2:6, Matt. 22:37-39)
- Through prayer, ask God to take control of the areas of your life where you most often want to retain control. (Pray through Romans 6-7...notice the term "yield" or "present" Rom 6:13, 16, 19)
- Ask Jesus to help you trust Him more and be your guide daily. (Read and meditate upon Ps 25)

### Chair 3

**Heading:** What does it mean to be in Chair 3?

I want to thank you for taking the assessment tool. As a Chair 3 believer, the Bible would describe you as a worker, someone engaged in the work of ministry. You've grown, you've been rooted, and established in your faith, and now you're beginning to be really others-oriented.

You're concerned about the needs of others. You're concerned about your friends who don't know Jesus. They're two next steps for you and that is how to care for new believers and then how to share with unbelievers.

Your next step is to be used by God to see your friends come to Christ.

**Where should I focus?**

- Look for ways to show others how to share their faith and help them to do so. (Matt 9:36-10:1)
- Ask God to show you who you should disciple and then begin to meet with them to help them grow in their faith. (2 Tim 2:2)
- Commit to finding opportunities to train others on how to be and build disciples as Jesus did. (John 14:12, John 17)
- Pray that God would help you live a lifestyle of disciple-making. Make of list of what needs to change in your life to do this better.

### Chair 4

**Heading:** What does it mean to be in Chair 4?

I want to thank you for taking this assessment. As a Chair 4 Christ Follower, God's used you in your life. You've been rooted in establishing your faith.

You've been equipped to care for new believers and to share with unbelievers. And sure, there are more things you will continually learn in those areas, but you've seen people come to faith in Christ, and your spiritual parent, or maybe even a grandparent. Your next step will be to care for the family that God's entrusted to you, to become not only a parent, but a spiritual grandparent and great-grandparent, to create a movement of multiplying disciples.

**Where should I focus?**

- The source document did not provide a separate “Where should I focus?” bullet list for Chair 4. Do not invent one. Display the Chair 4 explanation and ask the owner whether they want to add next steps later.

## 8. Visual design and branding

OCUPC website: https://ocupc.com/

The website presents the church themes “growing faith,” “authentic friendship,” and “spiritual family.” The site also describes increasing trust in God's Word and Spirit, strengthening relationships, and expanding God's family.

Design direction:

- Warm, welcoming, calm, clear, and contemporary.
- Mobile-first, with generous spacing and readable typography.
- Use the live website's verified brand colors, fonts, logo, and suitable church-owned assets when accessible.
- Inspect website styles/assets rather than guessing brand hex codes.
- If reliable exact colors or logo files cannot be obtained, use neutral temporary colors and clearly label them as provisional in CSS and README.
- Avoid a generic quiz look, gamification, scores, badges, or competitive visuals.
- Do not add imagery unless it genuinely supports the experience.

## 9. Accessibility

- Use semantic headings, buttons, fieldsets, legends, and radio inputs.
- All answer options must be keyboard accessible.
- Provide visible focus indicators.
- Ensure adequate color contrast.
- Use sufficiently large touch targets.
- Announce progress/status changes accessibly.
- Do not rely on color alone to show selected answers.
- Respect reduced-motion preferences.

## 10. Progress persistence

Use one namespaced localStorage key, e.g. `ocupc-four-chair-assessment:v1`.

Persist:

- schema/version
- answers keyed by question ID
- current section/question position
- completion state and chair destination if complete
- updated timestamp

Requirements:

- Save after each answer.
- Restore progress after reload or reopening the same browser/device.
- Validate stored shape before using it.
- Handle parse errors, stale versions, and unavailable storage gracefully.
- Offer Continue and Start Over if an incomplete saved assessment exists.
- Confirm before clearing progress.
- Do not store personal identity data.
- Clearly explain that progress is local to the browser/device and will not follow the participant to another device.
- Do not claim local storage is encrypted, secure, or permanent.

## 11. Suggested architecture

Keep content and logic separate from presentation. Example (Copilot may adjust with explanation):

- `src/content/questions.ts`
- `src/content/chairs.ts`
- `src/lib/scoring.ts`
- `src/lib/progressStorage.ts`
- `src/components/`
- `src/pages/`
- `src/styles/`
- `src/App.tsx`

## 12. Required tests

Unit tests:

1. All Agree/Strong → 0 points and pass.
2. Three Unsure/Improving → 3 points and pass.
3. Four Unsure/Improving → 4 points and fail.
4. One Disagree/Weak + two Unsure/Improving → 4 points and fail.
5. Two Disagree/Weak → 4 points and fail.
6. One Disagree/Weak + one Unsure/Improving → 3 points and pass.
7. Scoring is calculated independently per section.
8. Section 1 failure routes to Chair 1.
9. Section 2 failure after Section 1 pass routes to Chair 2.
10. Section 3 failure after prior passes routes to Chair 3.
11. Section 4 failure routes to Chair 4.
12. Passing all four sections routes to Chair 4.
13. Every question has exactly three options and correct section.
14. Save/restore preserves selected answers and position.
15. Reset clears the app's key only.
16. Malformed localStorage does not crash the app.

Before calling the first release complete, run type checking, unit tests, and production build. Report actual outcomes.
