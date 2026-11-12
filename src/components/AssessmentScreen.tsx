import { useEffect, useRef } from "react";
import {
  ANSWER_LABELS,
  questions,
  type AnswerChoice,
} from "../content/questions";
import type { AssessmentProgress } from "../lib/progressStorage";

interface AssessmentScreenProps {
  progress: AssessmentProgress;
  notice: string;
  onAnswer: (questionId: number, answer: AnswerChoice) => void;
  onBack: () => void;
}

export function AssessmentScreen({
  progress,
  notice,
  onAnswer,
  onBack,
}: AssessmentScreenProps) {
  const question = questions[progress.currentQuestion - 1];
  const selectedAnswer = progress.answers[question.id];
  const questionRef = useRef<HTMLLegendElement>(null);

  useEffect(() => {
    questionRef.current?.focus();
  }, [question.id]);

  return (
    <main className="page-shell">
      <header className="brand-header">
        <img
          className="brand-logo"
          src="/ocupc-logo.png"
          alt="Oregon City United Pentecostal Church"
        />
      </header>
      <section className="assessment-card" aria-labelledby="assessment-heading">
        <h1 id="assessment-heading">Four Chair Assessment</h1>
        <fieldset className="question-fieldset">
          <legend className="question-text" ref={questionRef} tabIndex={-1}>
            {question.text}
          </legend>
          <div className="choice-list">
            {question.choices.map((choice) => (
              <label
                className={`choice-card${selectedAnswer === choice ? " is-selected" : ""}`}
                key={choice}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={choice}
                  checked={selectedAnswer === choice}
                  onChange={() => onAnswer(question.id, choice)}
                  onClick={() => {
                    if (selectedAnswer === choice) {
                      onAnswer(question.id, choice);
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
            disabled={question.id === 1}
          >
            Back
          </button>
        </nav>
      </section>
    </main>
  );
}
