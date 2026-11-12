import { useState } from "react";
import { AssessmentScreen } from "./components/AssessmentScreen";
import { ChairScreen } from "./components/ChairScreen";
import { WelcomeScreen } from "./components/WelcomeScreen";
import type { AnswerChoice } from "./content/questions";
import {
  clearProgress,
  createInitialProgress,
  readProgress,
  saveProgress,
  type AssessmentProgress,
} from "./lib/progressStorage";
import { answerAndAdvance } from "./lib/assessmentFlow";

type Screen = "welcome" | "assessment" | "result";

const initialRead = readProgress();

export default function App() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [savedProgress, setSavedProgress] = useState(initialRead.progress);
  const [progress, setProgress] = useState<AssessmentProgress | null>(null);
  const [notice, setNotice] = useState(initialRead.error ?? "");

  function persist(next: AssessmentProgress) {
    setProgress(next);
    setSavedProgress(next);
    if (!saveProgress(next)) {
      setNotice(
        "Progress could not be saved in this browser. Your answers may not be here next time.",
      );
    } else {
      setNotice("");
    }
  }

  function begin() {
    const freshProgress = createInitialProgress();
    setProgress(freshProgress);
    setSavedProgress(null);
    setNotice("");
    setScreen("assessment");
  }

  function continueAssessment() {
    if (!savedProgress) return;
    setProgress(savedProgress);
    setNotice("");
    setScreen(savedProgress.completed ? "result" : "assessment");
  }

  function startOver() {
    if (!window.confirm("Start over and delete this assessment's saved progress?")) {
      return;
    }
    if (!clearProgress()) {
      setNotice(
        "Saved progress could not be cleared in this browser. Please try again.",
      );
      return;
    }

    const freshProgress = createInitialProgress();
    setProgress(freshProgress);
    setSavedProgress(null);
    setNotice("");
    setScreen("assessment");
  }

  function answerQuestion(
    questionId: number,
    answer: AnswerChoice,
  ) {
    if (!progress) return;
    const transition = answerAndAdvance(progress, questionId, answer);
    persist(transition.progress);
    if (transition.completed) setScreen("result");
  }

  function goBack() {
    if (!progress || progress.currentQuestion <= 1) return;
    persist({ ...progress, currentQuestion: progress.currentQuestion - 1 });
  }

  if (screen === "welcome") {
    return (
      <WelcomeScreen
        hasSavedProgress={savedProgress !== null}
        notice={notice}
        onBegin={begin}
        onContinue={continueAssessment}
        onStartOver={startOver}
      />
    );
  }

  if (screen === "assessment" && progress) {
    return (
      <AssessmentScreen
        progress={progress}
        notice={notice}
        onAnswer={answerQuestion}
        onBack={goBack}
      />
    );
  }

  if (screen === "result") {
    if (!progress?.completed || progress.destination === null) {
      throw new Error("Completed assessment is missing a chair destination.");
    }

    return (
      <ChairScreen
        chair={progress.destination}
        notice={notice}
        onStartOver={startOver}
      />
    );
  }

  return (
    <WelcomeScreen
      hasSavedProgress={savedProgress !== null}
      notice={notice}
      onBegin={begin}
      onContinue={continueAssessment}
      onStartOver={startOver}
    />
  );
}
