import type { Question } from "../types/qcm";
import type { QuizConfig } from "../types/session";

export function calculateScore(questions: Question[], answers: Record<string, string>): number {
  return questions.reduce((score, question) => {
    if (!question.correctChoiceId) return score;
    return answers[question.id] === question.correctChoiceId ? score + 1 : score;
  }, 0);
}

export function firstUnansweredIndex(
  questions: Question[],
  answers: Record<string, string>
): number | null {
  const index = questions.findIndex((question) => !answers[question.id]);
  return index === -1 ? null : index;
}

export function shuffleItems<T>(items: T[]): T[] {
  const cloned = [...items];
  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [cloned[index], cloned[randomIndex]] = [cloned[randomIndex], cloned[index]];
  }
  return cloned;
}

export function getCategories(questions: Question[]): string[] {
  const categories = new Set<string>();
  for (const question of questions) {
    if (question.category && question.category.trim().length > 0) {
      categories.add(question.category.trim());
    }
  }
  return [...categories].sort((left, right) => left.localeCompare(right));
}

export function getQuestionTypes(questions: Question[]): string[] {
  const categoryCodes = new Set(getCategories(questions).map((category) => category.toUpperCase()));
  const rawTypes = questions
    .map((question) => question.questionType?.trim())
    .filter((value): value is string => Boolean(value && value.length > 0));

  const semanticTypes = rawTypes.filter((type) => !categoryCodes.has(type.toUpperCase()));
  const source = semanticTypes.length > 0 ? semanticTypes : rawTypes;

  if (source.length > 0) {
    return [...new Set(source)].sort((left, right) => left.localeCompare(right));
  }

  const categories = getCategories(questions);
  if (categories.length > 0) return categories;
  return ["General"];
}

export function getEffectiveQuestionType(question: Question): string {
  if (question.questionType && question.questionType.trim().length > 0) {
    return question.questionType.trim();
  }
  if (question.category && question.category.trim().length > 0) {
    return question.category.trim();
  }
  return "General";
}

function matchesCategory(question: Question, selectedCategories: string[]): boolean {
  if (selectedCategories.length === 0) return true;
  if (!question.category) return false;
  return selectedCategories.includes(question.category);
}

function matchesType(question: Question, config: QuizConfig): boolean {
  if (config.typeMode === "mixed") return true;
  if (!config.selectedType) return false;
  return getEffectiveQuestionType(question) === config.selectedType;
}

export function filterQuestionsByConfig(questions: Question[], config: QuizConfig): Question[] {
  return questions.filter(
    (question) => matchesCategory(question, config.selectedCategories) && matchesType(question, config)
  );
}

export function buildQuestionsForQuiz(questions: Question[], config: QuizConfig): Question[] {
  const filtered = filterQuestionsByConfig(questions, config);
  const shuffled = shuffleItems(filtered);
  const total = Math.max(1, Math.min(config.questionCount, shuffled.length));
  return shuffled.slice(0, total);
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
