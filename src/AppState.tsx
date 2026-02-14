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
  loadAdminMode,
  loadAdminPasscode,
  loadQuestionSet,
  loadQuizResult,
  loadStoryProgress,
  saveActiveProfileId,
  saveAdminMode,
  saveAdminPasscode,
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

function enrichQuestionSetMetadata(current: QuestionSet, reference: QuestionSet): QuestionSet {
  const bySourceNumber = new Map<
    number,
    { category?: string | null; questionType?: string | null; signPath?: string | null }
  >();
  const byPrompt = new Map<
    string,
    { category?: string | null; questionType?: string | null; signPath?: string | null }
  >();

  for (const question of reference.questions) {
    if (question.sourceNumber !== null) {
      bySourceNumber.set(question.sourceNumber, {
        category: question.category ?? null,
        questionType: question.questionType ?? null,
        signPath: question.signPath ?? null
      });
    }
    byPrompt.set(normalizePrompt(question.promptAr), {
      category: question.category ?? null,
      questionType: question.questionType ?? null,
      signPath: question.signPath ?? null
    });
  }

  let changed = false;
  const nextQuestions = current.questions.map((question) => {
    const hasCategory = Boolean(question.category && question.category.trim().length > 0);
    const hasType = Boolean(question.questionType && question.questionType.trim().length > 0);
    const hasSignPath = Boolean(question.signPath && question.signPath.trim().length > 0);
    if (hasCategory && hasType && hasSignPath) return question;

    const sourceMatch =
      question.sourceNumber !== null ? bySourceNumber.get(question.sourceNumber) : undefined;
    const promptMatch = byPrompt.get(normalizePrompt(question.promptAr));
    const matched = sourceMatch ?? promptMatch;
    if (!matched) return question;

    const nextCategory = hasCategory ? question.category ?? null : matched.category ?? null;
    const nextType = hasType ? question.questionType ?? null : matched.questionType ?? null;
    const nextSignPath = hasSignPath ? question.signPath ?? null : matched.signPath ?? null;

    if ((nextCategory ?? null) !== (question.category ?? null)) changed = true;
    if ((nextType ?? null) !== (question.questionType ?? null)) changed = true;
    if ((nextSignPath ?? null) !== (question.signPath ?? null)) changed = true;

    return {
      ...question,
      category: nextCategory,
      questionType: nextType,
      signPath: nextSignPath
    };
  });

  return changed ? { ...current, questions: nextQuestions } : current;
}

interface AppState {
  questionSet: QuestionSet | null;
  loadingDefault: boolean;
  lastResult: QuizResult | null;
  isAdmin: boolean;
  hasAdminPasscode: boolean;
  storyProgress: StoryProgress;
  profiles: UserProfile[];
  activeProfileId: string;
  activeProfileName: string;
  setActiveProfile: (profileId: string) => void;
  createProfile: (name: string) => void;
  setQuestionSet: (questionSet: QuestionSet) => void;
  updateQuestion: (questionId: string, updater: (question: Question) => Question) => void;
  setLastResult: (result: QuizResult | null) => void;
  setAdminPasscode: (passcode: string) => boolean;
  loginAdmin: (passcode: string) => boolean;
  logoutAdmin: () => void;
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
  const [isAdmin, setIsAdmin] = useState<boolean>(() => loadAdminMode(initialProfileState.activeProfileId));
  const [adminPasscode, setAdminPasscodeState] = useState<string | null>(() =>
    loadAdminPasscode(initialProfileState.activeProfileId)
  );
  const [storyProgress, setStoryProgress] = useState<StoryProgress>(() =>
    loadStoryProgress(initialProfileState.activeProfileId) ?? defaultStoryProgress()
  );
  const [referenceQuestionSet, setReferenceQuestionSet] = useState<QuestionSet | null>(null);
  const [loadingDefault, setLoadingDefault] = useState<boolean>(() => !loadQuestionSet(initialProfileState.activeProfileId));

  useEffect(() => {
    let disposed = false;

    async function loadDefaultReference(): Promise<void> {
      try {
        const response = await fetch("/data/questions.ar.generated.json");
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
    const loadedAdminMode = loadAdminMode(activeProfileId);
    const loadedAdminPasscode = loadAdminPasscode(activeProfileId);
    const loadedStoryProgress = loadStoryProgress(activeProfileId) ?? defaultStoryProgress();

    setQuestionSetState(loadedQuestionSet);
    setLastResultState(loadedLastResult);
    setIsAdmin(loadedAdminMode && Boolean(loadedAdminPasscode));
    setAdminPasscodeState(loadedAdminPasscode);
    setStoryProgress(loadedStoryProgress);

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

    const enriched = enrichQuestionSetMetadata(questionSet, referenceQuestionSet);
    if (enriched === questionSet) return;

    setQuestionSetState(enriched);
    saveQuestionSet(activeProfileId, enriched);
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

  const setAdminPasscode = useCallback(
    (passcode: string) => {
      const normalized = passcode.trim();
      if (normalized.length < 4) return false;

      saveAdminPasscode(activeProfileId, normalized);
      saveAdminMode(activeProfileId, true);
      setAdminPasscodeState(normalized);
      setIsAdmin(true);
      return true;
    },
    [activeProfileId]
  );

  const loginAdmin = useCallback(
    (passcode: string) => {
      if (!adminPasscode) return false;

      const success = passcode.trim() === adminPasscode;
      if (success) {
        setIsAdmin(true);
        saveAdminMode(activeProfileId, true);
      }
      return success;
    },
    [adminPasscode, activeProfileId]
  );

  const logoutAdmin = useCallback(() => {
    setIsAdmin(false);
    saveAdminMode(activeProfileId, false);
  }, [activeProfileId]);

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
      isAdmin,
      hasAdminPasscode: Boolean(adminPasscode),
      storyProgress,
      profiles,
      activeProfileId,
      activeProfileName,
      setActiveProfile,
      createProfile,
      setQuestionSet,
      updateQuestion,
      setLastResult,
      setAdminPasscode,
      loginAdmin,
      logoutAdmin,
      recordStoryResult
    }),
    [
      questionSet,
      loadingDefault,
      lastResult,
      isAdmin,
      adminPasscode,
      storyProgress,
      profiles,
      activeProfileId,
      activeProfileName,
      setActiveProfile,
      createProfile,
      setQuestionSet,
      updateQuestion,
      setLastResult,
      setAdminPasscode,
      loginAdmin,
      logoutAdmin,
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
