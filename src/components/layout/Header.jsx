import React, { useState } from "react";
import { Navbar, Container, Nav, Badge, Dropdown, Modal, Button, Table, Card } from "react-bootstrap";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { getRoleLabel } from "../../utils/auth";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/auth";
import ProfileModal from "./ProfileModal";

// Dữ liệu 3 tài khoản chính để Switch nhanh khi demo
const DEMO_ACCOUNTS = {
  ADMIN: {
    id: "1",
    fullName: "Admin User",
    email: "admin@gmail.com",
    role: "ADMIN",
    avatar: "AU",
  },
  DOCTOR: {
    id: "2",
    fullName: "Dr. Nguyen Minh",
    email: "doctor@gmail.com",
    role: "DOCTOR",
    avatar: "NM",
  },
  PATIENT: {
    id: "3",
    fullName: "Le Trong Nghia",
    email: "patient@gmail.com",
    role: "PATIENT",
    avatar: "LH",
  },
};

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
 * Header tối ưu cho Demo môn FER202:
 * - Chuyển đổi nhanh 3 Role (Admin / Bác sĩ / Bệnh nhân) chỉ 1-click
 * - Modal FER202 Checklist tóm tắt toàn bộ tính năng kỹ thuật đã hiện thực
 * - Breadcrumb URL động & URL badge
 */
