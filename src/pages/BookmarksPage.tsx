import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAppState } from "../AppState";
import { SignImage } from "../components/SignImage";
import type { Question } from "../types/qcm";

function getChoiceLabel(choiceIndex: number): string {
  return String.fromCharCode(65 + choiceIndex);
}

function getCorrectAnswerText(question: Question): string {
  if (!question.correctChoiceId) return "غير محدد";
  const choice = question.choices.find((item) => item.id === question.correctChoiceId);
  return choice?.textAr ?? question.correctChoiceId;
}

export function BookmarksPage(): JSX.Element {
  const { questionSet, bookmarkedQuestionIds, toggleQuestionBookmark } = useAppState();

  const bookmarkedQuestions = useMemo(() => {
    if (!questionSet || bookmarkedQuestionIds.length === 0) return [];
    const idSet = new Set(bookmarkedQuestionIds);
    return questionSet.questions.filter((question) => idSet.has(question.id));
  }, [questionSet, bookmarkedQuestionIds]);

  if (!questionSet) {
    return <section className="panel">لا توجد بيانات أسئلة حالياً.</section>;
  }

  return (
    <section className="panel">
      <header className="title-row">
        <h2>الأسئلة المحفوظة</h2>
        <span>{bookmarkedQuestions.length} سؤال</span>
      </header>

      <div className="actions-row">
        <Link className="button-link" to="/quiz/practice">
          التدريب على الأسئلة المحفوظة
        </Link>
      </div>

      {bookmarkedQuestions.length === 0 && (
        <p className="muted">لا توجد أسئلة محفوظة بعد. يمكنك حفظ أي سؤال أثناء التدريب أو الامتحان.</p>
      )}

      <div className="question-list">
        {bookmarkedQuestions.map((question) => (
          <article key={question.id} className="result-item bookmark-item">
            <div className="bookmark-title-row">
              <h3>{question.promptAr}</h3>
              <button
                type="button"
                className="danger-button"
                onClick={() => toggleQuestionBookmark(question.id)}
              >
                إزالة من المحفوظات
              </button>
            </div>

            {question.signPath && (
              <figure className="question-sign small">
                <SignImage src={question.signPath} alt="إشارة مرورية مرتبطة بالسؤال" loading="lazy" />
              </figure>
            )}

            <p>
              <strong>الإجابة الصحيحة:</strong> {getCorrectAnswerText(question)}
            </p>

            <div className="bookmark-choices">
              {question.choices.map((choice, index) => {
                const isCorrect = question.correctChoiceId === choice.id;
                return (
                  <div key={choice.id} className={`bookmark-choice ${isCorrect ? "correct" : ""}`}>
                    <strong>{getChoiceLabel(index)}</strong>
                    <span>{choice.textAr}</span>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
