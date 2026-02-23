import { Link, createSearchParams } from "react-router-dom";
import { useAppState } from "../AppState";
import { useI18n } from "../i18n";
import { buildStoryLevels, isStoryLevelUnlocked } from "../lib/story";

export function StoryPage(): JSX.Element {
  const { t } = useI18n();
  const { questionSet, storyProgress } = useAppState();

  if (!questionSet) {
    return (
      <section className="panel empty-state">
        <p>{t("noDataAvailable")}</p>
      </section>
    );
  }

  const levels = buildStoryLevels(questionSet.questions);
  if (levels.length === 0) {
    return (
      <section className="panel empty-state">
        <p>Not enough question types to generate story levels.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <header className="title-row">
        <h2>{t("storyMode")}</h2>
        <span>{levels.length} {t("levels")}</span>
      </header>
      <p className="muted" style={{ marginTop: 0, fontSize: "0.88rem" }}>
        {t("storyExplanation")}
      </p>

      <div className="story-grid">
        {levels.map((level, levelIndex) => {
          const unlocked = isStoryLevelUnlocked(levels, levelIndex, storyProgress);
          const stat = storyProgress.levels[level.id];
          const link = `/quiz/exam?${createSearchParams({
            storyLevel: level.id
          }).toString()}`;

          const bestPercent = stat
            ? Math.round((stat.bestScore / Math.max(stat.bestTotal, 1)) * 100)
            : 0;

          return (
            <article key={level.id} className={`story-card ${unlocked ? "" : "locked"}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3>{level.label}</h3>
                {stat?.completed && (
                  <span style={{
                    background: "#d1fae5",
                    color: "#059669",
                    padding: "2px 10px",
                    borderRadius: "999px",
                    fontSize: "0.8rem",
                    fontWeight: 600
                  }}>
                    {t("completed")}
                  </span>
                )}
              </div>
              <p>{t("type")}: {level.type}</p>
              <p>{t("questionsCount")}: {level.questionCount}</p>
              {stat && (
                <>
                  <p>{t("attempts")}: {stat.attempts}</p>
                  <p>{t("bestScore")}: {stat.bestScore}/{stat.bestTotal} ({bestPercent}%)</p>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${bestPercent}%`,
                        background: bestPercent >= 70 ? "var(--success)" : "var(--warning)"
                      }}
                    />
                  </div>
                </>
              )}

              {unlocked ? (
                <Link className="button-link btn-block" to={link}>
                  {t("startLevel")}
                </Link>
              ) : (
                <span className="muted" style={{ display: "block", textAlign: "center", padding: "8px 0" }}>
                  {t("locked")}
                </span>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
