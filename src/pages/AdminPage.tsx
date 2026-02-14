import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAppState } from "../AppState";

export function AdminPage(): JSX.Element {
  const { isAdmin, hasAdminPasscode, setAdminPasscode, loginAdmin, logoutAdmin } = useAppState();
  const [passcode, setPasscode] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onLoginSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const success = loginAdmin(passcode);
    if (!success) {
      setError("رمز المشرف غير صحيح");
      return;
    }

    setError(null);
    setPasscode("");
  }

  function onSetupSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (newPasscode.trim().length < 4) {
      setError("رمز المرور يجب أن يكون 4 أحرف على الأقل");
      return;
    }

    if (newPasscode !== confirmPasscode) {
      setError("تأكيد الرمز غير مطابق");
      return;
    }

    const success = setAdminPasscode(newPasscode);
    if (!success) {
      setError("تعذر حفظ رمز المرور");
      return;
    }

    setError(null);
    setNewPasscode("");
    setConfirmPasscode("");
  }

  if (isAdmin) {
    return (
      <section className="panel">
        <h2>Admin Mode</h2>
        <p className="muted">تم تفعيل Admin Mode. يمكنك الآن تعديل بنك الأسئلة.</p>
        <div className="actions-row">
          <Link className="button-link" to="/review">
            فتح لوحة تعديل الأسئلة
          </Link>
          <button type="button" onClick={logoutAdmin}>
            تسجيل خروج المشرف
          </button>
        </div>
      </section>
    );
  }

  if (!hasAdminPasscode) {
    return (
      <section className="panel admin-panel">
        <h2>تهيئة Admin Mode</h2>
        <p className="muted">أنشئ رمز مرور جديد للمشرف. لا توجد قيمة افتراضية.</p>

        <form className="admin-form" onSubmit={onSetupSubmit}>
          <label>
            رمز مرور جديد
            <input
              type="password"
              value={newPasscode}
              onChange={(event) => setNewPasscode(event.target.value)}
              placeholder="أدخل رمز المرور"
            />
          </label>
          <label>
            تأكيد الرمز
            <input
              type="password"
              value={confirmPasscode}
              onChange={(event) => setConfirmPasscode(event.target.value)}
              placeholder="أعد إدخال الرمز"
            />
          </label>
          <button type="submit">حفظ وتفعيل Admin Mode</button>
        </form>

        {error && <p className="error-box">{error}</p>}
      </section>
    );
  }

  return (
    <section className="panel admin-panel">
      <h2>Admin Mode Login</h2>
      <p className="muted">التعديل على الأسئلة متاح فقط في Admin Mode.</p>

      <form className="admin-form" onSubmit={onLoginSubmit}>
        <label>
          رمز المشرف
          <input
            type="password"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            placeholder="ادخل الرمز"
          />
        </label>
        <button type="submit">تفعيل Admin Mode</button>
      </form>

      {error && <p className="error-box">{error}</p>}
    </section>
  );
}
