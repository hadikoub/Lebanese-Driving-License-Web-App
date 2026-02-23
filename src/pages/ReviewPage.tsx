import { useMemo, useState } from "react";
import { useAppState } from "../AppState";
import { SignImage } from "../components/SignImage";
import { useI18n } from "../i18n";

export function ReviewPage(): JSX.Element {
  const { t } = useI18n();
  const { questionSet, updateQuestion } = useAppState();
  const [showOnlyNeedsReview, setShowOnlyNeedsReview] = useState(false);

  const visibleQuestions = useMemo(() => {
    if (!questionSet) return [];
    if (!showOnlyNeedsReview) return questionSet.questions;
    return questionSet.questions.filter((question) => question.needsReview);
  }, [questionSet, showOnlyNeedsReview]);

  if (!questionSet) {
    return <section className="panel">{t("noDataImport")}</section>;
  }

  return (
    <section className="panel">
      <div className="title-row">
        <h2>{t("reviewQuestions")}</h2>
        <label className="inline-checkbox">
          <input
            type="checkbox"
            checked={showOnlyNeedsReview}
            onChange={(event) => setShowOnlyNeedsReview(event.target.checked)}
          />
          {t("showNeedsReviewOnly")}
        </label>
      </div>

      <p className="muted">
        {t("reviewInstructions")}
      </p>

      <div className="question-list">
        {visibleQuestions.map((question) => (
          <article className="question-editor" key={question.id}>
            <header>
              <h3>
                {t("question")} {question.sourceNumber ?? "?"} - {t("page")} {question.sourcePage}
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
                {t("needsReview")}
              </label>
            </header>

            <label>
              {t("questionText")}
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
              {t("signImagePath")}
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
                  {t("choice")} {choiceIndex + 1} ({choice.id})
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
              {t("correctAnswerLabel")}
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
                <option value="">{t("notSet")}</option>
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
