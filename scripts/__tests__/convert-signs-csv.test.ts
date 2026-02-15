import { describe, expect, it } from "vitest";
import {
  buildSignsFlashcardsFromCsv,
  buildSignsQuizFromCsv,
  resolveImagePathForSourceId
} from "../convert-signs-csv";

describe("convert-signs-csv", () => {
  it("builds flashcards from arabic names and type", () => {
    const csv = [
      "ID,Type,Name in Arabic,Name in French,Name in English",
      "1,Warning,منعطف لليمين,Virage à droite,Right-Hand Bend",
      "2,Information,مستشفى,Hôpital,Hospital"
    ].join("\n");

    const result = buildSignsFlashcardsFromCsv(csv);
    expect(result.flashcardSet.cards).toHaveLength(2);
    expect(result.flashcardSet.cards[0].nameAr).toBe("منعطف لليمين");
    expect(result.flashcardSet.cards[0].imagePath).toBe("/assets/sign_images_by_id/001.png");
    expect(result.flashcardSet.cards[1].type).toBe("Information");
  });

  it("builds quiz items with index-based correct answer", () => {
    const csv = [
      "ID,Type,Option 1,Option 2,Option 3,Correct Answer,Index of Correct Answer",
      "1,Warning,أ,ب,ج,ب,2"
    ].join("\n");

    const result = buildSignsQuizFromCsv(csv);
    expect(result.quizSet.questions).toHaveLength(1);
    expect(result.quizSet.questions[0].optionsAr).toEqual(["أ", "ب", "ج"]);
    expect(result.quizSet.questions[0].correctOptionIndex).toBe(1);
    expect(result.unresolvedAnswers).toBe(0);
  });

  it("falls back to text-based answer matching when index is missing", () => {
    const csv = [
      "ID,Type,Option 1,Option 2,Option 3,Correct Answer,Index of Correct Answer",
      "5,Mandatory,يمين,يسار,مستقيم,يسار,"
    ].join("\n");

    const result = buildSignsQuizFromCsv(csv);
    expect(result.quizSet.questions).toHaveLength(1);
    expect(result.quizSet.questions[0].correctOptionIndex).toBe(1);
  });

  it("supports svg image path resolution", () => {
    const resolved = resolveImagePathForSourceId(2, (filePath) => filePath.endsWith("002.svg"));
    expect(resolved).toBe("/assets/sign_images_by_id/002.svg");
  });
});
