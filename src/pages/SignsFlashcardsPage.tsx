import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { SignImage } from "../components/SignImage";
import { ConfirmModal } from "../components/Modal";
import {
  filterFlashcardsByTypes,
  formatDuration,
  getSignTypes,
  shuffleItems
} from "../lib/signs";
import type { SignFlashcard, SignFlashcardSet } from "../types/signs";

const DEFAULT_CARD_COUNT = 30;
const DEFAULT_DURATION_MINUTES = 15;
const MIN_CARD_COUNT = 1;
const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 240;

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sanitizeDigits(value: string): string {
  return value.replace(/[^\d]/g, "");
}

interface FlashcardsConfig {
  selectedTypes: string[];
  cardCount: number;
  durationMinutes: number;
}

interface FlashcardsResult {
  total: number;
  viewed: number;
  elapsedSeconds: number;
  timedOut: boolean;
}

function isSignFlashcardSet(value: unknown): value is SignFlashcardSet {
  if (!value || typeof value !== "object") return false;
  const candidate = value as SignFlashcardSet;
  return (
    typeof candidate.id === "string" &&
    Array.isArray(candidate.cards) &&
    candidate.cards.every(
      (card) =>
        card &&
        typeof card.id === "string" &&
        typeof card.sourceId === "number" &&
        typeof card.type === "string" &&
        typeof card.nameAr === "string" &&
        typeof card.imagePath === "string"
    )
  );
}

