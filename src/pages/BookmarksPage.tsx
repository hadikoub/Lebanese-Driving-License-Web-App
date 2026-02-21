import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAppState } from "../AppState";
import { ConfirmModal } from "../components/Modal";
import { SignImage } from "../components/SignImage";
import type { Question } from "../types/qcm";

function getChoiceLabel(choiceIndex: number): string {
  return String.fromCharCode(65 + choiceIndex);
}

function getCorrectAnswerText(question: Question): string {
  if (!question.correctChoiceId) return "Not set";
  const choice = question.choices.find((item) => item.id === question.correctChoiceId);
  return choice?.textAr ?? question.correctChoiceId;
}

export function BookmarksPage(): JSX.Element {
  const { questionSet, bookmarkedQuestionIds, toggleQuestionBookmark } = useAppState();
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const bookmarkedQuestions = useMemo(() => {
    if (!questionSet || bookmarkedQuestionIds.length === 0) return [];
    const idSet = new Set(bookmarkedQuestionIds);
    return questionSet.questions.filter((question) => idSet.has(question.id));
  }, [questionSet, bookmarkedQuestionIds]);

  if (!questionSet) {
    return <section className="panel">No question data available.</section>;
  }

  return (
    <section className="panel">
      <header className="title-row">
        <h2>Saved Questions</h2>
        <span>{bookmarkedQuestions.length} questions</span>
      </header>

      {bookmarkedQuestions.length > 0 && (
        <div className="actions-row">
          <Link className="button-link btn-block" to="/quiz/practice">
            Practice Saved Questions
          </Link>
        </div>
      )}

      {bookmarkedQuestions.length === 0 && (
        <div className="empty-state">
          <p>No saved questions yet.</p>
          <p className="muted" style={{ fontSize: "0.88rem" }}>You can save any question during practice or exam mode.</p>
        </div>
      )}

      <div className="question-list">
        {bookmarkedQuestions.map((question) => (
          <article key={question.id} className="result-item bookmark-item">
            <div className="bookmark-title-row">
              <h3 className="ar">{question.promptAr}</h3>
              <button
                type="button"
                className="danger-button"
                onClick={() => setRemoveTarget(question.id)}
              >
                Remove
              </button>
            </div>

            {question.signPath && (
              <figure className="question-sign small">
                <SignImage src={question.signPath} alt="Traffic sign related to the question" loading="lazy" />
              </figure>
            )}

            <p>
              <strong>Correct Answer:</strong> <span className="ar">{getCorrectAnswerText(question)}</span>
            </p>

            <div className="bookmark-choices">
              {question.choices.map((choice, choiceIndex) => {
                const isCorrect = question.correctChoiceId === choice.id;
                return (
                  <div key={choice.id} className={`bookmark-choice ${isCorrect ? "correct" : ""}`}>
                    <strong>{getChoiceLabel(choiceIndex)}</strong>
                    <span className="ar">{choice.textAr}</span>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>

      <ConfirmModal
        open={removeTarget !== null}
        title="Remove from Saved"
        message="Are you sure you want to remove this question from your saved list?"
        confirmLabel="Yes, Remove"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          if (removeTarget) toggleQuestionBookmark(removeTarget);
          setRemoveTarget(null);
        }}
        onCancel={() => setRemoveTarget(null)}
      />
    </section>
  );
}
