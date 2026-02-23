import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type Lang = "en" | "ar";

const LANG_STORAGE_KEY = "qcm_ar_ui_lang";

function loadLang(): Lang {
  const stored = localStorage.getItem(LANG_STORAGE_KEY);
  if (stored === "ar" || stored === "en") return stored;
  return "en";
}

const translations = {
  home: { en: "Home", ar: "الرئيسية" },
  practice: { en: "Practice", ar: "تدريب" },
  exam: { en: "Exam", ar: "امتحان" },
  saved: { en: "Saved", ar: "محفوظات" },
  more: { en: "More", ar: "المزيد" },
  signFlashcards: { en: "Sign Flashcards", ar: "بطاقات الإشارات" },
  signQuiz: { en: "Sign Quiz", ar: "اختبار الإشارات" },
  storyMode: { en: "Story Mode", ar: "وضع القصة" },
  results: { en: "Results", ar: "النتائج" },
  subtitle: { en: "Practice and train for your exam", ar: "تدرّب واستعد لامتحانك" },
  loadingData: { en: "Loading default data...", ar: "جار تحميل البيانات..." },
  noDataAvailable: { en: "No question data available.", ar: "لا توجد بيانات أسئلة." },
  totalQuestions: { en: "Total Questions", ar: "إجمالي الأسئلة" },
  savedQuestions: { en: "Saved Questions", ar: "الأسئلة المحفوظة" },
  back: { en: "← Back", ar: "→ رجوع" },
  practiceSetup: { en: "Practice Setup", ar: "إعداد التدريب" },
  examSetup: { en: "Exam Setup", ar: "إعداد الامتحان" },
  questions: { en: "questions", ar: "سؤال" },
  storyLevel: { en: "Story Level", ar: "مستوى القصة" },
  title: { en: "Title", ar: "العنوان" },
  type: { en: "Type", ar: "النوع" },
  levelAutoStart: { en: "Level will start automatically", ar: "سيتم بدء المستوى تلقائياً" },
  numQuestions: { en: "Number of Questions", ar: "عدد الأسئلة" },
  enableTimer: { en: "Enable Timer", ar: "تفعيل المؤقت" },
  timerDuration: { en: "Timer Duration (minutes)", ar: "مدة المؤقت (دقائق)" },
  questionType: { en: "Question Type", ar: "نوع الأسئلة" },
  allTypesMixed: { en: "All Types (Mixed)", ar: "كل الأنواع (مختلط)" },
  specificTypes: { en: "Specific Types", ar: "أنواع محددة" },
  bookmarks: { en: "Bookmarks", ar: "المحفوظات" },
  practiceSavedOnly: { en: "Practice saved questions only", ar: "تدريب على المحفوظات فقط" },
  savedQuestionsCount: { en: "Saved questions", ar: "عدد المحفوظات" },
  categories: { en: "Categories", ar: "الفئات" },
  startPractice: { en: "Start Practice", ar: "بدء التدريب" },
  startExam: { en: "Start Exam", ar: "بدء الامتحان" },
  save: { en: "Save", ar: "حفظ" },
  savedStar: { en: "⭐ Saved", ar: "⭐ محفوظ" },
  finishQuiz: { en: "Finish Quiz", ar: "إنهاء الاختبار" },
  nextQuestion: { en: "Next Question", ar: "السؤال التالي" },
  endQuizNow: { en: "End Quiz Now", ar: "إنهاء الاختبار الآن" },
  finishQuizTitle: { en: "Finish Quiz", ar: "إنهاء الاختبار" },
  finishQuizMsg: { en: "Are you sure you want to finish the quiz and see your results? This cannot be undone.", ar: "هل أنت متأكد من إنهاء الاختبار وعرض النتيجة؟ لا يمكن التراجع." },
  yesFinish: { en: "Yes, Finish", ar: "نعم، أنهِ" },
  continue: { en: "Continue", ar: "متابعة" },
  endEarly: { en: "End Early", ar: "إنهاء مبكر" },
  endEarlyMsg: { en: "Are you sure you want to end the quiz now? Only your current answers will be saved and scored.", ar: "هل تريد إنهاء الاختبار الآن؟ سيتم حفظ الإجابات الحالية فقط." },
  yesEndNow: { en: "Yes, End Now", ar: "نعم، أنهِ الآن" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  firstUnanswered: { en: "First unanswered question", ar: "أول سؤال غير مُجاب" },
  failedLoadSign: { en: "Failed to load the sign image for this question.", ar: "تعذر تحميل صورة الإشارة." },
  noQuizReady: { en: "No quiz session ready.", ar: "لا يوجد اختبار جاهز." },
  noQuestionsAvailable: { en: "No questions available.", ar: "لا توجد أسئلة." },
  noMatchSettings: { en: "No questions match the selected settings.", ar: "لا توجد أسئلة تطابق الإعدادات." },
  noSavedYet: { en: "No saved questions yet.", ar: "لا توجد أسئلة محفوظة بعد." },
  failedLoadLevel: { en: "Failed to load this level. Please go back to Story Mode.", ar: "فشل تحميل المستوى. ارجع إلى وضع القصة." },

  quizResults: { en: "Quiz Results", ar: "نتيجة الاختبار" },
  answered: { en: "Answered", ar: "المنجزة" },
  skipped: { en: "Skipped", ar: "غير مُجاب" },
  time: { en: "Time", ar: "الوقت" },
  timedOut: { en: "Time ran out and the quiz was automatically ended.", ar: "انتهى الوقت وتم إنهاء الاختبار تلقائياً." },
  retryPractice: { en: "Retry Practice", ar: "إعادة التدريب" },
  retryExam: { en: "Retry Exam", ar: "إعادة الامتحان" },
  backToStory: { en: "Back to Story Mode", ar: "العودة لوضع القصة" },
  answerReview: { en: "Answer Review", ar: "مراجعة الإجابات" },
  noCompletedAnswers: { en: "No completed answers to review.", ar: "لا توجد إجابات منجزة." },
  yourAnswer: { en: "Your answer", ar: "اختيارك" },
  correct: { en: "Correct", ar: "الصحيح" },
  noResultsSaved: { en: "No results saved yet.", ar: "لا توجد نتيجة محفوظة بعد." },

  remove: { en: "Remove", ar: "إزالة" },
  practiceSavedQuestions: { en: "Practice Saved Questions", ar: "التدريب على المحفوظات" },
  canSaveDuringQuiz: { en: "You can save any question during practice or exam mode.", ar: "يمكنك حفظ أي سؤال أثناء التدريب أو الامتحان." },
  correctAnswer: { en: "Correct Answer", ar: "الإجابة الصحيحة" },
  removeFromSaved: { en: "Remove from Saved", ar: "إزالة من المحفوظات" },
  removeConfirmMsg: { en: "Are you sure you want to remove this question from your saved list?", ar: "هل أنت متأكد من إزالة هذا السؤال من المحفوظات؟" },
  yesRemove: { en: "Yes, Remove", ar: "نعم، أزل" },

  levels: { en: "levels", ar: "مستوى" },
  storyExplanation: { en: "Each level has up to 30 questions. Score 70% or higher to unlock the next level.", ar: "كل مستوى يحتوي حتى 30 سؤال. النجاح من 70% لفتح المستوى التالي." },
  completed: { en: "Completed", ar: "منجز" },
  questionsCount: { en: "Questions", ar: "عدد الأسئلة" },
  attempts: { en: "Attempts", ar: "المحاولات" },
  bestScore: { en: "Best Score", ar: "أفضل نتيجة" },
  startLevel: { en: "Start Level", ar: "بدء المستوى" },
  locked: { en: "🔒 Locked", ar: "🔒 مغلق" },

  numCards: { en: "Number of Cards", ar: "عدد البطاقات" },
  duration: { en: "Duration (minutes)", ar: "مدة الجلسة (دقائق)" },
  filterByType: { en: "Filter by Type", ar: "فلترة النوع" },
  startFlashcards: { en: "Start Flashcards", ar: "بدء البطاقات" },
  lastSessionResult: { en: "Last Session Result", ar: "نتيجة آخر جلسة" },
  cardsViewed: { en: "Cards viewed", ar: "بطاقات تم تصفحها" },
  totalCards: { en: "Total cards", ar: "إجمالي البطاقات" },
  timeSpent: { en: "Time spent", ar: "الوقت المستغرق" },
  cards: { en: "cards", ar: "بطاقة" },
  tapToReveal: { en: "Tap to reveal the sign name", ar: "اضغط لعرض اسم الإشارة" },
  hide: { en: "Hide", ar: "إخفاء" },
  showName: { en: "Show Name", ar: "إظهار الاسم" },
  previous: { en: "Previous", ar: "السابق" },
  next: { en: "Next", ar: "التالي" },
  finish: { en: "Finish", ar: "إنهاء" },
  endSession: { en: "End Session", ar: "إنهاء الجلسة" },
  finishSession: { en: "Finish Session", ar: "إنهاء الجلسة" },
  finishSessionMsg: { en: "Are you sure you want to finish the flashcard session?", ar: "هل أنت متأكد من إنهاء جلسة البطاقات؟" },
  endSessionMsg: { en: "Are you sure you want to end the session now?", ar: "هل تريد إنهاء الجلسة الآن؟" },

  mode: { en: "Mode", ar: "الوضع" },
  practiceInstant: { en: "Practice (Instant feedback)", ar: "تدريب (تصحيح فوري)" },
  examEnd: { en: "Exam (Results at end)", ar: "امتحان (تصحيح نهائي)" },
  durationMinutes: { en: "Duration (minutes)", ar: "مدة الاختبار (دقائق)" },
  signQuizPractice: { en: "Sign Quiz - Practice", ar: "اختبار الإشارات - تدريب" },
  signQuizExam: { en: "Sign Quiz - Exam", ar: "اختبار الإشارات - امتحان" },
  finishQuizConfirm: { en: "Are you sure you want to finish the quiz and see your results?", ar: "هل أنت متأكد من إنهاء الاختبار وعرض النتيجة؟" },
  endQuizEarlyMsg: { en: "Are you sure you want to end the quiz now? Only your current answers will be saved.", ar: "هل تريد إنهاء الاختبار الآن؟ سيتم حفظ الإجابات الحالية فقط." },

  pageNotFound: { en: "Page Not Found", ar: "الصفحة غير موجودة" },
  pageNotFoundMsg: { en: "The page you are looking for does not exist.", ar: "الصفحة التي تبحث عنها غير موجودة." },
  backToHome: { en: "Back to Home", ar: "العودة للرئيسية" },

  reviewQuestions: { en: "Review Questions", ar: "مراجعة الأسئلة" },
  showNeedsReviewOnly: { en: "Show needs review only", ar: "عرض الأسئلة التي تحتاج مراجعة فقط" },
  reviewInstructions: { en: "Edit question text and choices, then select the correct answer. Leave \"Needs Review\" checked for questions that need verification.", ar: "عدّل نص السؤال والخيارات، ثم اختر الإجابة الصحيحة. أي سؤال يحتاج تدقيق اتركه مع خيار \"يحتاج مراجعة\"." },
  questionText: { en: "Question Text", ar: "نص السؤال" },
  signImagePath: { en: "Sign Image Path (optional)", ar: "مسار صورة الإشارة (اختياري)" },
  choice: { en: "Choice", ar: "الخيار" },
  correctAnswerLabel: { en: "Correct Answer", ar: "الإجابة الصحيحة" },
  notSet: { en: "Not set", ar: "غير محددة" },
  needsReview: { en: "Needs Review", ar: "يحتاج مراجعة" },
  question: { en: "Question", ar: "سؤال" },
  page: { en: "Page", ar: "صفحة" },
  noDataImport: { en: "No data available. Go back to home to import.", ar: "لا توجد بيانات. ارجع للرئيسية للاستيراد." },

  noAnsweredPrev: { en: "No completed answers in the previous session.", ar: "لا توجد إجابات منجزة في الجلسة السابقة." },
  timeRanOut: { en: "Time ran out and the quiz was automatically ended.", ar: "انتهى الوقت وتم إنهاء الاختبار تلقائياً." },
} as const;

export type TranslationKey = keyof typeof translations;

interface I18nState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nState | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }): JSX.Element {
  const [lang, setLangState] = useState<Lang>(loadLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    localStorage.setItem(LANG_STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      const entry = translations[key];
      if (!entry) return key;
      return entry[lang] ?? entry.en;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nState {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
