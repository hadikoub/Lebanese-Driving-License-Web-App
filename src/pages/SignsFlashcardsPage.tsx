import { useCallback, useEffect, useMemo, useState } from "react";
import { SignImage } from "../components/SignImage";
import {
  filterFlashcardsByTypes,
  formatDuration,
  getSignTypes,
  shuffleItems
} from "../lib/signs";
import type { SignFlashcard, SignFlashcardSet } from "../types/signs";

const DEFAULT_CARD_COUNT = 30;
const DEFAULT_DURATION_MINUTES = 15;

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
  const [flashcardSet, setFlashcardSet] = useState<SignFlashcardSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [config, setConfig] = useState<FlashcardsConfig | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  const [sessionCards, setSessionCards] = useState<SignFlashcard[]>([]);
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [viewedCardIds, setViewedCardIds] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<FlashcardsResult | null>(null);

  const types = useMemo(() => getSignTypes(flashcardSet?.cards ?? []), [flashcardSet]);

  useEffect(() => {
    let disposed = false;

    async function loadData(): Promise<void> {
      try {
        const response = await fetch("/data/signs.flashcards.ar.generated.json");
        if (!response.ok) {
          throw new Error("تعذر تحميل ملف بطاقات الإشارات.");
        }

        const payload = (await response.json()) as unknown;
        if (!isSignFlashcardSet(payload)) {
          throw new Error("صيغة بيانات البطاقات غير صحيحة.");
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
        const message = error instanceof Error ? error.message : "تعذر تحميل بيانات البطاقات.";
        setLoadError(`${message} شغّل الأمر npm run extract:signs ثم أعد المحاولة.`);
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
      setSetupError("لا توجد بطاقات مطابقة للفلاتر المختارة.");
      return;
    }

    const limitedCount = Math.max(1, Math.min(config.cardCount, filtered.length));
    const cards = shuffleItems(filtered).slice(0, limitedCount);
    setSessionCards(cards);
    setActive(true);
    setResult(null);
    setIndex(0);
    setShowAnswer(false);
    setRemainingSeconds(Math.max(60, config.durationMinutes * 60));
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
    return <section className="panel">جار تحميل بطاقات الإشارات...</section>;
  }

  if (loadError || !flashcardSet || !config) {
    return <section className="panel error-box">{loadError ?? "بيانات البطاقات غير متوفرة."}</section>;
  }

  if (!active) {
    return (
      <section className="panel">
        <header className="title-row">
          <h2>Signs Flashcards</h2>
          <span>إجمالي البطاقات: {flashcardSet.cards.length}</span>
        </header>

        <div className="setup-grid">
          <label>
            عدد البطاقات
            <input
              type="number"
              min={1}
              max={flashcardSet.cards.length}
              value={config.cardCount}
              onChange={(event) => {
                const value = Number.parseInt(event.target.value, 10);
                if (Number.isNaN(value)) return;
                setConfig((current) => (current ? { ...current, cardCount: value } : current));
              }}
            />
          </label>
          <label>
            مدة الجلسة (دقائق)
            <input
              type="number"
              min={1}
              max={240}
              value={config.durationMinutes}
              onChange={(event) => {
                const value = Number.parseInt(event.target.value, 10);
                if (Number.isNaN(value)) return;
                setConfig((current) => (current ? { ...current, durationMinutes: value } : current));
              }}
            />
          </label>
        </div>

        <div className="setup-block">
          <h3>فلترة النوع</h3>
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

        <div className="actions-row">
          <button type="button" onClick={startSession}>
            بدء البطاقات
          </button>
        </div>

        {setupError && <p className="error-box">{setupError}</p>}
        {result && (
          <div className="setup-block">
            <h3>نتيجة آخر جلسة</h3>
            <p>بطاقات تم تصفحها: {result.viewed}</p>
            <p>إجمالي البطاقات: {result.total}</p>
            <p>الوقت المستغرق: {formatDuration(result.elapsedSeconds)}</p>
            {result.timedOut && <p className="error-box">انتهى الوقت للجلسة السابقة.</p>}
          </div>
        )}
      </section>
    );
  }

  const current = sessionCards[index];
  if (!current) {
    return <section className="panel">لا توجد بطاقات متاحة.</section>;
  }

  return (
    <section className="panel">
      <header className="title-row">
        <h2>Signs Flashcards</h2>
        <span>
          البطاقة {index + 1} من {sessionCards.length}
        </span>
      </header>

      <div className="quiz-meta-row">
        <span>النوع: {current.type}</span>
        <strong>الوقت المتبقي: {formatDuration(remainingSeconds)}</strong>
      </div>

      <article className="quiz-card">
        <figure className="question-sign signs-card-image">
          <SignImage src={current.imagePath} alt={`إشارة ${current.sourceId}`} loading="lazy" />
        </figure>

        {showAnswer ? (
          <h3 className="sign-answer">{current.nameAr}</h3>
        ) : (
          <p className="muted">اضغط "إظهار الاسم" لعرض اسم الإشارة بالعربية.</p>
        )}

        <div className="actions-row">
          <button type="button" onClick={() => setShowAnswer((currentValue) => !currentValue)}>
            {showAnswer ? "إخفاء الاسم" : "إظهار الاسم"}
          </button>
          <button type="button" onClick={() => move(-1)} disabled={index === 0}>
            السابق
          </button>
          <button
            type="button"
            onClick={() => {
              if (index >= sessionCards.length - 1) {
                finishSession(false);
                return;
              }
              move(1);
            }}
          >
            {index >= sessionCards.length - 1 ? "إنهاء" : "التالي"}
          </button>
          <button type="button" onClick={() => finishSession(false)}>
            إنهاء الجلسة
          </button>
        </div>
      </article>
    </section>
  );
}
