# Four Chair Assessment — GitHub Copilot project instructions

## Project purpose
Build a welcoming, accessible, mobile-first web assessment for Oregon City United Pentecostal Church (OCUPC). It guides a participant through 28 supplied statements in four sections and directs them to the appropriate Chair 1–4 reflection page based on section scoring.

## Source-of-truth rules
- Treat `docs/PRODUCT-REQUIREMENTS.md` as the authoritative product specification.
- Preserve all 28 assessment statements and all chair-page content exactly as supplied unless the owner explicitly approves an edit.
- Do not paraphrase, “correct,” shorten, modernize, or reinterpret theological wording.
- Questions 5 and 27 contain wording that may be typographical errors. Preserve the exact supplied wording and flag them for owner review; do not fix them independently.
- If a requirement is ambiguous or conflicts with another requirement, stop and ask rather than guessing.

## Technical decisions
- Use React + TypeScript + Vite.
- Use plain CSS with centralized CSS custom properties; do not add a UI framework unless the owner approves it.
- Use `localStorage` only for first-release progress persistence. There is no login, email collection, backend, database, analytics, or cross-device sync in version one.
- Keep assessment content separate from UI components, preferably in typed data modules.
- Keep scoring logic in a pure, independently tested function.
- Keep navigation and persistence logic separate from presentation where practical.
- Do not add unnecessary dependencies.

## Assessment behavior
- There are exactly four sections, seven questions per section:
  - Section 1: questions 1–7
  - Section 2: questions 8–14
  - Section 3: questions 15–21
  - Section 4: questions 22–28
- For questions 1–7, choices are Disagree, Unsure, Agree.
- For questions 8–28, choices are Weak, Improving, Strong.
- Scoring weights: first/lowest option = 2 failure points; middle option = 1 failure point; highest option = 0 failure points.
- At the end of each section, calculate that section's failure points only. A section fails at 4 or more failure points. Do not combine points from different sections.
- If a section fails, stop the assessment and show that section's corresponding chair page: section 1 → Chair 1; section 2 → Chair 2; section 3 → Chair 3; section 4 → Chair 4.
- If all four sections pass, show Chair 4.
- Chair 4 is therefore the destination both for passing all sections and for failing section 4. Preserve this specified behavior.
- Do not expose a percentage grade or label participants as “pass/fail” in participant-facing copy unless the owner later requests it. Use supportive language and the chair content.

## Persistence and privacy
- Save each answer immediately in `localStorage`.
- Save enough state to resume at the correct unanswered question/section after refresh or closing the browser.
- On return, offer “Continue” and “Start over” when saved progress exists.
- Starting over must ask for confirmation and then clear only this app's stored assessment key.
- Provide a clear way to reset/delete local progress.
- Explain briefly that progress is stored in this browser on this device and does not sync to other devices.
- Do not collect names, email addresses, or other identifying information.
- Do not add analytics, tracking pixels, advertising scripts, or third-party data collection.
- Do not claim localStorage is a secure or permanent record. Handle malformed or outdated stored data safely.

## Design and accessibility
- Design mobile-first for phones, tablets, and desktop.
- Use OCUPC's live website as the visual reference: https://ocupc.com/
- Inspect the site's current public styles, logo, typography, and image assets where possible. Reuse only assets that are clearly OCUPC-owned and suitable for this app.
- Do not guess or claim exact brand colors. If exact values cannot be verified, create neutral temporary CSS variables and mark them clearly for owner approval.
- Keep the interface warm, calm, uncluttered, and encouraging—not like a school exam.
- Use large touch targets, readable line lengths, visible focus states, semantic HTML, keyboard-accessible answer controls, and sufficient color contrast.
- Do not rely on color alone to communicate selection or progress.
- Respect reduced-motion preferences.
- Avoid decorative imagery that competes with the assessment content.

## Engineering quality
- Use strict TypeScript types.
- Add unit tests for all scoring boundaries and section routing.
- Add tests for saving, restoring, clearing progress, and malformed localStorage data.
- Run lint/typecheck/test/build scripts that exist and report their results accurately.
- Do not claim tests pass unless they were actually run.
- Keep components reasonably small and readable.
- Do not add backend services or deploy the app without explicit owner approval.
- Before finishing a task, summarize changed files, commands run, test results, and any remaining decisions.
