import { NavLink, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { getMenuItemsForRole } from "../../data/menuItems";
import { clearCurrentUser, getCurrentUser, getRoleLabel } from "../../utils/auth";
import { useLanguage } from "../../context/LanguageContext";

// Sidebar chứa menu điều hướng chính với đa ngôn ngữ.
function Sidebar() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const menuItems = getMenuItemsForRole(currentUser?.role);
  const { lang, t } = useLanguage();

  const getMenuTranslationKey = (path) => {
    if (path === "/dashboard") return "nav.dashboard";
    if (path === "/patients") return "nav.patients";
    if (path === "/appointments") return "nav.appointments";
    if (path === "/records") return "nav.medicalRecords";
    return "";
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: lang === "vi" ? "Đăng xuất?" : "Logout?",
      text: lang === "vi" ? "Bạn có chắc chắn muốn đăng xuất khỏi MediTrack?" : "Do you want to log out of MediTrack?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: lang === "vi" ? "Đăng xuất" : "Logout",
      cancelButtonText: lang === "vi" ? "Hủy" : "Cancel",
    });

    if (result.isConfirmed) {
      clearCurrentUser();
      navigate("/login");
    }
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">M</div>
        <div>
          <h1>MediTrack</h1>
          <p>{lang === "vi" ? "Hệ thống Y tế" : `${getRoleLabel(currentUser?.role)} Dashboard`}</p>
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

      <button className="logout-btn" onClick={handleLogout}>🚪 {t("nav.logout")}</button>
    </aside>
  );
}

export default Sidebar;
