import { Link, createSearchParams } from "react-router-dom";
import { useAppState } from "../AppState";
import { buildStoryLevels, isStoryLevelUnlocked } from "../lib/story";

export function StoryPage(): JSX.Element {
  const { questionSet, storyProgress } = useAppState();

  if (!questionSet) {
    return <section className="panel">لا توجد بيانات أسئلة حالياً. استورد ملف JSON أولاً.</section>;
  }

  const levels = buildStoryLevels(questionSet.questions);
  if (levels.length === 0) {
    return <section className="panel">لا توجد أنواع أسئلة كافية لتوليد مستويات القصة.</section>;
  }

  return (
    <section className="panel">
      <h2>Story Mode</h2>
      <p className="muted">
        المستويات تغطي كل الأسئلة: كل مستوى يحتوي حتى 30 سؤال من نوع محدد. النجاح من 70% لفتح
        المستوى التالي.
      </p>

      <div className="story-grid">
        {levels.map((level, index) => {
          const unlocked = isStoryLevelUnlocked(levels, index, storyProgress);
          const stat = storyProgress.levels[level.id];
          const link = `/quiz/exam?${createSearchParams({
            storyLevel: level.id
          }).toString()}`;
          const doneLabel = stat?.completed ? "منجز" : "غير منجز";

          return (
            <article key={level.id} className={`story-card ${unlocked ? "" : "locked"}`}>
              <h3>{level.label}</h3>
              <p>النوع: {level.type}</p>
              <p>عدد الأسئلة: {level.questionCount}</p>
              <p>الحالة: {doneLabel}</p>
              <p>المحاولات: {stat?.attempts ?? 0}</p>
              <p>
                أفضل نتيجة: {stat ? `${stat.bestScore}/${stat.bestTotal}` : "لا يوجد"}
              </p>

              {unlocked ? (
                <Link className="button-link" to={link}>
                  بدء المستوى
                </Link>
              ) : (
                <span className="muted">مغلق حتى إنهاء المستوى السابق</span>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
