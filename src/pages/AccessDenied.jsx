import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { ROUTES } from "../config/routes";

/**
 * Trang 403 Access Denied khi người dùng không đủ quyền truy cập
 */
function AccessDenied() {
  const { t } = useLanguage();

  return (
    <div className="not-found">
      <h1>403</h1>
      <p>{t("common.accessDeniedMsg")}</p>
      <Link className="btn btn-primary" to={ROUTES.DASHBOARD}>
        {t("common.goDashboard")}
      </Link>
    </div>
  );
}

export default AccessDenied;
