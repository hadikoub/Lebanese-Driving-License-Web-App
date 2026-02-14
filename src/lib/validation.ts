import type { Choice, Question, QuestionSet } from "../types/qcm";

function isChoice(value: unknown): value is Choice {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Choice;
  return typeof candidate.id === "string" && typeof candidate.textAr === "string";
}

function isQuestion(value: unknown): value is Question {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Question;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.promptAr === "string" &&
    Array.isArray(candidate.choices) &&
    candidate.choices.every(isChoice) &&
    (typeof candidate.correctChoiceId === "string" || candidate.correctChoiceId === null) &&
    typeof candidate.sourcePage === "number" &&
    (typeof candidate.sourceNumber === "number" || candidate.sourceNumber === null) &&
    typeof candidate.needsReview === "boolean" &&
    (typeof candidate.category === "string" || candidate.category === null || candidate.category === undefined) &&
    (typeof candidate.questionType === "string" ||
      candidate.questionType === null ||
      candidate.questionType === undefined) &&
    (typeof candidate.signPath === "string" ||
      candidate.signPath === null ||
      candidate.signPath === undefined)
  );
}

export function isQuestionSet(value: unknown): value is QuestionSet {
  if (!value || typeof value !== "object") return false;
  const candidate = value as QuestionSet;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.titleAr === "string" &&
    candidate.language === "ar" &&
    candidate.direction === "rtl" &&
    Array.isArray(candidate.questions) &&
    candidate.questions.every(isQuestion) &&
    typeof candidate.importedAt === "string"
  );
}
