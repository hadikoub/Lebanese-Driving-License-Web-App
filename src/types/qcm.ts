export type QuizMode = "practice" | "exam";

export interface Choice {
  id: string;
  textAr: string;
}

export interface Question {
  id: string;
  promptAr: string;
  choices: Choice[];
  correctChoiceId: string | null;
  sourcePage: number;
  sourceNumber: number | null;
  needsReview: boolean;
  category?: string | null;
  questionType?: string | null;
  signPath?: string | null;
}

export interface QuestionSet {
  id: string;
  titleAr: string;
  language: "ar";
  direction: "rtl";
  questions: Question[];
  importedAt: string;
}
