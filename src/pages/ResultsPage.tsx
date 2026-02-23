import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAppState } from "../AppState";
import { SignImage } from "../components/SignImage";
import { useI18n } from "../i18n";
import { formatDuration } from "../lib/quiz";
import type { Question } from "../types/qcm";

function formatChoiceWithText(question: Question, choiceId: string | null | undefined): string {
  if (!choiceId) return "Not set";
  const matched = question.choices.find((choice) => choice.id === choiceId);
  if (!matched) return choiceId;
  return matched.textAr;
}

export function ResultsPage(): JSX.Element {
  const { t } = useI18n();
  const { questionSet, lastResult } = useAppState();

  const reviewRows = useMemo(() => {
    if (!questionSet || !lastResult) return [];

    const idSet = new Set(lastResult.questionIds);
    return questionSet.questions
      .filter((question) => idSet.has(question.id))
      .map((question) => {
        const selected = lastResult.answers[question.id] ?? null;
        const isCorrect = !!question.correctChoiceId && selected === question.correctChoiceId;
        const selectedText = selected ? formatChoiceWithText(question, selected) : "Not answered";
        const correctText = formatChoiceWithText(question, question.correctChoiceId);

        return {
          question,
          selected,
          isCorrect,
          selectedText,
          correctText
        };
      })
      .filter((item) => item.selected !== null);
  }, [questionSet, lastResult]);

  if (!questionSet || !lastResult) {
    return (
      <section className="panel empty-state">
        <p>{t("noResultsSaved")}</p>
      </section>
    );
  }

  const percentage = Math.round((lastResult.score / Math.max(lastResult.total, 1)) * 100);
  const answeredCount = Object.keys(lastResult.answers).length;
  const unansweredCount = Math.max(lastResult.total - answeredCount, 0);
  const passed = percentage >= 70;

  return (
    <>
      <section className="panel">
        <header className="title-row">
          <h2>{t("quizResults")}</h2>
          <span>{lastResult.mode === "practice" ? t("practice") : t("exam")}</span>
        </header>

        <div className="score-card" style={{
          background: passed
            ? "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)"
            : "linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)",
          borderColor: passed ? "#a7f3d0" : "#fecaca"
        }}>
          <strong style={{ color: passed ? "#166534" : "#991b1b" }}>
            {lastResult.score} / {lastResult.total}
          </strong>
          <span style={{
            color: passed ? "#15803d" : "#b91c1c",
            background: "rgba(255,255,255,0.6)"
          }}>
            {percentage}%
          </span>
        </div>

        <div className="stats-grid" style={{ marginBottom: 16 }}>
          <article>
            <h3>{t("answered")}</h3>
            <strong>{answeredCount}</strong>
          </article>
          <article>
            <h3>{t("skipped")}</h3>
            <strong>{unansweredCount}</strong>
          </article>
          <article>
            <h3>{t("time")}</h3>
            <strong style={{ fontSize: "1.1rem" }}>{formatDuration(lastResult.elapsedSeconds)}</strong>
          </article>
        </div>

        {lastResult.timedOut && <p className="error-box">{t("timedOut")}</p>}
        {lastResult.storyLevelId && <p className="muted">Story level result: {lastResult.storyLevelId}</p>}

        <div className="actions-row">
          <Link className="button-link" to="/quiz/practice" style={{ flex: 1 }}>
            {t("retryPractice")}
          </Link>
          <Link className="button-link" to="/quiz/exam" style={{ flex: 1 }}>
            {t("retryExam")}
          </Link>
        </div>
        <div className="actions-row">
          <Link className="button-link btn-ghost" to="/story" style={{ flex: 1 }}>
            {t("backToStory")}
          </Link>
        </div>
      </section>

      <section className="panel">
        <h3>{t("answerReview")}</h3>
        {reviewRows.length === 0 && <p className="muted">{t("noCompletedAnswers")}</p>}
        <div className="question-list">
          {reviewRows.map(({ question, isCorrect, selectedText, correctText }) => (
            <article key={question.id} className={`result-item ${isCorrect ? "ok" : "bad"}`}>
              <span className="question-id">#{question.sourceNumber ?? question.id}</span>
              <h4 className="ar">{question.promptAr}</h4>
              {question.signPath && (
                <figure className="question-sign small">
                  <SignImage src={question.signPath} alt="Traffic sign related to the question" loading="lazy" />
                </figure>
              )}
              <p>{t("yourAnswer")}: <span className="ar">{selectedText}</span></p>
              <p>{t("correct")}: <span className="ar">{correctText}</span></p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
