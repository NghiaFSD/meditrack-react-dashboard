import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Nav, Button } from "react-bootstrap";
import Swal from "sweetalert2";
import { getMenuItemsForRole } from "../../data/menuItems";
import { getRoleLabel } from "../../utils/auth";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { ROUTES } from "../../config/routes";
import { APP_CONFIG } from "../../config/appConfig";

const ICON_MAP = {
  "/": "bi-speedometer2",
  "/patients": "bi-people-fill",
  "/appointments": "bi-calendar2-check-fill",
  "/records": "bi-file-earmark-medical-fill",
};

/**
 * Sidebar chứa menu điều hướng chính với React-Bootstrap và Bootstrap Icons (Thuần Tiếng Việt)
 */
function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const menuItems = getMenuItemsForRole(user?.role);
  const { t } = useLanguage();

  const getMenuTranslationKey = (path) => {
    if (path === ROUTES.DASHBOARD) return "nav.dashboard";
    if (path === ROUTES.PATIENTS) return "nav.patients";
    if (path === ROUTES.APPOINTMENTS) return "nav.appointments";
    if (path === ROUTES.RECORDS) return "nav.medicalRecords";
    return "";
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Đăng xuất?",
      text: `Bạn có chắc chắn muốn đăng xuất khỏi ${APP_CONFIG.appName}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Đăng xuất",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#dc3545",
    });

    if (result.isConfirmed) {
      logout();
      navigate(ROUTES.LOGIN);
    }
  };

  return (
    <aside className="d-flex flex-column flex-shrink-0 p-3 bg-dark text-white sidebar-container" style={{ width: "260px", minHeight: "100vh" }}>
      {/* Brand Header */}
      <div className="d-flex align-items-center gap-2 mb-4 pb-3 border-bottom border-secondary px-2">
        <div
          className="bg-primary text-white rounded-3 d-flex align-items-center justify-content-center fw-bold shadow"
          style={{ width: "40px", height: "40px", fontSize: "1.2rem" }}
        >
          <i className="bi bi-heart-pulse-fill"></i>
        </div>
        <div>
          <h5 className="fw-bold mb-0 text-white tracking-wide">{APP_CONFIG.appName}</h5>
          <small className="text-secondary" style={{ fontSize: "0.75rem" }}>
            {APP_CONFIG.appSubtitleVi}
          </small>
        </div>
      </div>

      {/* Navigation Links */}
      <Nav className="nav-pills flex-column mb-auto gap-1">
        {menuItems.map((item) => {
          const iconClass = ICON_MAP[item.path] || "bi-grid-fill";
          return (
            <Nav.Item key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `nav-link d-flex align-items-center gap-2 px-3 py-2 rounded-3 fw-medium transition-all ${
                    isActive
                      ? "active bg-primary text-white shadow-sm"
                      : "text-light text-opacity-75 hover-bg-secondary"
                  }`
                }
              >
                <i className={`bi ${iconClass} fs-5`}></i>
                <span>{t(getMenuTranslationKey(item.path), item.label)}</span>
              </NavLink>
            </Nav.Item>
          );
        })}
      </Nav>

      {/* Logout Button */}
      <div className="pt-3 border-top border-secondary mt-auto">
        <Button
          variant="outline-danger"
          className="w-100 d-flex align-items-center justify-content-center gap-2 py-2 fw-medium rounded-3"
          onClick={handleLogout}
        >
          <i className="bi bi-box-arrow-right fs-5"></i>
          <span>{t("nav.logout")}</span>
        </Button>
      </div>
    </aside>
  );
}

export default Sidebar;
