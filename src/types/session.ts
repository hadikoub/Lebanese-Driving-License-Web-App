import type { QuizMode } from "./qcm";

export type QuizTypeMode = "mixed" | "single";

export interface QuizConfig {
  questionCount: number;
  selectedCategories: string[];
  typeMode: QuizTypeMode;
  selectedType: string | null;
  timerEnabled: boolean;
  timerMinutes: number;
}

export interface QuizSession {
  mode: QuizMode;
  answers: Record<string, string>;
  startedAt: string;
  finishedAt: string | null;
  questionIds: string[];
  config: QuizConfig;
}

export interface QuizResult {
  mode: QuizMode;
  answers: Record<string, string>;
  score: number;
  total: number;
  startedAt: string;
  finishedAt: string;
  elapsedSeconds: number;
  timedOut: boolean;
  questionIds: string[];
  config: QuizConfig;
  storyLevelId: string | null;
}

export interface StoryLevelStat {
  attempts: number;
  completed: boolean;
  bestScore: number;
  bestTotal: number;
  lastScore: number;
  lastTotal: number;
  lastPlayedAt: string;
}

export interface StoryProgress {
  levels: Record<string, StoryLevelStat>;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string;
}