function Header() {
  const { user, login } = useAuth();
  const currentUser = user || {};
  const roleLabel = getRoleLabel(currentUser.role);
  const [showProfile, setShowProfile] = useState(false);
  const [showDemoGuide, setShowDemoGuide] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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

  const handleQuickSwitch = (roleKey) => {
    const targetUser = DEMO_ACCOUNTS[roleKey];
    if (targetUser) {
      login(targetUser);
      navigate("/dashboard");
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
            {/* Nút Checklist FER202 */}
            <Button
              variant="outline-secondary"
              size="sm"
              className="d-none d-md-flex align-items-center gap-1 rounded-pill px-3 py-1"
              style={{ fontSize: "0.75rem" }}
              onClick={() => setShowDemoGuide(true)}
              title="Xem danh sách tính năng chấm điểm môn FER202"
            >
              <i className="bi bi-mortarboard-fill text-warning"></i>
              <span className="fw-semibold">FER202 Checklist</span>
            </Button>

            {/* Bộ chuyển đổi nhanh Role (1-Click Switch dành cho Demo) */}
            <div className="d-flex align-items-center gap-1 bg-light p-1 rounded-pill border">
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-2 py-0 fw-semibold ${
                  currentUser.role === ROLES.ADMIN ? "btn-danger shadow-sm text-white" : "btn-light text-muted"
                }`}
                style={{ fontSize: "0.72rem" }}
                onClick={() => handleQuickSwitch("ADMIN")}
                title="Chuyển sang quyền Admin"
              >
                🛡️ Admin
              </button>
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-2 py-0 fw-semibold ${
                  currentUser.role === ROLES.DOCTOR ? "btn-primary shadow-sm text-white" : "btn-light text-muted"
                }`}
                style={{ fontSize: "0.72rem" }}
                onClick={() => handleQuickSwitch("DOCTOR")}
                title="Chuyển sang quyền Bác sĩ"
              >
                👨‍⚕️ Bác sĩ
              </button>
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-2 py-0 fw-semibold ${
                  currentUser.role === ROLES.PATIENT ? "btn-success shadow-sm text-white" : "btn-light text-muted"
                }`}
                style={{ fontSize: "0.72rem" }}
                onClick={() => handleQuickSwitch("PATIENT")}
                title="Chuyển sang quyền Bệnh nhân"
              >
                🧑‍🦽 Bệnh nhân
              </button>
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
                style={{ width: "36px", height: "36px", fontSize: "0.85rem" }}
              >
                {currentUser.avatar || currentUser.fullName?.charAt(0) || "U"}
              </div>
              <div className="d-none d-lg-block text-start">
                <div className="fw-bold small text-dark lh-sm">{currentUser.fullName || "Người dùng"}</div>
                <Badge bg={badgeVariant} style={{ fontSize: "0.62rem" }}>
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

      {/* Modal Hướng dẫn Demo môn FER202 */}
      <Modal show={showDemoGuide} onHide={() => setShowDemoGuide(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title className="h5 fw-bold d-flex align-items-center gap-2">
            <i className="bi bi-mortarboard-fill text-warning"></i>
            Bảng Tính Năng Demo Đồ Án Môn FER202
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <p className="text-muted small mb-3">
            Hệ thống <strong>MediTrack</strong> được xây dựng hoàn chỉnh theo chuẩn kiến trúc React.js đáp ứng toàn diện các tiêu chí đánh giá môn FER202:
          </p>

          <Row className="g-3">
            <Col xs={12} md={6}>
              <Card className="border shadow-none h-100">
                <Card.Body className="p-3">
                  <h6 className="fw-bold text-primary mb-2">
                    <i className="bi bi-diagram-3-fill me-1"></i> 1. React Router DOM (v6)
                  </h6>
                  <ul className="small text-muted mb-0 ps-3">
                    <li><strong>Protected Routes:</strong> Phân quyền 3 vai trò (Admin, Doctor, Patient).</li>
                    <li><strong>Nested Routes:</strong> <code>/patients/:id/records</code>, <code>/patients/:id/appointments</code>.</li>
                    <li><strong>URL Query Params:</strong> <code>useSearchParams</code> đồng bộ bộ lọc trực tiếp lên thanh URL (VD: <code>?status=Pending&doctorId=2</code>).</li>
                  </ul>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} md={6}>
              <Card className="border shadow-none h-100">
                <Card.Body className="p-3">
                  <h6 className="fw-bold text-success mb-2">
                    <i className="bi bi-server me-1"></i> 2. RESTful API & JSON-Server
                  </h6>
                  <ul className="small text-muted mb-0 ps-3">
                    <li><strong>JSON Server:</strong> Chạy cổng <code>9000</code> với file <code>database.json</code>.</li>
                    <li><strong>Axios Client:</strong> Đầy đủ CRUD (GET, POST, PUT, DELETE, PATCH).</li>
                    <li><strong>Data Persistence:</strong> Dữ liệu thêm/sửa/xóa lưu vĩnh viễn vào file JSON.</li>
                  </ul>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} md={6}>
              <Card className="border shadow-none h-100">
                <Card.Body className="p-3">
                  <h6 className="fw-bold text-warning mb-2">
                    <i className="bi bi-cpu-fill me-1"></i> 3. React Core & Hooks
                  </h6>
                  <ul className="small text-muted mb-0 ps-3">
                    <li><code>useState</code>, <code>useEffect</code> nạp dữ liệu async.</li>
                    <li><code>useMemo</code> tính toán KPI, cảnh báo glucose và lọc thông minh.</li>
                    <li><code>useContext</code> (AuthContext) quản lý trạng thái đăng nhập toàn cục.</li>
                  </ul>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} md={6}>
              <Card className="border shadow-none h-100">
                <Card.Body className="p-3">
                  <h6 className="fw-bold text-danger mb-2">
                    <i className="bi bi-shield-check me-1"></i> 4. Nghiệp vụ Y tế 3 Role (RBAC)
                  </h6>
                  <ul className="small text-muted mb-0 ps-3">
                    <li><strong>Admin:</strong> Quản lý Bác sĩ, Lịch trực, Bệnh nhân toàn viện.</li>
                    <li><strong>Bác sĩ:</strong> Duyệt lịch hẹn ca trực, theo dõi hồ sơ điều trị.</li>
                    <li><strong>Bệnh nhân:</strong> Đặt lịch khám, theo dõi chỉ số đường huyết cá nhân.</li>
                  </ul>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <div className="mt-3 p-3 bg-light rounded-3 border small">
            <strong>💡 Mẹo trình bày:</strong> Sử dụng thanh chuyển đổi <code>[🛡️ Admin] [👨‍⚕️ Bác sĩ] [🧑‍🦽 Bệnh nhân]</code> ngay trên Header để chuyển vai trò tức thì khi giáo viên yêu cầu kiểm tra phân quyền.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowDemoGuide(false)} className="rounded-pill px-4">
            Đã hiểu
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default Header;
