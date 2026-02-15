import type { SignFlashcard, SignQuizQuestion } from "../types/signs";

export function shuffleItems<T>(items: T[]): T[] {
  const cloned = [...items];
  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [cloned[index], cloned[randomIndex]] = [cloned[randomIndex], cloned[index]];
  }
  return cloned;
}

export function getSignTypes<T extends { type: string }>(items: T[]): string[] {
  return [...new Set(items.map((item) => item.type.trim()).filter((item) => item.length > 0))].sort((a, b) =>
    a.localeCompare(b)
  );
}

export function filterFlashcardsByTypes(cards: SignFlashcard[], selectedTypes: string[]): SignFlashcard[] {
  if (selectedTypes.length === 0) return cards;
  const selected = new Set(selectedTypes);
  return cards.filter((card) => selected.has(card.type));
}

export function filterSignsQuizByTypes(
  questions: SignQuizQuestion[],
  selectedTypes: string[]
): SignQuizQuestion[] {
  if (selectedTypes.length === 0) return questions;
  const selected = new Set(selectedTypes);
  return questions.filter((question) => selected.has(question.type));
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
