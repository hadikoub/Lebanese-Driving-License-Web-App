import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAppState } from "../AppState";
import { SignImage } from "../components/SignImage";
import { formatDuration } from "../lib/quiz";
import type { Question } from "../types/qcm";

function formatChoiceWithText(question: Question, choiceId: string | null | undefined): string {
  if (!choiceId) return "غير محدد";
  const matched = question.choices.find((choice) => choice.id === choiceId);
  if (!matched) return choiceId;
  return matched.textAr;
}

export function ResultsPage(): JSX.Element {
  const { questionSet, lastResult } = useAppState();

  const reviewRows = useMemo(() => {
    if (!questionSet || !lastResult) return [];

    const idSet = new Set(lastResult.questionIds);
    return questionSet.questions
      .filter((question) => idSet.has(question.id))
      .map((question) => {
        const selected = lastResult.answers[question.id] ?? null;
        const isCorrect = !!question.correctChoiceId && selected === question.correctChoiceId;
        const selectedText = selected ? formatChoiceWithText(question, selected) : "لم يتم الاختيار";
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
    return <section className="panel">لا توجد نتيجة محفوظة بعد.</section>;
  }

  const percentage = Math.round((lastResult.score / Math.max(lastResult.total, 1)) * 100);
  const answeredCount = Object.keys(lastResult.answers).length;
  const unansweredCount = Math.max(lastResult.total - answeredCount, 0);

  return (
    <section className="panel">
      <header className="title-row">
        <h2>نتيجة الاختبار</h2>
        <span>{lastResult.mode === "practice" ? "تدريب" : "امتحان"}</span>
      </header>

      <div className="score-card">
        <strong>
          {lastResult.score} / {lastResult.total}
        </strong>
        <span>{percentage}%</span>
      </div>

      <p className="muted">
        الإجابات المنجزة: {answeredCount} | غير المجاب عنها: {unansweredCount}
      </p>
      <p className="muted">الوقت المستغرق: {formatDuration(lastResult.elapsedSeconds)}</p>
      {lastResult.timedOut && <p className="error-box">انتهى الوقت وتم إنهاء الاختبار تلقائياً.</p>}
      {lastResult.storyLevelId && <p className="muted">نتيجة مستوى القصة: {lastResult.storyLevelId}</p>}

      <div className="actions-row">
        <Link className="button-link" to="/quiz/practice">
          إعادة التدريب
        </Link>
        <Link className="button-link" to="/quiz/exam">
          إعادة الامتحان
        </Link>
        <Link className="button-link" to="/story">
          العودة إلى Story Mode
        </Link>
      </div>

      <h3>مراجعة الإجابات</h3>
      {reviewRows.length === 0 && <p className="muted">لا توجد إجابات منجزة لعرض التصحيح.</p>}
      <div className="question-list">
        {reviewRows.map(({ question, isCorrect, selectedText, correctText }) => (
          <article key={question.id} className={`result-item ${isCorrect ? "ok" : "bad"}`}>
            <h4>{question.promptAr}</h4>
            {question.signPath && (
              <figure className="question-sign small">
                <SignImage src={question.signPath} alt="إشارة مرورية مرتبطة بالسؤال" loading="lazy" />
              </figure>
            )}
            <p>اختيارك: {selectedText}</p>
            <p>الصحيح: {correctText}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
