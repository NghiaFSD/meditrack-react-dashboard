import React from "react";
import { Navbar, Container, Nav, Dropdown, Badge, Button } from "react-bootstrap";
import { getRoleLabel } from "../../utils/auth";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

/**
 * Header hiển thị thông tin user đang đăng nhập và nút chuyển đổi ngôn ngữ bằng React-Bootstrap
 */
function Header() {
  const { user, logout } = useAuth();
  const currentUser = user || {};
  const roleLabel = getRoleLabel(currentUser.role);
  const { lang, toggleLanguage, t } = useLanguage();

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case "ADMIN":
        return "danger";
      case "DOCTOR":
        return "primary";
      case "PATIENT":
        return "success";
      default:
        return "secondary";
    }
  };

  return (
    <Navbar bg="white" expand="lg" className="border-bottom shadow-sm py-2 px-3 mb-4 sticky-top">
      <Container fluid className="px-0">
        <div>
          <h4 className="fw-bold mb-0 text-dark">
            {lang === "vi"
              ? `Chào mừng trở lại, ${currentUser.fullName || "Khách"}`
              : `Welcome back, ${currentUser.fullName || "Guest"}`}
          </h4>
          <small className="text-muted">
            {currentUser.role === "PATIENT"
              ? t("dashboard.descPatient")
              : currentUser.role === "DOCTOR"
              ? t("dashboard.descDoctor")
              : t("dashboard.descAdmin")}
          </small>
        </div>

        <Nav className="ms-auto d-flex flex-row align-items-center gap-2">
          {/* Nút chuyển đổi ngôn ngữ */}
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={toggleLanguage}
            className="rounded-pill d-flex align-items-center gap-1 px-3 py-1 fw-semibold"
            title="Chuyển đổi ngôn ngữ / Switch language"
          >
            <i className="bi bi-translate"></i>
            <span>{lang === "vi" ? "🇻🇳 Tiếng Việt" : "🇬🇧 English"}</span>
          </Button>

          {/* Thông báo */}
          <Button variant="light" size="sm" className="rounded-circle p-2 text-muted border-0 position-relative">
            <i className="bi bi-bell fs-5"></i>
            <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
              <span className="visually-hidden">New alerts</span>
            </span>
          </Button>

          {/* Thông tin User */}
          <div className="d-flex align-items-center gap-2 ps-2 border-start">
            <div
              className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm"
              style={{ width: "38px", height: "38px", fontSize: "0.9rem" }}
            >
              {currentUser.avatar || currentUser.fullName?.charAt(0) || "U"}
            </div>
            <div className="d-none d-md-block text-start">
              <div className="fw-bold small text-dark lh-sm">{currentUser.fullName || "User"}</div>
              <Badge bg={getRoleBadgeVariant(currentUser.role)} className="mt-1" style={{ fontSize: "0.65rem" }}>
                {lang === "vi"
                  ? currentUser.role === "ADMIN"
                    ? "Quản trị viên"
                    : currentUser.role === "DOCTOR"
                    ? "Bác sĩ"
                    : "Bệnh nhân"
                  : roleLabel}
              </Badge>
            </div>
          </div>
        </Nav>
      </Container>
    </Navbar>
  );
}

export default Header;
