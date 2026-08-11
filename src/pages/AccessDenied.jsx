import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

function AccessDenied() {
  const { t } = useLanguage();

  return (
    <div className="not-found">
      <h1>403</h1>
      <p>{t("common.accessDeniedMsg")}</p>
      <Link className="btn btn-primary" to="/dashboard">{t("common.goDashboard")}</Link>
    </div>
  );
}

export default AccessDenied;
