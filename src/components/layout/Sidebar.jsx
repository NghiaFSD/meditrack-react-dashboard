import { NavLink, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { getMenuItemsForRole } from "../../data/menuItems";
import { getRoleLabel } from "../../utils/auth";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { ROUTES } from "../../config/routes";
import { APP_CONFIG } from "../../config/appConfig";

/**
 * Sidebar chứa menu điều hướng chính với đa ngôn ngữ và phân quyền role
 */
function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const menuItems = getMenuItemsForRole(user?.role);
  const { lang, t } = useLanguage();

  const getMenuTranslationKey = (path) => {
    if (path === ROUTES.DASHBOARD) return "nav.dashboard";
    if (path === ROUTES.PATIENTS) return "nav.patients";
    if (path === ROUTES.APPOINTMENTS) return "nav.appointments";
    if (path === ROUTES.RECORDS) return "nav.medicalRecords";
    return "";
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: lang === "vi" ? "Đăng xuất?" : "Logout?",
      text: lang === "vi" ? `Bạn có chắc chắn muốn đăng xuất khỏi ${APP_CONFIG.appName}?` : `Do you want to log out of ${APP_CONFIG.appName}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: lang === "vi" ? "Đăng xuất" : "Logout",
      cancelButtonText: lang === "vi" ? "Hủy" : "Cancel",
    });

    if (result.isConfirmed) {
      logout();
      navigate(ROUTES.LOGIN);
    }
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">M</div>
        <div>
          <h1>{APP_CONFIG.appName}</h1>
          <p>{lang === "vi" ? APP_CONFIG.appSubtitleVi : `${getRoleLabel(user?.role)} Dashboard`}</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            <span>{item.icon}</span>
            {t(getMenuTranslationKey(item.path), item.label)}
          </NavLink>
        ))}
      </nav>

      <button className="logout-btn" onClick={handleLogout}>
        🚪 {t("nav.logout")}
      </button>
    </aside>
  );
}

export default Sidebar;
