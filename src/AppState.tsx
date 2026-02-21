import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { Question, QuestionSet } from "./types/qcm";
import type { QuizResult, StoryProgress, UserProfile } from "./types/session";
import {
  clearQuizResult,
  createProfile as createStoredProfile,
  ensureProfiles,
  loadBookmarkedQuestions,
  loadQuestionSet,
  loadQuizResult,
  loadStoryProgress,
  saveActiveProfileId,
  saveBookmarkedQuestions,
  saveQuestionSet,
  saveQuizResult,
  saveStoryProgress,
  touchProfile
} from "./lib/storage";

const STORY_PASSING_PERCENTAGE = 70;

function defaultStoryProgress(): StoryProgress {
  return { levels: {}, updatedAt: new Date().toISOString() };
}

function normalizePrompt(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function syncWithReference(current: QuestionSet, reference: QuestionSet): QuestionSet {
  const refById = new Map<string, Question>();
  const refBySourceNumber = new Map<number, Question>();
  const refByPrompt = new Map<string, Question>();

  for (const question of reference.questions) {
    refById.set(question.id, question);
    if (question.sourceNumber !== null) {
      refBySourceNumber.set(question.sourceNumber, question);
    }
    refByPrompt.set(normalizePrompt(question.promptAr), question);
  }

  let changed = false;
  const nextQuestions = current.questions.map((question) => {
    const matched =
      refById.get(question.id) ??
      (question.sourceNumber !== null ? refBySourceNumber.get(question.sourceNumber) : undefined) ??
      refByPrompt.get(normalizePrompt(question.promptAr));
    if (!matched) return question;

    const updates: Partial<Question> = {};

    if (matched.correctChoiceId && matched.correctChoiceId !== question.correctChoiceId) {
      updates.correctChoiceId = matched.correctChoiceId;
    }

    if (matched.promptAr !== question.promptAr) {
      updates.promptAr = matched.promptAr;
    }

    if (JSON.stringify(matched.choices) !== JSON.stringify(question.choices)) {
      updates.choices = matched.choices;
    }

    if ((matched.category ?? null) !== (question.category ?? null) && matched.category) {
      updates.category = matched.category;
    }
    if ((matched.questionType ?? null) !== (question.questionType ?? null) && matched.questionType) {
      updates.questionType = matched.questionType;
    }
    if ((matched.signPath ?? null) !== (question.signPath ?? null) && matched.signPath) {
      updates.signPath = matched.signPath;
    }

    if (Object.keys(updates).length === 0) return question;

    changed = true;
    return { ...question, ...updates };
  });

  const currentIds = new Set(current.questions.map((q) => q.id));
  const newQuestions = reference.questions.filter((q) => !currentIds.has(q.id));
  if (newQuestions.length > 0) {
    changed = true;
    nextQuestions.push(...newQuestions);
  }

  return changed ? { ...current, questions: nextQuestions } : current;
}

interface AppState {
  questionSet: QuestionSet | null;
  loadingDefault: boolean;
  lastResult: QuizResult | null;
  storyProgress: StoryProgress;
  bookmarkedQuestionIds: string[];
  profiles: UserProfile[];
  activeProfileId: string;
  activeProfileName: string;
  setActiveProfile: (profileId: string) => void;
  createProfile: (name: string) => void;
  setQuestionSet: (questionSet: QuestionSet) => void;
  updateQuestion: (questionId: string, updater: (question: Question) => Question) => void;
  setLastResult: (result: QuizResult | null) => void;
  toggleQuestionBookmark: (questionId: string) => void;
  recordStoryResult: (levelId: string, score: number, total: number) => void;
}

const AppStateContext = createContext<AppState | undefined>(undefined);

const initialProfileState = ensureProfiles();

export function AppStateProvider({ children }: { children: ReactNode }): JSX.Element {
  const [profiles, setProfiles] = useState<UserProfile[]>(initialProfileState.profiles);
  const [activeProfileId, setActiveProfileIdState] = useState<string>(
    initialProfileState.activeProfileId
  );

  const [questionSet, setQuestionSetState] = useState<QuestionSet | null>(() =>
    loadQuestionSet(initialProfileState.activeProfileId)
  );
  const [lastResult, setLastResultState] = useState<QuizResult | null>(() =>
    loadQuizResult(initialProfileState.activeProfileId)
  );
  const [storyProgress, setStoryProgress] = useState<StoryProgress>(() =>
    loadStoryProgress(initialProfileState.activeProfileId) ?? defaultStoryProgress()
  );
  const [bookmarkedQuestionIds, setBookmarkedQuestionIds] = useState<string[]>(() =>
    loadBookmarkedQuestions(initialProfileState.activeProfileId)
  );
  const [referenceQuestionSet, setReferenceQuestionSet] = useState<QuestionSet | null>(null);
  const [loadingDefault, setLoadingDefault] = useState<boolean>(() => !loadQuestionSet(initialProfileState.activeProfileId));

  useEffect(() => {
    let disposed = false;

    async function loadDefaultReference(): Promise<void> {
      try {
        const response = await fetch("/data/questions.ar.generated.json", { cache: "no-cache" });
        if (!response.ok) return;
        const data = (await response.json()) as QuestionSet;
        if (!disposed) {
          setReferenceQuestionSet(data);
        }
      } catch {
        // Fallback is empty state.
      }
    }

    void loadDefaultReference();

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    saveActiveProfileId(activeProfileId);
    setProfiles((current) => touchProfile(current, activeProfileId));

    const loadedQuestionSet = loadQuestionSet(activeProfileId);
    const loadedLastResult = loadQuizResult(activeProfileId);
    const loadedStoryProgress = loadStoryProgress(activeProfileId) ?? defaultStoryProgress();
    const loadedBookmarks = loadBookmarkedQuestions(activeProfileId);

    setQuestionSetState(loadedQuestionSet);
    setLastResultState(loadedLastResult);
    setStoryProgress(loadedStoryProgress);
    setBookmarkedQuestionIds(loadedBookmarks);

    if (!loadedQuestionSet && referenceQuestionSet) {
      setQuestionSetState(referenceQuestionSet);
      saveQuestionSet(activeProfileId, referenceQuestionSet);
      setLoadingDefault(false);
      return;
    }

    setLoadingDefault(!loadedQuestionSet);
  }, [activeProfileId, referenceQuestionSet]);

  useEffect(() => {
    if (!questionSet || !referenceQuestionSet) return;

    const synced = syncWithReference(questionSet, referenceQuestionSet);
    if (synced === questionSet) return;

    setQuestionSetState(synced);
    saveQuestionSet(activeProfileId, synced);
  }, [questionSet, referenceQuestionSet, activeProfileId]);

  const setActiveProfile = useCallback(
    (profileId: string) => {
      if (!profiles.some((profile) => profile.id === profileId)) return;
      setActiveProfileIdState(profileId);
    },
    [profiles]
  );

  const createProfile = useCallback(
    (name: string) => {
      const { profiles: nextProfiles, createdProfile } = createStoredProfile(profiles, name);
      setProfiles(nextProfiles);
      setActiveProfileIdState(createdProfile.id);
    },
    [profiles]
  );

  const setQuestionSet = useCallback(
    (nextQuestionSet: QuestionSet) => {
      setQuestionSetState(nextQuestionSet);
      saveQuestionSet(activeProfileId, nextQuestionSet);
    },
    [activeProfileId]
  );

  const updateQuestion = useCallback(
    (questionId: string, updater: (question: Question) => Question) => {
      setQuestionSetState((current) => {
        if (!current) return current;

        const nextQuestions = current.questions.map((question) => {
          if (question.id !== questionId) return question;
          return updater(question);
        });

        const nextState: QuestionSet = { ...current, questions: nextQuestions };
        saveQuestionSet(activeProfileId, nextState);
        return nextState;
      });
    },
    [activeProfileId]
  );

  const setLastResult = useCallback(
    (result: QuizResult | null) => {
      setLastResultState(result);
      if (result) {
        saveQuizResult(activeProfileId, result);
      } else {
        clearQuizResult(activeProfileId);
      }
    },
    [activeProfileId]
  );

  const toggleQuestionBookmark = useCallback(
    (questionId: string) => {
      setBookmarkedQuestionIds((current) => {
        const next = current.includes(questionId)
          ? current.filter((id) => id !== questionId)
          : [...current, questionId];
        saveBookmarkedQuestions(activeProfileId, next);
        return next;
      });
    },
    [activeProfileId]
  );

  const recordStoryResult = useCallback(
    (levelId: string, score: number, total: number) => {
      setStoryProgress((current) => {
        const currentLevel = current.levels[levelId];
        const percentage = Math.round((score / Math.max(total, 1)) * 100);
        const completed = percentage >= STORY_PASSING_PERCENTAGE;

        const nextLevel = {
          attempts: (currentLevel?.attempts ?? 0) + 1,
          completed: (currentLevel?.completed ?? false) || completed,
          bestScore: Math.max(currentLevel?.bestScore ?? 0, score),
          bestTotal: Math.max(currentLevel?.bestTotal ?? 0, total),
          lastScore: score,
          lastTotal: total,
          lastPlayedAt: new Date().toISOString()
        };

        const nextState: StoryProgress = {
          levels: {
            ...current.levels,
            [levelId]: nextLevel
          },
          updatedAt: new Date().toISOString()
        };

        saveStoryProgress(activeProfileId, nextState);
        return nextState;
      });
    },
    [activeProfileId]
  );

  const activeProfileName =
    profiles.find((profile) => profile.id === activeProfileId)?.name ?? "مستخدم";

  const value = useMemo<AppState>(
    () => ({
      questionSet,
      loadingDefault,
      lastResult,
      storyProgress,
      bookmarkedQuestionIds,
      profiles,
      activeProfileId,
      activeProfileName,
      setActiveProfile,
      createProfile,
      setQuestionSet,
      updateQuestion,
      setLastResult,
      toggleQuestionBookmark,
      recordStoryResult
    }),
    [
      questionSet,
      loadingDefault,
      lastResult,
      storyProgress,
      bookmarkedQuestionIds,
      profiles,
      activeProfileId,
      activeProfileName,
      setActiveProfile,
      createProfile,
      setQuestionSet,
      updateQuestion,
      setLastResult,
      toggleQuestionBookmark,
      recordStoryResult
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return context;
}
