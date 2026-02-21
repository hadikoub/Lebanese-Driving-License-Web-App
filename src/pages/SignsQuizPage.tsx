import { useCallback, useEffect, useMemo, useState } from "react";
import { SignImage } from "../components/SignImage";
import { ConfirmModal } from "../components/Modal";
import {
  filterSignsQuizByTypes,
  formatDuration,
  getSignTypes,
  shuffleItems
} from "../lib/signs";
import type { SignQuizQuestion, SignQuizSet, SignsQuizMode } from "../types/signs";

const DEFAULT_QUESTION_COUNT = 30;
const DEFAULT_DURATION_MINUTES = 30;
const MIN_QUESTION_COUNT = 1;
const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 240;

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sanitizeDigits(value: string): string {
  return value.replace(/[^\d]/g, "");
}

interface SignsQuizConfig {
  mode: SignsQuizMode;
  selectedTypes: string[];
  questionCount: number;
  durationMinutes: number;
}

interface SignsQuizResult {
  mode: SignsQuizMode;
  score: number;
  total: number;
  elapsedSeconds: number;
  timedOut: boolean;
  answers: Record<string, number>;
  questionIds: string[];
}

function isSignQuizSet(value: unknown): value is SignQuizSet {
  if (!value || typeof value !== "object") return false;
  const candidate = value as SignQuizSet;
  return (
    typeof candidate.id === "string" &&
    Array.isArray(candidate.questions) &&
    candidate.questions.every(
      (question) =>
        question &&
        typeof question.id === "string" &&
        typeof question.sourceId === "number" &&
        typeof question.type === "string" &&
        typeof question.imagePath === "string" &&
        Array.isArray(question.optionsAr) &&
        question.optionsAr.every((option) => typeof option === "string") &&
        typeof question.correctOptionIndex === "number" &&
        typeof question.correctAnswerAr === "string"
    )
  );
}

function calculateScore(questions: SignQuizQuestion[], answers: Record<string, number>): number {
  return questions.reduce((score, question) => {
    return answers[question.id] === question.correctOptionIndex ? score + 1 : score;
  }, 0);
}

function shuffleQuestionOptions(question: SignQuizQuestion): SignQuizQuestion {
  const indexedOptions = question.optionsAr.map((text, originalIndex) => ({
    text,
    originalIndex
  }));
  const shuffledOptions = shuffleItems(indexedOptions);
  const correctOptionIndex = shuffledOptions.findIndex(
    (option) => option.originalIndex === question.correctOptionIndex
  );

  return {
    ...question,
    optionsAr: shuffledOptions.map((option) => option.text),
    correctOptionIndex: correctOptionIndex >= 0 ? correctOptionIndex : question.correctOptionIndex
  };
}

