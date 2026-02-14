import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAppState } from "../AppState";
import {
  buildQuestionsForQuiz,
  calculateScore,
  firstUnansweredIndex,
  formatDuration,
  getEffectiveQuestionType,
  getCategories,
  getQuestionTypes,
  shuffleItems
} from "../lib/quiz";
import { buildStoryLevels, findStoryLevel } from "../lib/story";
import type { Question, QuizMode } from "../types/qcm";
import type { QuizConfig, QuizSession } from "../types/session";

const DEFAULT_QUESTION_COUNT = 30;
const DEFAULT_TIMER_MINUTES = 30;

function toQuizMode(value: string | undefined): QuizMode | null {
  if (value === "practice" || value === "exam") return value;
  return null;
}

function buildDefaultConfig(questions: Question[]): QuizConfig {
  const categories = getCategories(questions);
  const types = getQuestionTypes(questions);

  return {
    questionCount: DEFAULT_QUESTION_COUNT,
    selectedCategories: categories,
    typeMode: "mixed",
    selectedType: types[0] ?? null,
    timerEnabled: true,
    timerMinutes: DEFAULT_TIMER_MINUTES
  };
}

export function QuizPage(): JSX.Element {
  const { questionSet, setLastResult, recordStoryResult } = useAppState();
  const { mode: modeParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mode = toQuizMode(modeParam);
  const storyLevelId = searchParams.get("storyLevel");
  const isStoryMode = Boolean(storyLevelId);

  const allQuestions = useMemo(() => questionSet?.questions ?? [], [questionSet]);
  const categories = useMemo(() => getCategories(allQuestions), [allQuestions]);
  const types = useMemo(() => getQuestionTypes(allQuestions), [allQuestions]);
  const storyLevels = useMemo(() => buildStoryLevels(allQuestions), [allQuestions]);
  const storyLevel = useMemo(() => findStoryLevel(storyLevels, storyLevelId), [storyLevels, storyLevelId]);

  const [setupConfig, setSetupConfig] = useState<QuizConfig | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  const [index, setIndex] = useState(0);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"success" | "error" | "info" | null>(null);
  const [brokenSignIds, setBrokenSignIds] = useState<Record<string, boolean>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  useEffect(() => {
    if (!mode) {
      navigate("/");
      return;
    }

    if (!questionSet) return;

    if (isStoryMode && storyLevel) {
      setSetupConfig({
        questionCount: storyLevel.questionCount,
        selectedCategories: categories,
        typeMode: "single",
        selectedType: storyLevel.type,
        timerEnabled: true,
        timerMinutes: DEFAULT_TIMER_MINUTES
      });
      return;
    }

    if (isStoryMode && !storyLevel) {
      setSetupError("تعذر تحميل هذا المستوى. الرجاء العودة إلى Story Mode.");
      return;
    }

    setSetupConfig(buildDefaultConfig(questionSet.questions));
  }, [mode, navigate, questionSet, isStoryMode, storyLevel, categories]);

  const startQuiz = useCallback(() => {
    if (!mode || !setupConfig || !questionSet) return;

    let chosenQuestions: Question[] = [];
    if (isStoryMode && storyLevel) {
      const allowedIds = new Set(storyLevel.questionIds);
      const scoped = questionSet.questions.filter((question) => allowedIds.has(question.id));
      chosenQuestions = shuffleItems(scoped);
    } else {
      chosenQuestions = buildQuestionsForQuiz(questionSet.questions, setupConfig);
    }

    if (chosenQuestions.length === 0) {
      setSetupError("لا توجد أسئلة مطابقة للإعدادات المختارة.");
      return;
    }

    const startedAt = new Date().toISOString();
    setSession({
      mode,
      answers: {},
      startedAt,
      finishedAt: null,
      questionIds: chosenQuestions.map((question) => question.id),
      config: setupConfig
    });
    setQuizQuestions(chosenQuestions);
    setFeedback(null);
    setFeedbackTone(null);
    setIndex(0);
    setSetupError(null);
    setBrokenSignIds({});
    setRemainingSeconds(Math.max(1, setupConfig.timerMinutes * 60));
  }, [mode, setupConfig, questionSet, isStoryMode, storyLevel]);

  useEffect(() => {
    if (!isStoryMode || !setupConfig || session || !storyLevel) return;
    startQuiz();
  }, [isStoryMode, setupConfig, session, storyLevel, startQuiz]);

  const finishQuiz = useCallback(
    (timedOut: boolean) => {
      if (!mode || !session) return;

      const finishedAt = new Date().toISOString();
      const score = calculateScore(quizQuestions, session.answers);
      const elapsedSeconds = Math.max(
        0,
        Math.floor((new Date(finishedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)
      );

      setLastResult({
        mode,
        answers: session.answers,
        score,
        total: quizQuestions.length,
        startedAt: session.startedAt,
        finishedAt,
        elapsedSeconds,
        timedOut,
        questionIds: quizQuestions.map((question) => question.id),
        config: session.config,
        storyLevelId: storyLevelId ?? null
      });

      if (storyLevelId) {
        recordStoryResult(storyLevelId, score, quizQuestions.length);
      }

      navigate("/results");
    },
    [mode, session, quizQuestions, setLastResult, navigate, storyLevelId, recordStoryResult]
  );

  useEffect(() => {
    if (!session || !session.config.timerEnabled) return;

    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          finishQuiz(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [session?.startedAt, session?.config.timerEnabled, finishQuiz]);

  if (!questionSet || !mode || !setupConfig) {
    return <section className="panel">لا توجد جلسة اختبار جاهزة.</section>;
  }

  if (!session) {
    return (
      <section className="panel">
        <header className="title-row">
          <h2>{mode === "practice" ? "إعداد وضع التدريب" : "إعداد وضع الامتحان"}</h2>
          <span>إجمالي الأسئلة المتاحة: {allQuestions.length}</span>
        </header>

        {isStoryMode ? (
          <div className="story-intro">
            <p>
              مستوى القصة: <strong>{storyLevelId}</strong>
            </p>
            <p>
              العنوان: <strong>{storyLevel?.label ?? "-"}</strong>
            </p>
            <p>
              النوع: <strong>{storyLevel?.type ?? "-"}</strong>
            </p>
            <p className="muted">
              سيتم بدء المستوى تلقائياً: {storyLevel?.questionCount ?? DEFAULT_QUESTION_COUNT} سؤال +
              مؤقت 30 دقيقة.
            </p>
          </div>
        ) : (
          <>
            <div className="setup-grid">
              <label>
                عدد الأسئلة
                <input
                  type="number"
                  min={1}
                  max={allQuestions.length}
                  value={setupConfig.questionCount}
                  onChange={(event) => {
                    const value = Number.parseInt(event.target.value, 10);
                    if (Number.isNaN(value)) return;
                    setSetupConfig((current) => (current ? { ...current, questionCount: value } : current));
                  }}
                />
              </label>

              <label className="inline-checkbox">
                <input
                  type="checkbox"
                  checked={setupConfig.timerEnabled}
                  onChange={(event) => {
                    const timerEnabled = event.target.checked;
                    setSetupConfig((current) => (current ? { ...current, timerEnabled } : current));
                  }}
                />
                تفعيل المؤقت
              </label>

              {setupConfig.timerEnabled && (
                <label>
                  مدة المؤقت (دقائق)
                  <input
                    type="number"
                    min={1}
                    max={240}
                    value={setupConfig.timerMinutes}
                    onChange={(event) => {
                      const value = Number.parseInt(event.target.value, 10);
                      if (Number.isNaN(value)) return;
                      setSetupConfig((current) =>
                        current
                          ? {
                              ...current,
                              timerMinutes: value
                            }
                          : current
                      );
                    }}
                  />
                </label>
              )}
            </div>

            <div className="setup-block">
              <h3>اختيار النوع</h3>
              <label className="inline-checkbox">
                <input
                  type="radio"
                  checked={setupConfig.typeMode === "mixed"}
                  onChange={() => {
                    setSetupConfig((current) =>
                      current
                        ? {
                            ...current,
                            typeMode: "mixed"
                          }
                        : current
                    );
                  }}
                />
                مختلط
              </label>

              <label className="inline-checkbox">
                <input
                  type="radio"
                  checked={setupConfig.typeMode === "single"}
                  onChange={() => {
                    setSetupConfig((current) =>
                      current
                        ? {
                            ...current,
                            typeMode: "single",
                            selectedType: current.selectedType ?? types[0] ?? null
                          }
                        : current
                    );
                  }}
                />
                نوع واحد فقط
              </label>

              {setupConfig.typeMode === "single" && (
                <label>
                  اختر النوع
                  <select
                    value={setupConfig.selectedType ?? ""}
                    onChange={(event) => {
                      setSetupConfig((current) =>
                        current
                          ? {
                              ...current,
                              selectedType: event.target.value || null
                            }
                          : current
                      );
                    }}
                  >
                    {types.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="setup-block">
              <h3>الفئات</h3>
              <div className="setup-categories">
                {categories.map((category) => {
                  const selected = setupConfig.selectedCategories.includes(category);
                  return (
                    <label key={category} className="inline-checkbox">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) => {
                          setSetupConfig((current) => {
                            if (!current) return current;
                            const currentCategories = new Set(current.selectedCategories);
                            if (event.target.checked) {
                              currentCategories.add(category);
                            } else {
                              currentCategories.delete(category);
                            }

                            return {
                              ...current,
                              selectedCategories: [...currentCategories]
                            };
                          });
                        }}
                      />
                      {category}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="actions-row">
              <button type="button" onClick={startQuiz}>
                بدء {mode === "practice" ? "التدريب" : "الامتحان"}
              </button>
            </div>
          </>
        )}

        {setupError && <p className="error-box">{setupError}</p>}
      </section>
    );
  }

  const current = quizQuestions[index];
  if (!current) {
    return <section className="panel">لا توجد أسئلة متاحة.</section>;
  }

  function selectChoice(choiceId: string): void {
    setSession((currentSession) => {
      if (!currentSession) return currentSession;
      return {
        ...currentSession,
        answers: { ...currentSession.answers, [current.id]: choiceId }
      };
    });

    if (mode === "practice") {
      if (!current.correctChoiceId) {
        setFeedback("لا توجد إجابة صحيحة محددة لهذا السؤال");
        setFeedbackTone("info");
      } else if (choiceId === current.correctChoiceId) {
        setFeedback("إجابة صحيحة");
        setFeedbackTone("success");
      } else {
        setFeedback(`إجابة غير صحيحة. الصحيح هو: ${current.correctChoiceId}`);
        setFeedbackTone("error");
      }
    } else {
      setFeedback(null);
      setFeedbackTone(null);
    }
  }

  function nextQuestion(): void {
    setFeedback(null);
    setFeedbackTone(null);
    if (index >= quizQuestions.length - 1) {
      finishQuiz(false);
      return;
    }
    setIndex((currentIndex) => currentIndex + 1);
  }

  const unanswered = firstUnansweredIndex(quizQuestions, session.answers);
  const selectedChoice = session.answers[current.id];

  return (
    <section className="panel">
      <header className="title-row">
        <h2>{mode === "practice" ? "وضع التدريب" : "وضع الامتحان"}</h2>
        <span>
          السؤال {index + 1} من {quizQuestions.length}
        </span>
      </header>

      <div className="quiz-meta-row">
        <span>النوع: {getEffectiveQuestionType(current)}</span>
        <span>الفئة: {current.category ?? "-"}</span>
        {session.config.timerEnabled && <strong>الوقت المتبقي: {formatDuration(remainingSeconds)}</strong>}
      </div>

      <article className="quiz-card">
        <h3>{current.promptAr}</h3>
        {current.signPath && !brokenSignIds[current.id] && (
          <figure className="question-sign">
            <img
              src={current.signPath}
              alt="إشارة مرورية مرتبطة بالسؤال"
              loading="lazy"
              onError={() => {
                setBrokenSignIds((state) => ({
                  ...state,
                  [current.id]: true
                }));
              }}
            />
          </figure>
        )}
        {current.signPath && brokenSignIds[current.id] && (
          <p className="muted">تعذر تحميل صورة الإشارة لهذا السؤال.</p>
        )}

        <div className="choices-column">
          {current.choices.map((choice) => {
            let choiceClassName = `choice-btn ${selectedChoice === choice.id ? "selected" : ""}`;

            if (mode === "practice" && selectedChoice && current.correctChoiceId) {
              if (choice.id === selectedChoice && selectedChoice !== current.correctChoiceId) {
                choiceClassName += " wrong";
              }
              if (choice.id === current.correctChoiceId) {
                choiceClassName += " correct";
              }
            }

            return (
              <button
                className={choiceClassName}
                key={choice.id}
                type="button"
                onClick={() => selectChoice(choice.id)}
              >
                <strong>{choice.id}</strong>
                <span>{choice.textAr}</span>
              </button>
            );
          })}
        </div>

        {feedback && <p className={`feedback-box ${feedbackTone ?? ""}`}>{feedback}</p>}

        <div className="actions-row">
          <button type="button" onClick={nextQuestion}>
            {index >= quizQuestions.length - 1 ? "إنهاء" : "التالي"}
          </button>
          <button type="button" onClick={() => finishQuiz(false)}>
            إنهاء الاختبار الآن
          </button>
        </div>
      </article>

      {mode === "exam" && unanswered !== null && (
        <p className="muted">أول سؤال غير مجاب: {unanswered + 1}</p>
      )}
    </section>
  );
}
