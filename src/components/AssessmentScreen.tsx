import { useEffect, useRef, useState } from "react";
import {
  ANSWER_LABELS,
  questions,
  type AnswerChoice,
} from "../content/questions";
import type { AssessmentProgress } from "../lib/progressStorage";
import { HomeLogo } from "./HomeLogo";

interface AssessmentScreenProps {
  progress: AssessmentProgress;
  notice: string;
  onAnswer: (questionId: number, answer: AnswerChoice) => void;
  onBack: () => void;
  onNavigateHome?: () => void;
}

export function AssessmentScreen({
  progress,
  notice,
  onAnswer,
  onBack,
  onNavigateHome,
}: AssessmentScreenProps) {
  const question = questions[progress.currentQuestion - 1];
  const [pendingAnswer, setPendingAnswer] = useState<{
    questionId: number;
    answer: AnswerChoice;
  } | null>(null);
  const pendingAnswerRef = useRef<{
    questionId: number;
    answer: AnswerChoice;
  } | null>(null);
  const answerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionRef = useRef<HTMLLegendElement>(null);
  const isAnswerPending = pendingAnswerRef.current?.questionId === question.id;
  const selectedAnswer =
    pendingAnswer?.questionId === question.id
      ? pendingAnswer.answer
      : progress.answers[question.id];
  const pendingAnswerCount =
    pendingAnswer?.questionId === question.id &&
    progress.answers[question.id] === undefined
      ? 1
      : 0;
  const answeredCount = Object.keys(progress.answers).length + pendingAnswerCount;
  const progressPercent = (answeredCount / questions.length) * 100;

  useEffect(() => {
    questionRef.current?.focus();
    return () => {
      if (answerTimerRef.current !== null) {
        clearTimeout(answerTimerRef.current);
        answerTimerRef.current = null;
      }
      pendingAnswerRef.current = null;
    };
  }, [question.id]);

  function selectAnswer(answer: AnswerChoice) {
    if (pendingAnswerRef.current !== null) return;

    const pending = { questionId: question.id, answer };
    pendingAnswerRef.current = pending;
    setPendingAnswer(pending);
    answerTimerRef.current = setTimeout(() => {
      answerTimerRef.current = null;
      pendingAnswerRef.current = null;
      setPendingAnswer(null);
      onAnswer(question.id, answer);
    }, 275);
  }

  return (
    <main className="page-shell">
      <header className="brand-header">
        <HomeLogo onNavigateHome={onNavigateHome} />
      </header>
      <section className="assessment-card" aria-labelledby="assessment-heading">
        <h1 id="assessment-heading">Four Chair Assessment</h1>
        <fieldset className="question-fieldset" key={question.id}>
          <legend className="question-text" ref={questionRef} tabIndex={-1}>
            {question.id}. {question.text}
          </legend>
          <div className="choice-list">
            {question.choices.map((choice) => (
              <label
                className={[
                  "choice-card",
                  selectedAnswer === choice ? "is-selected" : "",
                  isAnswerPending ? "is-pending" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={choice}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={choice}
                  checked={selectedAnswer === choice}
                  disabled={isAnswerPending}
                  onChange={() => selectAnswer(choice)}
                  onClick={() => {
                    if (selectedAnswer === choice) {
                      selectAnswer(choice);
                    }
                  }}
                />
                <span>{ANSWER_LABELS[choice]}</span>
                <span className="choice-check" aria-hidden="true">
                  {selectedAnswer === choice ? "Selected" : ""}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {notice && (
          <p className="status-message" role="status">
            {notice}
          </p>
        )}
        <nav className="question-navigation" aria-label="Assessment navigation">
          <button
            className="button button-secondary"
            onClick={onBack}
            disabled={question.id === 1 || isAnswerPending}
          >
            Back
          </button>
        </nav>
        <div
          className="assessment-progress"
          role="progressbar"
          aria-label="Assessment progress"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={answeredCount}
        >
          <span
            className="assessment-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </section>
    </main>
  );
}
