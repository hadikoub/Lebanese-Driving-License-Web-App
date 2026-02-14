import { describe, expect, it } from "vitest";
import { buildStoryLevels } from "./story";
import { questionSetFixture } from "../test-fixtures";

describe("story levels", () => {
  it("covers all questions across generated levels", () => {
    const levels = buildStoryLevels(questionSetFixture.questions);

    const flattened = levels.flatMap((level) => level.questionIds);
    const unique = new Set(flattened);

    expect(flattened.length).toBe(questionSetFixture.questions.length);
    expect(unique.size).toBe(questionSetFixture.questions.length);
  });

  it("splits long type sets into multiple 30-question chunks", () => {
    const longList = Array.from({ length: 65 }).map((_, index) => ({
      id: `q-${String(index + 1).padStart(4, "0")}`,
      promptAr: `سؤال ${index + 1}`,
      choices: [
        { id: "A", textAr: "أ" },
        { id: "B", textAr: "ب" },
        { id: "C", textAr: "ج" }
      ],
      correctChoiceId: "A",
      sourcePage: 0,
      sourceNumber: index + 1,
      needsReview: false,
      category: "G",
      questionType: "Safety"
    }));

    const levels = buildStoryLevels(longList);
    expect(levels).toHaveLength(3);
    expect(levels[0].questionCount).toBe(30);
    expect(levels[1].questionCount).toBe(30);
    expect(levels[2].questionCount).toBe(5);
  });
});