export function SignsFlashcardsPage(): JSX.Element {
  const { t } = useI18n();
  const [flashcardSet, setFlashcardSet] = useState<SignFlashcardSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [config, setConfig] = useState<FlashcardsConfig | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [cardCountInput, setCardCountInput] = useState<string>(String(DEFAULT_CARD_COUNT));
  const [durationInput, setDurationInput] = useState<string>(String(DEFAULT_DURATION_MINUTES));

  const [sessionCards, setSessionCards] = useState<SignFlashcard[]>([]);
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [viewedCardIds, setViewedCardIds] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<FlashcardsResult | null>(null);

  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    if (!config) return;
    setCardCountInput(String(config.cardCount));
    setDurationInput(String(config.durationMinutes));
  }, [config?.cardCount, config?.durationMinutes]);

  const types = useMemo(() => getSignTypes(flashcardSet?.cards ?? []), [flashcardSet]);

  useEffect(() => {
    let disposed = false;

    async function loadData(): Promise<void> {
      try {
        const response = await fetch("/data/signs.flashcards.ar.generated.json", { cache: "no-cache" });
        if (!response.ok) {
          throw new Error("Failed to load sign flashcards data.");
        }

        const payload = (await response.json()) as unknown;
        if (!isSignFlashcardSet(payload)) {
          throw new Error("Invalid flashcard data format.");
        }

        if (disposed) return;
        setFlashcardSet(payload);
        const availableTypes = getSignTypes(payload.cards);
        setConfig({
          selectedTypes: availableTypes,
          cardCount: Math.min(DEFAULT_CARD_COUNT, payload.cards.length),
          durationMinutes: DEFAULT_DURATION_MINUTES
        });
        setLoadError(null);
      } catch (error) {
        if (disposed) return;
        const message = error instanceof Error ? error.message : "Failed to load flashcard data.";
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

  const finishSession = useCallback(
    (timedOut: boolean) => {
      setActive(false);
      const started = startedAtMs ?? Date.now();
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
      setResult({
        total: sessionCards.length,
        viewed: viewedCardIds.size,
        elapsedSeconds,
        timedOut
      });
    },
    [sessionCards.length, startedAtMs, viewedCardIds]
  );

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          finishSession(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [active, finishSession]);

  function startSession(): void {
    if (!flashcardSet || !config) return;

    const filtered = filterFlashcardsByTypes(flashcardSet.cards, config.selectedTypes);
    if (filtered.length === 0) {
      setSetupError("No cards match the selected filters.");
      return;
    }

    const limitedCount = clampInteger(config.cardCount, MIN_CARD_COUNT, filtered.length);
    const cards = shuffleItems(filtered).slice(0, limitedCount);
    setSessionCards(cards);
    setActive(true);
    setResult(null);
    setIndex(0);
    setShowAnswer(false);
    setRemainingSeconds(Math.max(60, clampInteger(config.durationMinutes, MIN_DURATION_MINUTES, MAX_DURATION_MINUTES) * 60));
    setStartedAtMs(Date.now());
    setViewedCardIds(new Set([cards[0].id]));
    setSetupError(null);
  }

  function move(delta: 1 | -1): void {
    setShowAnswer(false);
    setIndex((current) => {
      const nextIndex = current + delta;
      const bounded = Math.max(0, Math.min(nextIndex, sessionCards.length - 1));
      const nextCard = sessionCards[bounded];
      if (nextCard) {
        setViewedCardIds((currentSet) => {
          const nextSet = new Set(currentSet);
          nextSet.add(nextCard.id);
          return nextSet;
        });
      }
      return bounded;
    });
  }

  if (loading) {
    return <section className="panel">Loading sign flashcards...</section>;
  }

  if (loadError || !flashcardSet || !config) {
    return <section className="panel error-box">{loadError ?? "Flashcard data not available."}</section>;
  }

  if (!active) {
    return (
      <section className="panel">
        <header className="title-row">
          <h2>{t("signFlashcards")}</h2>
          <span>{flashcardSet.cards.length} {t("cards")}</span>
        </header>

        <div className="setup-grid">
          <label>
            {t("numCards")}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              enterKeyHint="done"
              value={cardCountInput}
              onChange={(event) => {
                const digits = sanitizeDigits(event.target.value);
                setCardCountInput(digits);
                if (!digits) return;
                const value = clampInteger(
                  Number.parseInt(digits, 10),
                  MIN_CARD_COUNT,
                  Math.max(flashcardSet.cards.length, MIN_CARD_COUNT)
                );
                setConfig((current) => (current ? { ...current, cardCount: value } : current));
              }}
              onBlur={() => {
                const digits = sanitizeDigits(cardCountInput);
                const value = digits
                  ? clampInteger(
                      Number.parseInt(digits, 10),
                      MIN_CARD_COUNT,
                      Math.max(flashcardSet.cards.length, MIN_CARD_COUNT)
                    )
                  : config.cardCount;
                setConfig((current) => (current ? { ...current, cardCount: value } : current));
                setCardCountInput(String(value));
              }}
            />
          </label>
          <label>
            {t("duration")}
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
          <h3>{t("filterByType")}</h3>
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

        <button type="button" className="btn-block" onClick={startSession}>
          {t("startFlashcards")}
        </button>

        {setupError && <p className="error-box">{setupError}</p>}
        {result && (
          <div className="setup-block" style={{ marginTop: 16 }}>
            <h3>{t("lastSessionResult")}</h3>
            <p>{t("cardsViewed")}: {result.viewed}</p>
            <p>{t("totalCards")}: {result.total}</p>
            <p>{t("timeSpent")}: {formatDuration(result.elapsedSeconds)}</p>
            {result.timedOut && <p className="error-box">{t("timeRanOut")}</p>}
          </div>
        )}
      </section>
    );
  }

  const current = sessionCards[index];
  if (!current) {
    return <section className="panel">No cards available.</section>;
  }

  const progressPercent = Math.round(((index + 1) / sessionCards.length) * 100);

  return (
    <section className="panel">
      <header className="title-row">
        <h2>{t("signFlashcards")}</h2>
        <span>{index + 1} / {sessionCards.length}</span>
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

        {showAnswer ? (
          <h3 className="sign-answer ar">{current.nameAr}</h3>
        ) : (
          <p className="muted" style={{ textAlign: "center" }}>{t("tapToReveal")}</p>
        )}

        <div className="actions-row primary-actions">
          <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowAnswer((v) => !v)}>
            {showAnswer ? t("hide") : t("showName")}
          </button>
        </div>

        <div className="actions-row">
          <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => move(-1)} disabled={index === 0}>
            {t("previous")}
          </button>
          <button
            type="button"
            style={{ flex: 1 }}
            onClick={() => {
              if (index >= sessionCards.length - 1) {
                setShowFinishConfirm(true);
                return;
              }
              move(1);
            }}
          >
            {index >= sessionCards.length - 1 ? t("finish") : t("next")}
          </button>
        </div>

        <div className="quiz-danger-zone">
          <button
            type="button"
            className="danger-button"
            onClick={() => setShowExitConfirm(true)}
          >
            {t("endSession")}
          </button>
        </div>
      </article>

      <ConfirmModal
        open={showFinishConfirm}
        title={t("finishSession")}
        message={t("finishSessionMsg")}
        confirmLabel={t("yesFinish")}
        cancelLabel={t("continue")}
        variant="primary"
        onConfirm={() => {
          setShowFinishConfirm(false);
          finishSession(false);
        }}
        onCancel={() => setShowFinishConfirm(false)}
      />

      <ConfirmModal
        open={showExitConfirm}
        title={t("endEarly")}
        message={t("endSessionMsg")}
        confirmLabel={t("yesEndNow")}
        cancelLabel={t("cancel")}
        variant="danger"
        onConfirm={() => {
          setShowExitConfirm(false);
          finishSession(false);
        }}
        onCancel={() => setShowExitConfirm(false)}
      />
    </section>
  );
}
