import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAppState } from "../AppState";

export function HomePage(): JSX.Element {
  const { questionSet, loadingDefault } = useAppState();

  const stats = useMemo(() => {
    if (!questionSet) return null;

    const total = questionSet.questions.length;
    const needsReview = questionSet.questions.filter((item) => item.needsReview).length;
    const withoutAnswerKey = questionSet.questions.filter((item) => !item.correctChoiceId).length;

    return { total, needsReview, withoutAnswerKey };
  }, [questionSet]);

  return (
    <>
      {loadingDefault && (
        <section className="panel">
          <p className="muted">Loading default data...</p>
        </section>
      )}

      {!questionSet && !loadingDefault && (
        <section className="panel">
          <p className="error-box">No question data available.</p>
        </section>
      )}

      {questionSet && stats && (
        <>
          <section className="panel">
            <div className="stats-grid">
              <article>
                <h3>Questions</h3>
                <strong>{stats.total}</strong>
              </article>
              <article>
                <h3>Needs Review</h3>
                <strong>{stats.needsReview}</strong>
              </article>
              <article>
                <h3>No Answer</h3>
                <strong>{stats.withoutAnswerKey}</strong>
              </article>
            </div>
          </section>

          <section className="panel">
            <div className="dashboard-grid">
              <Link className="dashboard-card" to="/quiz/practice">
                <div className="dashboard-card-icon teal">📖</div>
                <span className="dashboard-card-label">Practice</span>
              </Link>
              <Link className="dashboard-card" to="/quiz/exam">
                <div className="dashboard-card-icon blue">📝</div>
                <span className="dashboard-card-label">Exam</span>
              </Link>
              <Link className="dashboard-card" to="/bookmarks">
                <div className="dashboard-card-icon amber">⭐</div>
                <span className="dashboard-card-label">Saved Questions</span>
              </Link>
              <Link className="dashboard-card" to="/story">
                <div className="dashboard-card-icon purple">⚡</div>
                <span className="dashboard-card-label">Story Mode</span>
              </Link>
              <Link className="dashboard-card" to="/signs/flashcards">
                <div className="dashboard-card-icon emerald">🪧</div>
                <span className="dashboard-card-label">Sign Flashcards</span>
              </Link>
              <Link className="dashboard-card" to="/signs/quiz">
                <div className="dashboard-card-icon rose">🚦</div>
                <span className="dashboard-card-label">Sign Quiz</span>
              </Link>
            </div>
          </section>
        </>
      )}
    </>
  );
}
