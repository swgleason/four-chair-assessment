# OCUPC Four Chair Assessment

A mobile-first React and TypeScript assessment for Oregon City United Pentecostal Church. It presents all 28 questions one at a time, saves progress locally, scores each seven-question section independently, and routes the participant to the chair for their first section reaching the four-point threshold. Passing all four sections routes to Chair 4. Section and question numbers are not shown during the assessment; selecting an answer advances automatically.

## Run locally

```sh
npm install
npm run dev
```

Run the unit tests and production build with:

```sh
npm test
npm run build
```

## Content and owner review

- Question 5 retains the current app wording confirmed by the owner: “I have put my faith in Christ’s death through repentance, His burial through baptism in Jesus name and His resurrection through the infilling of the Holy Ghost evidenced by speaking in tongues.” This differs from the original PRD wording.
  Note: I just correct this.
- Question 27 is preserved as supplied and flagged for owner review.
- Questions and chair content are maintained in typed content modules.
- The Chair 1 text includes the supplied phrase “eternal ife” unchanged.
- Chair 4 has no supplied “Where should I focus?” list, so none is displayed.

## Branding

The public OCUPC site uses Open Sans and provides an official Oregon City logo, which is included as a local asset. Its stylesheet exposes theme defaults, but did not make an approved assessment palette reliably identifiable. The app therefore uses provisional neutral colors, marked with a TODO in `src/styles/global.css`, pending owner approval. No third-party fonts or tracking scripts are loaded by the app.

## Progress and privacy

Answers and position are stored in this browser's local storage on this device. Progress does not sync to another device. No account, identity information, backend, or analytics are used.
