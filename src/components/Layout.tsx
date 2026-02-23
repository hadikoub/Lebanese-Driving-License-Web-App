import { useState, useCallback } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useI18n } from "../i18n";

function HomeIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function PracticeIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function ExamIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function BookmarkIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function MoreIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

function SignIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
      <line x1="12" y1="22" x2="12" y2="15.5" />
      <polyline points="22 8.5 12 15.5 2 8.5" />
    </svg>
  );
}

function StoryIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function ResultsIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function QuizSignsIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function Layout(): JSX.Element {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const { lang, setLang, t } = useI18n();

  const closeMore = useCallback(() => setMoreOpen(false), []);

  const isMoreActive = ["/signs/flashcards", "/signs/quiz", "/story", "/results", "/review"].some(
    (path) => location.pathname.startsWith(path)
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-top-row">
          <img className="header-flag" src="/assets/flag-lebanon.svg" alt="Lebanese flag" width="56" height="37" />
          <button
            type="button"
            className="lang-toggle"
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            aria-label="Toggle language"
          >
            {lang === "en" ? "عربي" : "EN"}
          </button>
        </div>
        <h1>Lebanese Driving License</h1>
        <p>{t("subtitle")}</p>
        <a className="dev-credit" href="https://github.com/hadikoub" target="_blank" rel="noopener noreferrer">
          Developed by Hadi Koubeissy
        </a>
      </header>

      <main>
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        <NavLink to="/" onClick={closeMore}>
          <HomeIcon />
          <span>{t("home")}</span>
        </NavLink>
        <NavLink to="/quiz/practice" onClick={closeMore}>
          <PracticeIcon />
          <span>{t("practice")}</span>
        </NavLink>
        <NavLink to="/quiz/exam" onClick={closeMore}>
          <ExamIcon />
          <span>{t("exam")}</span>
        </NavLink>
        <NavLink to="/bookmarks" onClick={closeMore}>
          <BookmarkIcon />
          <span>{t("saved")}</span>
        </NavLink>
        <button
          type="button"
          className={isMoreActive ? "active" : ""}
          onClick={() => setMoreOpen((v) => !v)}
        >
          <MoreIcon />
          <span>{t("more")}</span>
        </button>
      </nav>

      {moreOpen && (
        <>
          <div className="nav-more-backdrop" onClick={closeMore} />
          <div className="nav-more-menu">
            <NavLink to="/signs/flashcards" onClick={closeMore}>
              <SignIcon />
              <span>{t("signFlashcards")}</span>
            </NavLink>
            <NavLink to="/signs/quiz" onClick={closeMore}>
              <QuizSignsIcon />
              <span>{t("signQuiz")}</span>
            </NavLink>
            <NavLink to="/story" onClick={closeMore}>
              <StoryIcon />
              <span>{t("storyMode")}</span>
            </NavLink>
            <NavLink to="/results" onClick={closeMore}>
              <ResultsIcon />
              <span>{t("results")}</span>
            </NavLink>
          </div>
        </>
      )}
    </div>
  );
}
