import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AdminPage } from "./pages/AdminPage";
import { BookmarksPage } from "./pages/BookmarksPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { QuizPage } from "./pages/QuizPage";
import { ResultsPage } from "./pages/ResultsPage";
import { ReviewPage } from "./pages/ReviewPage";
import { SignsFlashcardsPage } from "./pages/SignsFlashcardsPage";
import { SignsQuizPage } from "./pages/SignsQuizPage";
import { StoryPage } from "./pages/StoryPage";

export default function App(): JSX.Element {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/quiz/:mode" element={<QuizPage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/signs/flashcards" element={<SignsFlashcardsPage />} />
        <Route path="/signs/quiz" element={<SignsQuizPage />} />
        <Route path="/story" element={<StoryPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
