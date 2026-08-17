import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { ROUTES } from "../config/routes";

/**
 * Trang 404 Not Found khi người dùng truy cập route không tồn tại
 */
function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="not-found">
      <h1>404</h1>
      <p>{t("common.pageNotFoundMsg")}</p>
      <Link className="btn btn-primary" to={ROUTES.DASHBOARD}>
        {t("common.goDashboard")}
      </Link>
    </div>
  );
}

export default NotFound;
