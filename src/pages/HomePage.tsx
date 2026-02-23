import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAppState } from "../AppState";
import { useI18n } from "../i18n";

export function HomePage(): JSX.Element {
  const { t } = useI18n();
  const { questionSet, loadingDefault } = useAppState();

  const totalCount = useMemo(() => {
    if (!questionSet) return 0;
    return questionSet.questions.length;
  }, [questionSet]);

  return (
    <>
      {loadingDefault && (
        <section className="panel">
          <p className="muted">{t("loadingData")}</p>
        </section>
      )}

      {!questionSet && !loadingDefault && (
        <section className="panel">
          <p className="error-box">{t("noDataAvailable")}</p>
        </section>
      )}

      {questionSet && (
        <>
          <section className="panel">
            <div className="stats-grid">
              <article>
                <h3>{t("totalQuestions")}</h3>
                <strong>{totalCount}</strong>
              </article>
            </div>
          </section>

          <section className="panel">
            <div className="dashboard-grid">
              <Link className="dashboard-card" to="/quiz/practice">
                <div className="dashboard-card-icon teal">📖</div>
                <span className="dashboard-card-label">{t("practice")}</span>
              </Link>
              <Link className="dashboard-card" to="/quiz/exam">
                <div className="dashboard-card-icon blue">📝</div>
                <span className="dashboard-card-label">{t("exam")}</span>
              </Link>
              <Link className="dashboard-card" to="/bookmarks">
                <div className="dashboard-card-icon amber">⭐</div>
                <span className="dashboard-card-label">{t("savedQuestions")}</span>
              </Link>
              <Link className="dashboard-card" to="/story">
                <div className="dashboard-card-icon purple">⚡</div>
                <span className="dashboard-card-label">{t("storyMode")}</span>
              </Link>
              <Link className="dashboard-card" to="/signs/flashcards">
                <div className="dashboard-card-icon emerald">🪧</div>
                <span className="dashboard-card-label">{t("signFlashcards")}</span>
              </Link>
              <Link className="dashboard-card" to="/signs/quiz">
                <div className="dashboard-card-icon rose">🚦</div>
                <span className="dashboard-card-label">{t("signQuiz")}</span>
              </Link>
            </div>
          </section>
        </>
      )}
    </>
  );
}
