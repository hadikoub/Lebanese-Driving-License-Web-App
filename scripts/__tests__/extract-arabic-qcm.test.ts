import { describe, expect, it } from "vitest";
import {
  normalizeOptionId,
  parseAnswerKey,
  parseQuestionBlock,
  splitQuestionBlocks
} from "../extract-arabic-qcm";

describe("extract-arabic-qcm parser", () => {
  it("splits question blocks correctly", () => {
    const text = `1) ما هو لون الإشارة الحمراء؟\nA) أحمر\nB) أخضر\n2) متى تتوقف السيارة؟\nأ) عند الضوء الأحمر\nب) عند الضوء الأخضر`;

    const blocks = splitQuestionBlocks(text);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].sourceNumber).toBe(1);
    expect(blocks[1].sourceNumber).toBe(2);
  });

  it("parses Arabic option markers", () => {
    const blocks = splitQuestionBlocks(
      `12) أي إشارة تعني التوقف؟\nأ) توقف\nب) ممنوع\nج) ممر\nد) سرعة`
    );
    const answerMap = new Map<number, "A" | "B" | "C" | "D">([[12, "A"]]);

    const question = parseQuestionBlock(blocks[0], 4, answerMap, 1);

    expect(question.choices.map((choice) => choice.id)).toEqual(["A", "B", "C", "D"]);
    expect(question.correctChoiceId).toBe("A");
    expect(question.needsReview).toBe(false);
  });

  it("maps answer key lines", () => {
    const answerMap = parseAnswerKey(`الإجابات\n1 A\n2 ب\n3 ج\n4 D`);

    expect(answerMap.get(1)).toBe("A");
    expect(answerMap.get(2)).toBe("B");
    expect(answerMap.get(3)).toBe("C");
    expect(answerMap.get(4)).toBe("D");
  });

  it("flags uncertain questions", () => {
    const blocks = splitQuestionBlocks(`5) سؤال غير واضح بدون خيارات`);
    const question = parseQuestionBlock(blocks[0], 9, new Map(), 2);

    expect(question.needsReview).toBe(true);
    expect(question.correctChoiceId).toBeNull();
  });

  it("normalizes option ids", () => {
    expect(normalizeOptionId("أ")).toBe("A");
    expect(normalizeOptionId("ب")).toBe("B");
    expect(normalizeOptionId("ج")).toBe("C");
    expect(normalizeOptionId("د")).toBe("D");
  });
});
