import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

// Trang 404 khi người dùng nhập route không tồn tại.
function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="not-found">
      <h1>404</h1>
      <p>{t("common.pageNotFoundMsg")}</p>
      <Link className="btn btn-primary" to="/dashboard">{t("common.goDashboard")}</Link>
    </div>
  );
}

export default NotFound;
