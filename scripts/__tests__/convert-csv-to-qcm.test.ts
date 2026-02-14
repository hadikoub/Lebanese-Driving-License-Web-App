import { describe, expect, it } from "vitest";
import { buildQuestionSetFromCsv } from "../convert-csv-to-qcm";

describe("convert-csv-to-qcm", () => {
  it("builds questions from CSV rows", () => {
    const csv = [
      "ID,Question Text (نص السؤال),Option 1,Option 2,Option 3,Correct Answer,Correct Answer Index",
      "1,ما هي الإشارة الحمراء؟,توقف,سرعة,انعطاف,توقف,1",
      "2,كيف تنعطف؟,بدون غماز,مع تشغيل الغماز,تزيد السرعة,مع تشغيل الغماز,2"
    ].join("\n");

    const { questionSet, report } = buildQuestionSetFromCsv(csv);

    expect(questionSet.questions).toHaveLength(2);
    expect(questionSet.questions[0].choices.map((choice) => choice.id)).toEqual(["A", "B", "C"]);
    expect(questionSet.questions[1].correctChoiceId).toBe("B");
    expect(report.needsReviewCount).toBe(0);
  });

  it("maps category and type from csv columns", () => {
    const csv = [
      "ID,Cat,Type,Question Text (نص السؤال),Option 1,Option 2,Option 3,Correct Answer,Correct Answer Index",
      "1,g,safety,سؤال تجريبي,أ,ب,ج,أ,1"
    ].join("\n");

    const { questionSet } = buildQuestionSetFromCsv(csv);
    expect(questionSet.questions[0].category).toBe("G");
    expect(questionSet.questions[0].questionType).toBe("Safety");
  });

  it("maps and normalizes sign paths for signs questions", () => {
    const csv = [
      "ID,Cat,Type,Question Text (نص السؤال),Option 1,Option 2,Option 3,Correct Answer,Correct Answer Index,Sign Path",
      "1,G,Signs,ماذا تعني هذه الإشارة؟,خيار أ,خيار ب,خيار ج,خيار أ,1,1.svg"
    ].join("\n");

    const { questionSet, report } = buildQuestionSetFromCsv(csv);
    expect(questionSet.questions[0].questionType).toBe("Signs");
    expect(questionSet.questions[0].signPath).toBe("/assets/signs/1.svg");
    expect(report.signsWithImageCount).toBe(1);
    expect(report.signsMissingImageCount).toBe(0);
  });

  it("flags signs question without sign path as needs review", () => {
    const csv = [
      "ID,Cat,Type,Question Text (نص السؤال),Option 1,Option 2,Option 3,Correct Answer,Correct Answer Index,Sign Path",
      "1,G,Signs,ماذا تعني هذه الإشارة؟,خيار أ,خيار ب,خيار ج,خيار أ,1,"
    ].join("\n");

    const { questionSet, report } = buildQuestionSetFromCsv(csv);
    expect(questionSet.questions[0].needsReview).toBe(true);
    expect(questionSet.questions[0].signPath).toBeUndefined();
    expect(report.signsWithImageCount).toBe(0);
    expect(report.signsMissingImageCount).toBe(1);
  });

  it("falls back to matching correct answer text when index missing", () => {
    const csv = [
      "ID,Question Text (نص السؤال),Option 1,Option 2,Option 3,Correct Answer,Correct Answer Index",
      "7,سؤال تجريبي,خيار أول,خيار ثان,خيار ثالث,خيار ثان,"
    ].join("\n");

    const { questionSet } = buildQuestionSetFromCsv(csv);
    expect(questionSet.questions[0].correctChoiceId).toBe("B");
    expect(questionSet.questions[0].needsReview).toBe(false);
  });

  it("parses quoted cells with commas", () => {
    const csv = [
      "ID,Question Text (نص السؤال),Option 1,Option 2,Option 3,Correct Answer,Correct Answer Index",
      "8,\"متى تتوقف، عند الإشارة؟\",\"خيار، واحد\",\"خيار اثنان\",\"خيار ثلاثة\",\"خيار، واحد\",1"
    ].join("\n");

    const { questionSet } = buildQuestionSetFromCsv(csv);
    expect(questionSet.questions[0].promptAr).toBe("متى تتوقف، عند الإشارة؟");
    expect(questionSet.questions[0].choices[0].textAr).toBe("خيار، واحد");
    expect(questionSet.questions[0].correctChoiceId).toBe("A");
  });
});
