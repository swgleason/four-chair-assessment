# Build the foundation and first working vertical slice

Read these files before making changes:

- `.github/copilot-instructions.md`
- `docs/PRODUCT-REQUIREMENTS.md`
- `README.md`

## Task

Create the initial application foundation for the OCUPC Four Chair Assessment.

1. Inspect the current workspace. If it is empty, scaffold a React + TypeScript + Vite app in this folder. Do not create a nested duplicate project directory.
2. Set up a clean, maintainable folder structure that separates assessment content, scoring/persistence logic, UI components, and styles.
3. Implement the welcome screen and the assessment experience for the first section only (questions 1–7). Use the exact supplied question text and choices.
4. Show one question at a time, a section progress indicator, question count, Back, and Continue.
5. Require an answer before continuing. Let the participant change a previous answer within the section.
6. Implement a pure scoring function using the specified weights: lowest option = 2 failure points, middle = 1, highest = 0. A section fails at 4 or more points.
7. At the end of Section 1:
   - If the section reaches 4 or more points, show the Chair 1 landing page with the exact supplied Chair 1 text.
   - If it scores below 4, show a temporary “Section 1 complete” screen with a clear next-step placeholder. Do not build Sections 2–4 yet.
8. Save answers and current position in localStorage after each answer. Restore progress after refresh. Add Continue/Start Over behavior on the welcome screen and confirmation before reset.
9. Use accessible semantic controls and responsive mobile-first CSS.
10. Inspect the OCUPC website and its available assets/styles for verified brand colors, typography, and logo. Do not invent exact brand values. If they cannot be reliably identified, use a restrained neutral provisional palette and leave TODO comments for approved brand values.
11. Add unit tests for the scoring boundaries and the first-section routing. Include tests for localStorage save/restore/reset if practical in this slice.

## Constraints

- Do not implement email, accounts, backend, database, analytics, or deployment.
- Do not change the supplied wording of any assessment question or Chair 1 content.
- Preserve Question 5 exactly as written; flag it for owner review rather than correcting it.
- Do not add features or copy not requested.
- Do not show percentage scores to participants.
- Do not implement Sections 2–4 in this task.
- Do not mark the work complete unless the app runs and the tests/build have actually been executed.

## Work process

- First inspect the files and give a short implementation plan.
- Then make the changes.
- Ask before running destructive commands or installing unnecessary dependencies. It is reasonable to install the standard dependencies required for the Vite app and test setup.
- Run the relevant tests and production build.
- If a command fails, diagnose and fix it where possible, then rerun it.
- At the end, report:
  - files created/changed
  - commands run
  - test/build results
  - how I can start the app locally
  - any decisions or owner approvals still needed

Do not proceed to Sections 2–4 until I review this first slice.
