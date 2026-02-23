import { Link } from "react-router-dom";
import { useI18n } from "../i18n";

export function NotFoundPage(): JSX.Element {
  const { t } = useI18n();
  return (
    <section className="panel empty-state">
      <h2>{t("pageNotFound")}</h2>
      <p className="muted">{t("pageNotFoundMsg")}</p>
      <Link className="button-link" to="/">
        {t("backToHome")}
      </Link>
    </section>
  );
}
