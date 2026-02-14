import type { QuestionSet } from "./types/qcm";

export const questionSetFixture: QuestionSet = {
  id: "fixture-ar",
  titleAr: "اختبار تجريبي",
  language: "ar",
  direction: "rtl",
  importedAt: "2026-02-14T00:00:00.000Z",
  questions: [
    {
      id: "q-0001",
      promptAr: "ماذا تعني الإشارة الحمراء؟",
      choices: [
        { id: "A", textAr: "توقف" },
        { id: "B", textAr: "مرور" },
        { id: "C", textAr: "اتجاه" }
      ],
      correctChoiceId: "A",
      sourcePage: 1,
      sourceNumber: 1,
      needsReview: false,
      category: "G",
      questionType: "Safety"
    },
    {
      id: "q-0002",
      promptAr: "قبل الانعطاف يجب؟",
      choices: [
        { id: "A", textAr: "زيادة السرعة" },
        { id: "B", textAr: "تشغيل الغماز" },
        { id: "C", textAr: "إغلاق الأضواء" }
      ],
      correctChoiceId: "B",
      sourcePage: 1,
      sourceNumber: 2,
      needsReview: false,
      category: "BC",
      questionType: "Law"
    }
  ]
};
