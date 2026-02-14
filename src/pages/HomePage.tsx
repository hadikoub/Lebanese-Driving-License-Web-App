import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAppState } from "../AppState";
import { downloadJson } from "../lib/file";

export function HomePage(): JSX.Element {
  const { questionSet, loadingDefault, isAdmin } = useAppState();

  const stats = useMemo(() => {
    if (!questionSet) return null;

    const total = questionSet.questions.length;
    const needsReview = questionSet.questions.filter((item) => item.needsReview).length;
    const withoutAnswerKey = questionSet.questions.filter((item) => !item.correctChoiceId).length;

    return { total, needsReview, withoutAnswerKey };
  }, [questionSet]);

  function exportCurrentSet(): void {
    if (!questionSet) return;
    downloadJson(`${questionSet.id}.json`, questionSet);
  }

  return (
    <section className="panel">
      <div className="actions-row">
        <button type="button" onClick={exportCurrentSet} disabled={!questionSet}>
          تصدير النسخة الحالية
        </button>
      </div>

      {loadingDefault && <p className="muted">جار تحميل البيانات الافتراضية...</p>}

      {!questionSet && !loadingDefault && (
        <p className="error-box">لا توجد بيانات أسئلة حالياً.</p>
      )}

      {questionSet && stats && (
        <>
          <div className="stats-grid">
            <article>
              <h3>إجمالي الأسئلة</h3>
              <strong>{stats.total}</strong>
            </article>
            <article>
              <h3>تحتاج مراجعة</h3>
              <strong>{stats.needsReview}</strong>
            </article>
            <article>
              <h3>بدون إجابة صحيحة</h3>
              <strong>{stats.withoutAnswerKey}</strong>
            </article>
          </div>

          <div className="actions-row">
            <Link className="button-link" to="/quiz/practice">
              بدء التدريب
            </Link>
            <Link className="button-link" to="/quiz/exam">
              بدء الامتحان
            </Link>
            <Link className="button-link" to="/story">
              Story Mode
            </Link>
            {isAdmin && (
              <Link className="button-link" to="/review">
                مراجعة وتعديل الأسئلة
              </Link>
            )}
          </div>
        </>
      )}
    </section>
  );
}
