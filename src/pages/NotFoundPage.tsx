import { Link } from "react-router-dom";

export function NotFoundPage(): JSX.Element {
  return (
    <section className="panel empty-state">
      <h2>Page Not Found</h2>
      <p className="muted">The page you are looking for does not exist.</p>
      <Link className="button-link" to="/">
        Back to Home
      </Link>
    </section>
  );
}
