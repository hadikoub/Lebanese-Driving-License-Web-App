import { Link, createSearchParams } from "react-router-dom";
import { useAppState } from "../AppState";
import { buildStoryLevels, isStoryLevelUnlocked } from "../lib/story";

export function StoryPage(): JSX.Element {
  const { questionSet, storyProgress } = useAppState();

  if (!questionSet) {
    return (
      <section className="panel empty-state">
        <p>No question data available. Import a JSON file first.</p>
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
        <h2>Story Mode</h2>
        <span>{levels.length} levels</span>
      </header>
      <p className="muted" style={{ marginTop: 0, fontSize: "0.88rem" }}>
        Each level has up to 30 questions. Score 70% or higher to unlock the next level.
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
                    Completed
                  </span>
                )}
              </div>
              <p>Type: {level.type}</p>
              <p>Questions: {level.questionCount}</p>
              {stat && (
                <>
                  <p>Attempts: {stat.attempts}</p>
                  <p>Best Score: {stat.bestScore}/{stat.bestTotal} ({bestPercent}%)</p>
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
                  Start Level
                </Link>
              ) : (
                <span className="muted" style={{ display: "block", textAlign: "center", padding: "8px 0" }}>
                  🔒 Locked
                </span>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
