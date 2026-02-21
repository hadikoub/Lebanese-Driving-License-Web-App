import { useMemo, useState } from "react";
import { useAppState } from "../AppState";
import { SignImage } from "../components/SignImage";

export function ReviewPage(): JSX.Element {
  const { questionSet, updateQuestion } = useAppState();
  const [showOnlyNeedsReview, setShowOnlyNeedsReview] = useState(false);

  const visibleQuestions = useMemo(() => {
    if (!questionSet) return [];
    if (!showOnlyNeedsReview) return questionSet.questions;
    return questionSet.questions.filter((question) => question.needsReview);
  }, [questionSet, showOnlyNeedsReview]);

  if (!questionSet) {
    return <section className="panel">No data available. Go back to home to import.</section>;
  }

  return (
    <section className="panel">
      <div className="title-row">
        <h2>Review Questions</h2>
        <label className="inline-checkbox">
          <input
            type="checkbox"
            checked={showOnlyNeedsReview}
            onChange={(event) => setShowOnlyNeedsReview(event.target.checked)}
          />
          Show needs review only
        </label>
      </div>

      <p className="muted">
        Edit question text and choices, then select the correct answer. Leave "Needs Review" checked for questions that need verification.
      </p>

      <div className="question-list">
        {visibleQuestions.map((question) => (
          <article className="question-editor" key={question.id}>
            <header>
              <h3>
                Question {question.sourceNumber ?? "?"} - Page {question.sourcePage}
              </h3>
              <label className="inline-checkbox">
                <input
                  type="checkbox"
                  checked={question.needsReview}
                  onChange={(event) => {
                    updateQuestion(question.id, (current) => ({
                      ...current,
                      needsReview: event.target.checked
                    }));
                  }}
                />
                Needs Review
              </label>
            </header>

            <label>
              Question Text
              <textarea
                dir="rtl"
                className="ar"
                value={question.promptAr}
                onChange={(event) => {
                  updateQuestion(question.id, (current) => ({
                    ...current,
                    promptAr: event.target.value
                  }));
                }}
              />
            </label>

            {question.signPath && (
              <figure className="question-sign small">
                <SignImage src={question.signPath} alt="Traffic sign related to the question" loading="lazy" />
              </figure>
            )}

            <label>
              Sign Image Path (optional)
              <input
                value={question.signPath ?? ""}
                onChange={(event) => {
                  updateQuestion(question.id, (current) => ({
                    ...current,
                    signPath: event.target.value.trim() || null
                  }));
                }}
                placeholder="/assets/signs/1.svg"
              />
            </label>

            <div className="choices-grid">
              {question.choices.map((choice, choiceIndex) => (
                <label key={choice.id}>
                  Choice {choiceIndex + 1} ({choice.id})
                  <input
                    dir="rtl"
                    className="ar"
                    value={choice.textAr}
                    onChange={(event) => {
                      updateQuestion(question.id, (current) => ({
                        ...current,
                        choices: current.choices.map((innerChoice) =>
                          innerChoice.id === choice.id
                            ? { ...innerChoice, textAr: event.target.value }
                            : innerChoice
                        )
                      }));
                    }}
                  />
                </label>
              ))}
            </div>

            <label>
              Correct Answer
              <select
                value={question.correctChoiceId ?? ""}
                onChange={(event) => {
                  const value = event.target.value || null;
                  updateQuestion(question.id, (current) => ({
                    ...current,
                    correctChoiceId: value
                  }));
                }}
              >
                <option value="">Not set</option>
                {question.choices.map((choice) => (
                  <option key={choice.id} value={choice.id}>
                    {choice.id}
                  </option>
                ))}
              </select>
            </label>
          </article>
        ))}
      </div>
    </section>
  );
}
