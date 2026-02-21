import type { QuestionSet } from "../types/qcm";
import type { QuizResult, StoryProgress, UserProfile } from "../types/session";

const PROFILES_KEY = "qcm_ar_profiles";
const ACTIVE_PROFILE_KEY = "qcm_ar_active_profile";

const LEGACY_QUESTION_SET_KEY = "qcm_ar_question_set";
const LEGACY_QUIZ_RESULT_KEY = "qcm_ar_last_result";
const LEGACY_ADMIN_MODE_KEY = "qcm_ar_admin_mode";
const LEGACY_ADMIN_PASSCODE_KEY = "qcm_ar_admin_passcode";
const LEGACY_STORY_PROGRESS_KEY = "qcm_ar_story_progress";
const LEGACY_BOOKMARKED_QUESTIONS_KEY = "qcm_ar_bookmarked_questions";

type ScopedSuffix =
  | "question_set"
  | "last_result"
  | "admin_mode"
  | "admin_passcode"
  | "story_progress"
  | "bookmarked_questions";

function scopedKey(profileId: string, suffix: ScopedSuffix): string {
  return `qcm_ar:${profileId}:${suffix}`;
}

function generateProfileId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function sanitizeProfileName(value: string, fallbackIndex: number): string {
  const normalized = value.trim();
  if (normalized.length > 0) return normalized;
  return `مستخدم ${fallbackIndex}`;
}

export function loadProfiles(): UserProfile[] {
  const profiles = parseJson<UserProfile[]>(localStorage.getItem(PROFILES_KEY));
  if (!profiles || !Array.isArray(profiles)) return [];

  return profiles.filter(
    (profile) =>
      profile &&
      typeof profile.id === "string" &&
      typeof profile.name === "string" &&
      typeof profile.createdAt === "string" &&
      typeof profile.lastUsedAt === "string"
  );
}

export function saveProfiles(profiles: UserProfile[]): void {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function loadActiveProfileId(): string | null {
  const value = localStorage.getItem(ACTIVE_PROFILE_KEY);
  if (!value || value.trim().length === 0) return null;
  return value;
}

export function saveActiveProfileId(profileId: string): void {
  localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
}

export function ensureProfiles(): { profiles: UserProfile[]; activeProfileId: string } {
  let profiles = loadProfiles();

  if (profiles.length === 0) {
    const now = new Date().toISOString();
    profiles = [
      {
        id: generateProfileId(),
        name: "مستخدم 1",
        createdAt: now,
        lastUsedAt: now
      }
    ];
    saveProfiles(profiles);
  }

  const currentActive = loadActiveProfileId();
  const activeProfile = profiles.find((profile) => profile.id === currentActive) ?? profiles[0];
  saveActiveProfileId(activeProfile.id);

  return {
    profiles,
    activeProfileId: activeProfile.id
  };
}

export function createProfile(currentProfiles: UserProfile[], name: string): {
  profiles: UserProfile[];
  createdProfile: UserProfile;
} {
  const now = new Date().toISOString();
  const profile: UserProfile = {
    id: generateProfileId(),
    name: sanitizeProfileName(name, currentProfiles.length + 1),
    createdAt: now,
    lastUsedAt: now
  };

  const profiles = [...currentProfiles, profile];
  saveProfiles(profiles);
  return { profiles, createdProfile: profile };
}

export function touchProfile(profiles: UserProfile[], profileId: string): UserProfile[] {
  const now = new Date().toISOString();
  const next = profiles.map((profile) =>
    profile.id === profileId ? { ...profile, lastUsedAt: now } : profile
  );
  saveProfiles(next);
  return next;
}

function loadScopedValue(profileId: string, suffix: ScopedSuffix, legacyKey: string): string | null {
  const scoped = localStorage.getItem(scopedKey(profileId, suffix));
  if (scoped !== null) return scoped;
  return localStorage.getItem(legacyKey);
}

export function saveQuestionSet(profileId: string, questionSet: QuestionSet): void {
  localStorage.setItem(scopedKey(profileId, "question_set"), JSON.stringify(questionSet));
}

export function loadQuestionSet(profileId: string): QuestionSet | null {
  return parseJson<QuestionSet>(loadScopedValue(profileId, "question_set", LEGACY_QUESTION_SET_KEY));
}

export function saveQuizResult(profileId: string, result: QuizResult): void {
  localStorage.setItem(scopedKey(profileId, "last_result"), JSON.stringify(result));
}

export function loadQuizResult(profileId: string): QuizResult | null {
  return parseJson<QuizResult>(loadScopedValue(profileId, "last_result", LEGACY_QUIZ_RESULT_KEY));
}

export function clearQuizResult(profileId: string): void {
  localStorage.removeItem(scopedKey(profileId, "last_result"));
}

export function saveAdminMode(profileId: string, enabled: boolean): void {
  localStorage.setItem(scopedKey(profileId, "admin_mode"), enabled ? "1" : "0");
}

export function loadAdminMode(profileId: string): boolean {
  return loadScopedValue(profileId, "admin_mode", LEGACY_ADMIN_MODE_KEY) === "1";
}

export function saveAdminPasscode(profileId: string, passcode: string): void {
  localStorage.setItem(scopedKey(profileId, "admin_passcode"), passcode);
}

export function loadAdminPasscode(profileId: string): string | null {
  const value = loadScopedValue(profileId, "admin_passcode", LEGACY_ADMIN_PASSCODE_KEY);
  if (!value) return null;
  return value;
}

export function saveStoryProgress(profileId: string, progress: StoryProgress): void {
  localStorage.setItem(scopedKey(profileId, "story_progress"), JSON.stringify(progress));
}

export function loadStoryProgress(profileId: string): StoryProgress | null {
  return parseJson<StoryProgress>(loadScopedValue(profileId, "story_progress", LEGACY_STORY_PROGRESS_KEY));
}

export function saveBookmarkedQuestions(profileId: string, questionIds: string[]): void {
  localStorage.setItem(scopedKey(profileId, "bookmarked_questions"), JSON.stringify(questionIds));
}

export function loadBookmarkedQuestions(profileId: string): string[] {
  const parsed = parseJson<unknown[]>(
    loadScopedValue(profileId, "bookmarked_questions", LEGACY_BOOKMARKED_QUESTIONS_KEY)
  );
  if (!parsed || !Array.isArray(parsed)) return [];
  return parsed.filter((value): value is string => typeof value === "string");
}
