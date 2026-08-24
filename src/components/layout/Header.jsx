import React from "react";
import { Navbar, Container, Nav, Badge } from "react-bootstrap";
import { getRoleLabel } from "../../utils/auth";
import { useAuth } from "../../context/AuthContext";

/**
 * Header hiển thị thông tin người dùng đang đăng nhập bằng React-Bootstrap
 */
function Header() {
  const { user } = useAuth();
  const currentUser = user || {};
  const roleLabel = getRoleLabel(currentUser.role);

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

  const getRoleDescription = (role) => {
    if (role === "PATIENT") return "Xem lịch khám, hồ sơ bệnh án và sức khỏe của bạn.";
    if (role === "DOCTOR") return "Theo dõi bệnh nhân phụ trách, lịch hẹn và bệnh án.";
    return "Quản lý bác sĩ, lịch trực và tiếp nhận bệnh nhân toàn viện.";
  };

  return (
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
          {/* Thông tin User */}
          <div className="d-flex align-items-center gap-2 ps-2 border-start">
            <div
              className={`bg-${getRoleBadgeVariant(currentUser.role)} text-white rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm`}
              style={{ width: "38px", height: "38px", fontSize: "0.9rem" }}
            >
              {currentUser.avatar || currentUser.fullName?.charAt(0) || "U"}
            </div>
            <div className="d-none d-md-block text-start">
              <div className="fw-bold small text-dark lh-sm">{currentUser.fullName || "Người dùng"}</div>
              <Badge bg={getRoleBadgeVariant(currentUser.role)} className="mt-1" style={{ fontSize: "0.65rem" }}>
                {roleLabel}
              </Badge>
            </div>
          </div>
        </Nav>
      </Container>
    </Navbar>
  );
}

export default Header;
