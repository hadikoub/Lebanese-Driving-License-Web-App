import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAppState } from "../AppState";
import { SignImage } from "../components/SignImage";
import { confirmAction } from "../lib/confirm";
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
const MIN_QUESTION_COUNT = 1;
const MIN_TIMER_MINUTES = 1;
const MAX_TIMER_MINUTES = 240;

function getChoiceLabel(choiceIndex: number): string {
  return String.fromCharCode(65 + choiceIndex);
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sanitizeDigits(value: string): string {
  return value.replace(/[^\d]/g, "");
}

function findChoiceText(question: Question, choiceId: string | null | undefined): string | null {
  if (!choiceId) return null;
  return question.choices.find((choice) => choice.id === choiceId)?.textAr ?? null;
}

function formatChoiceWithText(question: Question, choiceId: string | null | undefined): string {
  if (!choiceId) return "غير محدد";
  const text = findChoiceText(question, choiceId);
  if (!text) return choiceId;
  return text;
}

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
    typeMode: "selected",
    selectedType: types[0] ?? null,
    selectedTypes: types,
    bookmarkedOnly: false,
    timerEnabled: true,
    timerMinutes: DEFAULT_TIMER_MINUTES
  };
}

export function QuizPage(): JSX.Element {
  const {
    questionSet,
    setLastResult,
    recordStoryResult,
    bookmarkedQuestionIds,
    toggleQuestionBookmark
  } = useAppState();
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
  const [questionCountInput, setQuestionCountInput] = useState<string>(String(DEFAULT_QUESTION_COUNT));
  const [timerMinutesInput, setTimerMinutesInput] = useState<string>(String(DEFAULT_TIMER_MINUTES));

  const [index, setIndex] = useState(0);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"success" | "error" | "info" | null>(null);
  const [brokenSignIds, setBrokenSignIds] = useState<Record<string, boolean>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  useEffect(() => {
    if (!setupConfig) return;
    setQuestionCountInput(String(setupConfig.questionCount));
    setTimerMinutesInput(String(setupConfig.timerMinutes));
  }, [setupConfig?.questionCount, setupConfig?.timerMinutes]);

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
        selectedTypes: [storyLevel.type],
        bookmarkedOnly: false,
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
      if (setupConfig.bookmarkedOnly && bookmarkedQuestionIds.length === 0) {
        setSetupError("لا توجد أسئلة محفوظة بعد.");
        return;
      }
      chosenQuestions = buildQuestionsForQuiz(
        questionSet.questions,
        setupConfig,
        new Set(bookmarkedQuestionIds)
      );
    }

    if (chosenQuestions.length === 0) {
      setSetupError("لا توجد أسئلة مطابقة للإعدادات المختارة.");
      return;
    }

    const questionsWithShuffledChoices = chosenQuestions.map((question) => ({
      ...question,
      choices: shuffleItems(question.choices)
    }));

    const startedAt = new Date().toISOString();
    setSession({
      mode,
      answers: {},
      startedAt,
      finishedAt: null,
      questionIds: questionsWithShuffledChoices.map((question) => question.id),
      config: setupConfig
    });
    setQuizQuestions(questionsWithShuffledChoices);
    setFeedback(null);
    setFeedbackTone(null);
    setIndex(0);
    setSetupError(null);
    setBrokenSignIds({});
    setRemainingSeconds(Math.max(1, clampInteger(setupConfig.timerMinutes, MIN_TIMER_MINUTES, MAX_TIMER_MINUTES) * 60));
  }, [mode, setupConfig, questionSet, isStoryMode, storyLevel, bookmarkedQuestionIds]);

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
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  enterKeyHint="done"
                  value={questionCountInput}
                  onChange={(event) => {
                    const digits = sanitizeDigits(event.target.value);
                    setQuestionCountInput(digits);
                    if (!digits) return;
                    const value = clampInteger(
                      Number.parseInt(digits, 10),
                      MIN_QUESTION_COUNT,
                      Math.max(allQuestions.length, MIN_QUESTION_COUNT)
                    );
                    setSetupConfig((current) => (current ? { ...current, questionCount: value } : current));
                  }}
                  onBlur={() => {
                    const digits = sanitizeDigits(questionCountInput);
                    const value = digits
                      ? clampInteger(
                          Number.parseInt(digits, 10),
                          MIN_QUESTION_COUNT,
                          Math.max(allQuestions.length, MIN_QUESTION_COUNT)
                        )
                      : setupConfig.questionCount;
                    setSetupConfig((current) => (current ? { ...current, questionCount: value } : current));
                    setQuestionCountInput(String(value));
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
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    enterKeyHint="done"
                    value={timerMinutesInput}
                    onChange={(event) => {
                      const digits = sanitizeDigits(event.target.value);
                      setTimerMinutesInput(digits);
                      if (!digits) return;
                      const value = clampInteger(
                        Number.parseInt(digits, 10),
                        MIN_TIMER_MINUTES,
                        MAX_TIMER_MINUTES
                      );
                      setSetupConfig((current) => (current ? { ...current, timerMinutes: value } : current));
                    }}
                    onBlur={() => {
                      const digits = sanitizeDigits(timerMinutesInput);
                      const value = digits
                        ? clampInteger(Number.parseInt(digits, 10), MIN_TIMER_MINUTES, MAX_TIMER_MINUTES)
                        : setupConfig.timerMinutes;
                      setSetupConfig((current) => (current ? { ...current, timerMinutes: value } : current));
                      setTimerMinutesInput(String(value));
                    }}
                  />
                </label>
              )}
            </div>

            <div className="setup-block">
              <h3>اختيار نوع الأسئلة</h3>
              <label className="inline-checkbox">
                <input
                  type="radio"
                  checked={setupConfig.typeMode === "mixed"}
                  onChange={() => {
                    setSetupConfig((current) =>
                      current
                        ? {
                            ...current,
                            typeMode: "mixed",
                            selectedTypes: types,
                            selectedType: types[0] ?? null
                          }
                        : current
                    );
                  }}
                />
                كل الأنواع (مختلط)
              </label>

              <label className="inline-checkbox">
                <input
                  type="radio"
                  checked={setupConfig.typeMode === "selected"}
                  onChange={() => {
                    setSetupConfig((current) =>
                      current
                        ? {
                            ...current,
                            typeMode: "selected",
                            selectedTypes: current.selectedTypes ?? types,
                            selectedType: (current.selectedTypes ?? types)[0] ?? null
                          }
                        : current
                    );
                  }}
                />
                اختيار أنواع محددة
              </label>

              {setupConfig.typeMode === "selected" && (
                <div className="setup-categories">
                  {types.map((type) => {
                    const selected = (setupConfig.selectedTypes ?? []).includes(type);
                    return (
                      <label key={type} className="inline-checkbox">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(event) => {
                            setSetupConfig((current) => {
                              if (!current) return current;
                              const next = new Set(current.selectedTypes ?? []);
                              if (event.target.checked) {
                                next.add(type);
                              } else {
                                next.delete(type);
                              }

                              const selectedTypes = types.filter((item) => next.has(item));
                              return {
                                ...current,
                                selectedTypes,
                                selectedType: selectedTypes[0] ?? null
                              };
                            });
                          }}
                        />
                        {type}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {mode === "practice" && (
              <div className="setup-block">
                <h3>المحفوظات</h3>
                <label className="inline-checkbox">
                  <input
                    type="checkbox"
                    checked={Boolean(setupConfig.bookmarkedOnly)}
                    onChange={(event) => {
                      const bookmarkedOnly = event.target.checked;
                      setSetupConfig((current) => (current ? { ...current, bookmarkedOnly } : current));
                    }}
                  />
                  تدريب على الأسئلة المحفوظة فقط
                </label>
                <p className="muted">عدد الأسئلة المحفوظة: {bookmarkedQuestionIds.length}</p>
              </div>
            )}

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
        setFeedback(`إجابة صحيحة: ${formatChoiceWithText(current, choiceId)}`);
        setFeedbackTone("success");
      } else {
        setFeedback(
          `إجابة غير صحيحة. اختيارك: ${formatChoiceWithText(current, choiceId)} | الصحيح: ${formatChoiceWithText(current, current.correctChoiceId)}`
        );
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
      const confirmed = confirmAction("هل أنت متأكد من إنهاء الاختبار وعرض النتيجة؟");
      if (!confirmed) return;
      finishQuiz(false);
      return;
    }
    setIndex((currentIndex) => currentIndex + 1);
  }

  const unanswered = firstUnansweredIndex(quizQuestions, session.answers);
  const selectedChoice = session.answers[current.id];
  const isBookmarked = bookmarkedQuestionIds.includes(current.id);

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
        <div className="quiz-card-header">
          <h3 className="quiz-title">{current.promptAr}</h3>
          <button
            type="button"
            className={`bookmark-toggle ${isBookmarked ? "active" : ""}`}
            onClick={() => toggleQuestionBookmark(current.id)}
          >
            {isBookmarked ? "محفوظ" : "حفظ السؤال"}
          </button>
        </div>
        {current.signPath && !brokenSignIds[current.id] && (
          <figure className="question-sign">
            <SignImage
              src={current.signPath}
              alt="إشارة مرورية مرتبطة بالسؤال"
              loading="lazy"
              onExhausted={() => {
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
          {current.choices.map((choice, choiceIndex) => {
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
                <strong>{getChoiceLabel(choiceIndex)}</strong>
                <span>{choice.textAr}</span>
              </button>
            );
          })}
        </div>

        {feedback && <p className={`feedback-box ${feedbackTone ?? ""}`}>{feedback}</p>}

        <div className="actions-row primary-actions">
          <button type="button" onClick={nextQuestion}>
            {index >= quizQuestions.length - 1 ? "إنهاء" : "التالي"}
          </button>
        </div>

        <div className="quiz-danger-zone">
          <button
            type="button"
            className="danger-button"
            onClick={() => {
              const confirmed = confirmAction("هل تريد إنهاء الاختبار الآن؟ سيتم حفظ الإجابات الحالية.");
              if (!confirmed) return;
              finishQuiz(false);
            }}
          >
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