export function SignsQuizPage(): JSX.Element {
  const [quizSet, setQuizSet] = useState<SignQuizSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [config, setConfig] = useState<SignsQuizConfig | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [questionCountInput, setQuestionCountInput] = useState<string>(String(DEFAULT_QUESTION_COUNT));
  const [durationInput, setDurationInput] = useState<string>(String(DEFAULT_DURATION_MINUTES));

  const [active, setActive] = useState(false);
  const [questions, setQuestions] = useState<SignQuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"success" | "error" | null>(null);
  const [result, setResult] = useState<SignsQuizResult | null>(null);

  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    if (!config) return;
    setQuestionCountInput(String(config.questionCount));
    setDurationInput(String(config.durationMinutes));
  }, [config?.questionCount, config?.durationMinutes]);

  const types = useMemo(() => getSignTypes(quizSet?.questions ?? []), [quizSet]);

  useEffect(() => {
    let disposed = false;

    async function loadData(): Promise<void> {
      try {
        const response = await fetch("/data/signs.quiz.ar.generated.json", { cache: "no-cache" });
        if (!response.ok) {
          throw new Error("Failed to load sign quiz data.");
        }

        const payload = (await response.json()) as unknown;
        if (!isSignQuizSet(payload)) {
          throw new Error("Invalid sign quiz data format.");
        }

        if (disposed) return;
        setQuizSet(payload);
        const availableTypes = getSignTypes(payload.questions);
        setConfig({
          mode: "practice",
          selectedTypes: availableTypes,
          questionCount: Math.min(DEFAULT_QUESTION_COUNT, payload.questions.length),
          durationMinutes: DEFAULT_DURATION_MINUTES
        });
        setLoadError(null);
      } catch (error) {
        if (disposed) return;
        const message = error instanceof Error ? error.message : "Failed to load sign quiz data.";
        setLoadError(`${message} Run npm run extract:signs and try again.`);
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      disposed = true;
    };
  }, []);

  const finishQuiz = useCallback(
    (timedOut: boolean) => {
      if (!config) return;
      const started = startedAtMs ?? Date.now();
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
      setResult({
        mode: config.mode,
        score: calculateScore(questions, answers),
        total: questions.length,
        elapsedSeconds,
        timedOut,
        answers,
        questionIds: questions.map((question) => question.id)
      });
      setActive(false);
      setFeedback(null);
      setFeedbackTone(null);
    },
    [answers, config, questions, startedAtMs]
  );

  useEffect(() => {
    if (!active) return;
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
  }, [active, finishQuiz]);

  function startQuiz(): void {
    if (!quizSet || !config) return;

    const filtered = filterSignsQuizByTypes(quizSet.questions, config.selectedTypes);
    if (filtered.length === 0) {
      setSetupError("No questions match the selected filters.");
      return;
    }

    const count = clampInteger(config.questionCount, MIN_QUESTION_COUNT, filtered.length);
    const selectedQuestions = shuffleItems(filtered).slice(0, count).map(shuffleQuestionOptions);
    setQuestions(selectedQuestions);
    setActive(true);
    setIndex(0);
    setAnswers({});
    setFeedback(null);
    setFeedbackTone(null);
    setRemainingSeconds(Math.max(60, clampInteger(config.durationMinutes, MIN_DURATION_MINUTES, MAX_DURATION_MINUTES) * 60));
    setStartedAtMs(Date.now());
    setResult(null);
    setSetupError(null);
  }

  function selectAnswer(optionIndex: number): void {
    const current = questions[index];
    if (!current || !config) return;

    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [current.id]: optionIndex
    }));

    if (config.mode === "practice") {
      if (optionIndex === current.correctOptionIndex) {
        setFeedback("Correct!");
        setFeedbackTone("success");
      } else {
        setFeedback(`Wrong. Correct answer: ${current.correctAnswerAr}`);
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
    if (index >= questions.length - 1) {
      setShowFinishConfirm(true);
      return;
    }
    setIndex((current) => current + 1);
  }

  if (loading) {
    return <section className="panel">Loading sign quiz...</section>;
  }

  if (loadError || !quizSet || !config) {
    return <section className="panel error-box">{loadError ?? "Sign quiz data not available."}</section>;
  }

  if (!active) {
    const answeredCount = result ? Object.keys(result.answers).length : 0;
    const unansweredCount = result ? Math.max(result.total - answeredCount, 0) : 0;
    const reviewRows = result
      ? questions
          .filter((question) => result.questionIds.includes(question.id))
          .map((question) => ({
            question,
            selectedIndex: result.answers[question.id]
          }))
          .filter((row) => row.selectedIndex !== undefined)
      : [];

    return (
      <section className="panel">
        <header className="title-row">
          <h2>Sign Quiz</h2>
          <span>{quizSet.questions.length} questions</span>
        </header>

        <div className="setup-grid">
          <label>
            Mode
            <select
              value={config.mode}
              onChange={(event) => {
                const value = event.target.value === "exam" ? "exam" : "practice";
                setConfig((current) => (current ? { ...current, mode: value } : current));
              }}
            >
              <option value="practice">Practice (Instant feedback)</option>
              <option value="exam">Exam (Results at end)</option>
            </select>
          </label>

          <label>
            Number of Questions
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
                  Math.max(quizSet.questions.length, MIN_QUESTION_COUNT)
                );
                setConfig((current) => (current ? { ...current, questionCount: value } : current));
              }}
              onBlur={() => {
                const digits = sanitizeDigits(questionCountInput);
                const value = digits
                  ? clampInteger(
                      Number.parseInt(digits, 10),
                      MIN_QUESTION_COUNT,
                      Math.max(quizSet.questions.length, MIN_QUESTION_COUNT)
                    )
                  : config.questionCount;
                setConfig((current) => (current ? { ...current, questionCount: value } : current));
                setQuestionCountInput(String(value));
              }}
            />
          </label>

          <label>
            Duration (minutes)
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              enterKeyHint="done"
              value={durationInput}
              onChange={(event) => {
                const digits = sanitizeDigits(event.target.value);
                setDurationInput(digits);
                if (!digits) return;
                const value = clampInteger(
                  Number.parseInt(digits, 10),
                  MIN_DURATION_MINUTES,
                  MAX_DURATION_MINUTES
                );
                setConfig((current) => (current ? { ...current, durationMinutes: value } : current));
              }}
              onBlur={() => {
                const digits = sanitizeDigits(durationInput);
                const value = digits
                  ? clampInteger(
                      Number.parseInt(digits, 10),
                      MIN_DURATION_MINUTES,
                      MAX_DURATION_MINUTES
                    )
                  : config.durationMinutes;
                setConfig((current) => (current ? { ...current, durationMinutes: value } : current));
                setDurationInput(String(value));
              }}
            />
          </label>
        </div>

        <div className="setup-block">
          <h3>Filter by Type</h3>
          <div className="setup-categories">
            {types.map((type) => {
              const selected = config.selectedTypes.includes(type);
              return (
                <label key={type} className="inline-checkbox">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(event) => {
                      setConfig((current) => {
                        if (!current) return current;
                        const nextTypes = new Set(current.selectedTypes);
                        if (event.target.checked) nextTypes.add(type);
                        else nextTypes.delete(type);
                        return { ...current, selectedTypes: [...nextTypes] };
                      });
                    }}
                  />
                  {type}
                </label>
              );
            })}
          </div>
        </div>

        <button type="button" className="btn-block" onClick={startQuiz}>
          Start {config.mode === "practice" ? "Practice" : "Exam"}
        </button>

        {setupError && <p className="error-box">{setupError}</p>}

        {result && (
          <>
            <div className="setup-block" style={{ marginTop: 16 }}>
              <h3>Last Session Result</h3>
              <div className="score-card">
                <strong>{result.score} / {result.total}</strong>
                <span>{Math.round((result.score / Math.max(result.total, 1)) * 100)}%</span>
              </div>
              <p className="muted">Answered: {answeredCount} | Skipped: {unansweredCount}</p>
              <p className="muted">Time: {formatDuration(result.elapsedSeconds)}</p>
              {result.timedOut && <p className="error-box">Time ran out and the quiz was automatically ended.</p>}
            </div>

            <h3>Answer Review</h3>
            {reviewRows.length === 0 && <p className="muted">No completed answers in the previous session.</p>}
            <div className="question-list">
              {reviewRows.map(({ question, selectedIndex }) => {
                const isCorrect = selectedIndex === question.correctOptionIndex;
                return (
                  <article key={question.id} className={`result-item ${isCorrect ? "ok" : "bad"}`}>
                    <figure className="question-sign small">
                      <SignImage src={question.imagePath} alt={`Sign ${question.sourceId}`} loading="lazy" />
                    </figure>
                    <p>Type: {question.type}</p>
                    <p>Your answer: <span className="ar">{selectedIndex !== undefined ? question.optionsAr[selectedIndex] : "-"}</span></p>
                    <p>Correct: <span className="ar">{question.correctAnswerAr}</span></p>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    );
  }

  const current = questions[index];
  if (!current) {
    return <section className="panel">No questions available.</section>;
  }

  const selected = answers[current.id];
  const progressPercent = Math.round(((index + 1) / questions.length) * 100);

  return (
    <section className="panel">
      <header className="title-row">
        <h2>{config.mode === "practice" ? "Sign Quiz - Practice" : "Sign Quiz - Exam"}</h2>
        <span>{index + 1} / {questions.length}</span>
      </header>

      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="quiz-meta-row">
        <span>{current.type}</span>
        <strong>{formatDuration(remainingSeconds)}</strong>
      </div>

      <article className="quiz-card">
        <figure className="question-sign signs-card-image">
          <SignImage src={current.imagePath} alt={`Sign ${current.sourceId}`} loading="lazy" />
        </figure>

        <div className="choices-column">
          {current.optionsAr.map((option, optionIndex) => {
            let className = `choice-btn ${selected === optionIndex ? "selected" : ""}`;
            if (config.mode === "practice" && selected !== undefined) {
              if (optionIndex === current.correctOptionIndex) className += " correct";
              if (optionIndex === selected && selected !== current.correctOptionIndex) className += " wrong";
            }

            return (
              <button
                key={`${current.id}-${optionIndex}`}
                type="button"
                className={className}
                onClick={() => selectAnswer(optionIndex)}
              >
                <strong>{String.fromCharCode(65 + optionIndex)}</strong>
                <span className="ar">{option}</span>
              </button>
            );
          })}
        </div>

        {feedback && <p className={`feedback-box ar ${feedbackTone ?? ""}`}>{feedback}</p>}

        <div className="actions-row primary-actions">
          <button type="button" className="btn-block" onClick={nextQuestion}>
            {index >= questions.length - 1 ? "Finish Quiz" : "Next Question"}
          </button>
        </div>

        <div className="quiz-danger-zone">
          <button
            type="button"
            className="danger-button"
            onClick={() => setShowExitConfirm(true)}
          >
            End Quiz Now
          </button>
        </div>
      </article>

      <ConfirmModal
        open={showFinishConfirm}
        title="Finish Quiz"
        message="Are you sure you want to finish the quiz and see your results?"
        confirmLabel="Yes, Finish"
        cancelLabel="Continue"
        variant="primary"
        onConfirm={() => {
          setShowFinishConfirm(false);
          finishQuiz(false);
        }}
        onCancel={() => setShowFinishConfirm(false)}
      />

      <ConfirmModal
        open={showExitConfirm}
        title="End Early"
        message="Are you sure you want to end the quiz now? Only your current answers will be saved."
        confirmLabel="Yes, End Now"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          setShowExitConfirm(false);
          finishQuiz(false);
        }}
        onCancel={() => setShowExitConfirm(false)}
      />
    </section>
  );
}
