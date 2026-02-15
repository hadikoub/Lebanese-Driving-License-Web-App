import { NavLink, Outlet } from "react-router-dom";
import { useAppState } from "../AppState";

export function Layout(): JSX.Element {
  const { isAdmin } = useAppState();

  return (
    <div className="app-shell" dir="rtl">
      <header className="app-header">
        <h1>اختبار السياقة QCM</h1>
        <p>مراجعة، تدريب، وامتحان نهائي بنظام متعدد الاختيارات</p>
        <nav className="top-nav" aria-label="روابط الصفحات">
          <NavLink to="/">الرئيسية</NavLink>
          <NavLink to="/quiz/practice">وضع التدريب</NavLink>
          <NavLink to="/quiz/exam">وضع الامتحان</NavLink>
          <NavLink to="/signs/flashcards">Signs Flashcards</NavLink>
          <NavLink to="/signs/quiz">Signs Quiz</NavLink>
          <NavLink to="/story">Story Mode</NavLink>
          {isAdmin && <NavLink to="/review">مراجعة الأسئلة</NavLink>}
          <NavLink to="/admin">{isAdmin ? "Admin Mode (On)" : "Admin Mode"}</NavLink>
          <NavLink to="/results">النتائج</NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
