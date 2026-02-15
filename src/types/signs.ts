export type SignsQuizMode = "practice" | "exam";

export interface SignFlashcard {
  id: string;
  sourceId: number;
  type: string;
  nameAr: string;
  imagePath: string;
}

export interface SignFlashcardSet {
  id: string;
  titleAr: string;
  language: "ar";
  direction: "rtl";
  cards: SignFlashcard[];
  importedAt: string;
}

export interface SignQuizQuestion {
  id: string;
  sourceId: number;
  type: string;
  imagePath: string;
  optionsAr: string[];
  correctOptionIndex: number;
  correctAnswerAr: string;
}

export interface SignQuizSet {
  id: string;
  titleAr: string;
  language: "ar";
  direction: "rtl";
  questions: SignQuizQuestion[];
  importedAt: string;
}
