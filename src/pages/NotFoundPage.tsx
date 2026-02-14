import { Link } from "react-router-dom";

export function NotFoundPage(): JSX.Element {
  return (
    <section className="panel">
      <h2>الصفحة غير موجودة</h2>
      <Link className="button-link" to="/">
        العودة للرئيسية
      </Link>
    </section>
  );
}
