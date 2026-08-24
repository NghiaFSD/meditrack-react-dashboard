import React, { useState } from "react";
import { Navbar, Container, Nav, Badge } from "react-bootstrap";
import { getRoleLabel } from "../../utils/auth";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/auth";
import ProfileModal from "./ProfileModal";

/**
 * Header hiển thị thông tin người dùng đang đăng nhập bằng React-Bootstrap
 * Admin & Doctor: click avatar để chỉnh sửa thông tin cá nhân
 */
function Header() {
  const { user } = useAuth();
  const currentUser = user || {};
  const roleLabel = getRoleLabel(currentUser.role);
  const [showProfile, setShowProfile] = useState(false);

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

  const getRoleDescription = (role) => {
    if (role === "PATIENT") return "Xem lịch khám, hồ sơ bệnh án và sức khỏe của bạn.";
    if (role === "DOCTOR")  return "Theo dõi bệnh nhân phụ trách, lịch hẹn và bệnh án.";
    return "Quản lý bác sĩ, lịch trực và tiếp nhận bệnh nhân toàn viện.";
  };

  const badgeVariant = getRoleBadgeVariant(currentUser.role);

  return (
    <>
      <Navbar bg="white" expand="lg" className="border-bottom shadow-sm py-2 px-3 mb-4 sticky-top">
        <Container fluid className="px-0 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div>
            <h4 className="fw-bold mb-0 text-dark">
              {`Chào mừng trở lại, ${currentUser.fullName || "Khách"}`}
            </h4>
            <small className="text-muted">
              {getRoleDescription(currentUser.role)}
            </small>
          </div>

          <Nav className="d-flex flex-row align-items-center gap-2">
            {/* Thông tin User — Admin & Doctor có thể click để chỉnh sửa */}
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

      {/* Modal chỉnh sửa thông tin cá nhân (chỉ Admin & Doctor) */}
      {canEditProfile && (
        <ProfileModal show={showProfile} onHide={() => setShowProfile(false)} />
      )}
    </>
  );
}

export default Header;

