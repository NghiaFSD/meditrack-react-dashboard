import React, { useState } from "react";
import { Navbar, Container, Nav, Badge } from "react-bootstrap";
import { useLocation, Link } from "react-router-dom";
import { getRoleLabel } from "../../utils/auth";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/auth";
import ProfileModal from "./ProfileModal";

/**
 * Map đường dẫn → tên trang hiển thị + icon
 */
const PAGE_MAP = {
  "/dashboard":     { label: "Bảng điều khiển",    icon: "bi-speedometer2" },
  "/doctors":       { label: "Quản lý Bác sĩ",      icon: "bi-person-badge-fill" },
  "/duty-schedule": { label: "Lịch trực Bác sĩ",    icon: "bi-calendar-week-fill" },
  "/patients":      { label: "Bệnh nhân",            icon: "bi-people-fill" },
  "/appointments":  { label: "Lịch hẹn khám",        icon: "bi-calendar-check-fill" },
  "/records":       { label: "Hồ sơ bệnh án",        icon: "bi-file-earmark-medical-fill" },
};

function getPageInfo(pathname) {
  if (PAGE_MAP[pathname]) return PAGE_MAP[pathname];

  if (/^\/patients\/\d+\/appointments/.test(pathname)) {
    return { label: "Lịch hẹn của Bệnh nhân", icon: "bi-calendar-check-fill" };
  }

  if (/^\/patients\/\d+\/records/.test(pathname)) {
    return { label: "Hồ sơ bệnh án của Bệnh nhân", icon: "bi-file-earmark-medical-fill" };
  }

  if (/^\/patients\/\d+\/edit/.test(pathname)) {
    return { label: "Chỉnh sửa Bệnh nhân", icon: "bi-pencil-square" };
  }

  if (/^\/patients\/\d+/.test(pathname)) {
    return { label: "Chi tiết Bệnh nhân", icon: "bi-person-lines-fill" };
  }

  return { label: "MediTrack", icon: "bi-house-fill" };
}

function getBreadcrumbs(pathname) {
  const crumbs = [{ label: "Trang chủ", href: "/dashboard" }];

  if (pathname === "/dashboard") return crumbs;

  if (pathname.startsWith("/patients")) {
    crumbs.push({ label: "Bệnh nhân", href: "/patients" });

    const m = pathname.match(/^\/patients\/(\d+)/);
    if (m) {
      crumbs.push({ label: `#${m[1]}`, href: `/patients/${m[1]}` });

      if (pathname.includes("/edit")) {
        crumbs.push({ label: "Chỉnh sửa", href: null });
      } else if (pathname.includes("/appointments")) {
        crumbs.push({ label: "Lịch hẹn", href: null });
      } else if (pathname.includes("/records")) {
        crumbs.push({ label: "Hồ sơ bệnh án", href: null });
      }
    }
    return crumbs;
  }

  const page = PAGE_MAP[pathname];
  if (page) crumbs.push({ label: page.label, href: null });

  return crumbs;
}

/**
 * Header hiển thị tiêu đề trang theo URL hiện tại + thông tin người dùng
 */
function Header() {
  const { user } = useAuth();
  const currentUser = user || {};
  const roleLabel = getRoleLabel(currentUser.role);
  const [showProfile, setShowProfile] = useState(false);
  const location = useLocation();

  const { label: pageLabel, icon: pageIcon } = getPageInfo(location.pathname);

  const canEditProfile =
    currentUser.role === ROLES.DOCTOR || currentUser.role === ROLES.PATIENT;

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case "ADMIN":   return "danger";
      case "DOCTOR":  return "primary";
      case "PATIENT": return "success";
      default:        return "secondary";
    }
  };

  const badgeVariant = getRoleBadgeVariant(currentUser.role);

  return (
    <>
      <Navbar bg="white" expand="lg" className="border-bottom shadow-sm py-2 px-3 mb-4 sticky-top">
        <Container fluid className="px-0 d-flex flex-wrap align-items-center justify-content-between gap-2">
          {/* Tiêu đề trang & Breadcrumb */}
          <div>
            <h4 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
              <i className={`bi ${pageIcon} text-primary`} style={{ fontSize: "1.1rem" }}></i>
              {pageLabel}
            </h4>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-0" style={{ fontSize: "0.78rem" }}>
                {getBreadcrumbs(location.pathname).map((crumb, idx, arr) => (
                  <li
                    key={idx}
                    className={`breadcrumb-item ${idx === arr.length - 1 ? "active text-primary fw-semibold" : ""}`}
                    aria-current={idx === arr.length - 1 ? "page" : undefined}
                  >
                    {crumb.href ? (
                      <Link to={crumb.href} className="text-decoration-none text-muted">
                        {idx === 0 && <i className="bi bi-house me-1"></i>}
                        {crumb.label}
                      </Link>
                    ) : (
                      crumb.label
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>

          <Nav className="d-flex flex-row align-items-center gap-2">
            {/* Hiển thị URL đang truy cập (nhỏ gọn) */}
            <div className="d-none d-lg-flex align-items-center gap-1 px-2 py-1 rounded-2 bg-light border me-2">
              <i className="bi bi-link-45deg text-muted" style={{ fontSize: "0.8rem" }}></i>
              <code className="text-muted" style={{ fontSize: "0.75rem" }}>
                {location.pathname}
              </code>
            </div>

            {/* Thông tin User */}
            <div
              className={`d-flex align-items-center gap-2 ps-2 border-start ${canEditProfile ? "cursor-pointer" : ""}`}
              onClick={() => canEditProfile && setShowProfile(true)}
              title={canEditProfile ? "Nhấn để chỉnh sửa thông tin cá nhân" : ""}
              style={{ cursor: canEditProfile ? "pointer" : "default" }}
            >
              <div
                className={`bg-${badgeVariant} text-white rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm position-relative`}
                style={{ width: "38px", height: "38px", fontSize: "0.9rem", transition: "opacity 0.2s" }}
                onMouseEnter={(e) => { if (canEditProfile) e.currentTarget.style.opacity = "0.8"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                {currentUser.avatar || currentUser.fullName?.charAt(0) || "U"}
                {canEditProfile && (
                  <span
                    className="position-absolute bottom-0 end-0 bg-white rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: "14px", height: "14px", fontSize: "0.55rem", border: "1.5px solid #dee2e6" }}
                  >
                    <i className="bi bi-pencil-fill text-secondary"></i>
                  </span>
                )}
              </div>
              <div className="d-none d-md-block text-start">
                <div className="fw-bold small text-dark lh-sm">{currentUser.fullName || "Người dùng"}</div>
                <Badge bg={badgeVariant} className="mt-1" style={{ fontSize: "0.65rem" }}>
                  {roleLabel}
                </Badge>
              </div>
            </div>
          </Nav>
        </Container>
      </Navbar>

      {/* Modal Profile */}
      {canEditProfile && (
        <ProfileModal show={showProfile} onHide={() => setShowProfile(false)} />
      )}
    </>
  );
}

export default Header;
