import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAppState } from "../AppState";
import { SignImage } from "../components/SignImage";

export function ReviewPage(): JSX.Element {
  const { questionSet, updateQuestion, isAdmin } = useAppState();
  const [showOnlyNeedsReview, setShowOnlyNeedsReview] = useState(false);

  const visibleQuestions = useMemo(() => {
    if (!questionSet) return [];
    if (!showOnlyNeedsReview) return questionSet.questions;
    return questionSet.questions.filter((question) => question.needsReview);
  }, [questionSet, showOnlyNeedsReview]);

  if (!questionSet) {
    return <section className="panel">لا توجد بيانات حالياً. ارجع للرئيسية للاستيراد.</section>;
  }

  if (!isAdmin) {
    return (
      <section className="panel">
        <h2>هذه الصفحة للمشرف فقط</h2>
        <p className="muted">قم بتفعيل Admin Mode لتعديل الأسئلة.</p>
        <Link className="button-link" to="/admin">
          الذهاب إلى Admin Mode
        </Link>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="title-row">
        <h2>مراجعة الأسئلة</h2>
        <label className="inline-checkbox">
          <input
            type="checkbox"
            checked={showOnlyNeedsReview}
            onChange={(event) => setShowOnlyNeedsReview(event.target.checked)}
          />
          عرض الأسئلة التي تحتاج مراجعة فقط
        </label>
      </div>

      <p className="muted">
        عدّل نص السؤال والخيارات، ثم اختر الإجابة الصحيحة. أي سؤال يحتاج تدقيق اتركه مع خيار
        "يحتاج مراجعة".
      </p>

      <div className="question-list">
        {visibleQuestions.map((question) => (
          <article className="question-editor" key={question.id}>
            <header>
              <h3>
                سؤال {question.sourceNumber ?? "؟"} - صفحة {question.sourcePage}
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
                يحتاج مراجعة
              </label>
            </header>

            <label>
              نص السؤال
              <textarea
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
                <SignImage src={question.signPath} alt="إشارة مرورية مرتبطة بالسؤال" loading="lazy" />
              </figure>
            )}

            <label>
              مسار صورة الإشارة (اختياري)
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
              {question.choices.map((choice, index) => (
                <label key={choice.id}>
                  الخيار {index + 1} ({choice.id})
                  <input
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
              الإجابة الصحيحة
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
                <option value="">غير محددة</option>
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
