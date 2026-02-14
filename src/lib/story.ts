import type { Question } from "../types/qcm";
import type { StoryProgress } from "../types/session";
import { getEffectiveQuestionType } from "./quiz";

export const STORY_LEVEL_SIZE = 30;

export interface StoryLevel {
  id: string;
  type: string;
  label: string;
  index: number;
  chunkIndex: number;
  questionCount: number;
  questionIds: string[];
}

function slugifyType(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildStoryLevels(questions: Question[]): StoryLevel[] {
  const types = [...new Set(questions.map((question) => getEffectiveQuestionType(question)))].sort((left, right) =>
    left.localeCompare(right)
  );
  const levels: StoryLevel[] = [];

  for (const type of types) {
    const typedQuestions = questions
      .filter((question) => getEffectiveQuestionType(question) === type)
      .sort((left, right) => {
        const leftNumber = left.sourceNumber ?? Number.MAX_SAFE_INTEGER;
        const rightNumber = right.sourceNumber ?? Number.MAX_SAFE_INTEGER;
        if (leftNumber !== rightNumber) return leftNumber - rightNumber;
        return left.id.localeCompare(right.id);
      });

    const totalChunks = Math.max(1, Math.ceil(typedQuestions.length / STORY_LEVEL_SIZE));

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const start = chunkIndex * STORY_LEVEL_SIZE;
      const chunk = typedQuestions.slice(start, start + STORY_LEVEL_SIZE);
      const levelNumber = levels.length + 1;

      levels.push({
        id: `level-${levelNumber}-${slugifyType(type)}-${chunkIndex + 1}`,
        type,
        label:
          totalChunks > 1
            ? `المستوى ${levelNumber} - ${type} (${chunkIndex + 1}/${totalChunks})`
            : `المستوى ${levelNumber} - ${type}`,
        index: levelNumber - 1,
        chunkIndex,
        questionCount: chunk.length,
        questionIds: chunk.map((question) => question.id)
      });
    }
  }

  return levels;
}

export function isStoryLevelUnlocked(
  levels: StoryLevel[],
  levelIndex: number,
  progress: StoryProgress
): boolean {
  if (levelIndex === 0) return true;
  const previous = levels[levelIndex - 1];
  if (!previous) return true;
  return Boolean(progress.levels[previous.id]?.completed);
}

export function findStoryLevel(levels: StoryLevel[], levelId: string | null): StoryLevel | null {
  if (!levelId) return null;
  return levels.find((level) => level.id === levelId) ?? null;
}
