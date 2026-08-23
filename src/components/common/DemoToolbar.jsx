import React, { useState } from "react";
import { Button, Badge, Modal, Card, Row, Col, Table } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/auth";
import { resetStorage } from "../../api/storageAdapter";
import { ROUTES } from "../../config/routes";

/**
 * Thanh công cụ Demo & Review 1-Click cho Đồ án FER202
 * Giúp người thuyết trình và người chấm bài chuyển vai trò và kiểm tra các tiêu chí chấm điểm nhanh chóng
 */
function DemoToolbar() {
  const navigate = useNavigate();
  const { user, switchDemoRole } = useAuth();
  const currentRole = user?.role;
  const [showGuideModal, setShowGuideModal] = useState(false);

  const handleSwitchRole = (targetRole) => {
    switchDemoRole(targetRole);
    navigate(ROUTES.DASHBOARD);
    const roleName = targetRole === ROLES.ADMIN ? "Quản trị viên (Admin)" : targetRole === ROLES.DOCTOR ? "Bác sĩ (Dr. Nguyen Minh)" : "Bệnh nhân (Le Trong Nghia)";
    
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
    });
    Toast.fire({
      icon: "success",
      title: `Đã đổi sang: ${roleName}`,
    });
  };

  const handleResetData = async () => {
    const result = await Swal.fire({
      title: "Khôi phục dữ liệu mẫu?",
      text: "Toàn bộ danh sách Bác sĩ, Bệnh nhân, Lịch hẹn 10 ngày tới và Bệnh án sẽ được reset về trạng thái chuẩn ban đầu.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Khôi phục ngay",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#0d6efd",
    });

    if (result.isConfirmed) {
      resetStorage();
      window.location.reload();
    }
  };

  return (
    <>
      <div className="d-flex align-items-center flex-wrap gap-2 py-1 px-2 bg-light border rounded-pill shadow-sm demo-toolbar-wrapper">
        <span className="small fw-bold text-muted d-none d-lg-inline ps-2">
          <i className="bi bi-person-gear text-primary me-1"></i>Demo:
        </span>

        {/* 1-Click Role Switcher */}
        <Button
          size="sm"
          variant={currentRole === ROLES.ADMIN ? "danger" : "outline-secondary"}
          className="rounded-pill py-0 px-2 fw-medium border-0 shadow-none d-flex align-items-center gap-1"
          style={{ fontSize: "0.75rem", height: "26px" }}
          onClick={() => handleSwitchRole(ROLES.ADMIN)}
          title="Đổi vai trò sang Quản trị viên"
        >
          <i className="bi bi-shield-lock-fill"></i>
          <span>Admin</span>
        </Button>

        <Button
          size="sm"
          variant={currentRole === ROLES.DOCTOR ? "primary" : "outline-secondary"}
          className="rounded-pill py-0 px-2 fw-medium border-0 shadow-none d-flex align-items-center gap-1"
          style={{ fontSize: "0.75rem", height: "26px" }}
          onClick={() => handleSwitchRole(ROLES.DOCTOR)}
          title="Đổi vai trò sang Bác sĩ điều trị"
        >
          <i className="bi bi-person-badge-fill"></i>
          <span>Bác sĩ</span>
        </Button>

        <Button
          size="sm"
          variant={currentRole === ROLES.PATIENT ? "success" : "outline-secondary"}
          className="rounded-pill py-0 px-2 fw-medium border-0 shadow-none d-flex align-items-center gap-1"
          style={{ fontSize: "0.75rem", height: "26px" }}
          onClick={() => handleSwitchRole(ROLES.PATIENT)}
          title="Đổi vai trò sang Bệnh nhân"
        >
          <i className="bi bi-person-heart"></i>
          <span>Bệnh nhân</span>
        </Button>

        {/* Nút Reset Dữ Liệu */}
        <Button
          size="sm"
          variant="outline-warning"
          className="rounded-circle p-0 text-dark border-0 shadow-none d-flex align-items-center justify-content-center"
          style={{ width: "26px", height: "26px" }}
          onClick={handleResetData}
          title="Khôi phục lại dữ liệu mẫu ban đầu"
        >
          <i className="bi bi-arrow-counterclockwise fs-6"></i>
        </Button>

        {/* Nút Cẩm nang Chấm điểm FER202 */}
        <Button
          size="sm"
          variant="outline-info"
          className="rounded-circle p-0 text-info border-0 shadow-none d-flex align-items-center justify-content-center"
          style={{ width: "26px", height: "26px" }}
          onClick={() => setShowGuideModal(true)}
          title="Xem tóm tắt tính năng & tiêu chí chấm điểm FER202"
        >
          <i className="bi bi-patch-question-fill fs-6"></i>
        </Button>
      </div>

      {/* Modal Cẩm nang Chấm điểm FER202 */}
      <Modal show={showGuideModal} onHide={() => setShowGuideModal(false)} size="lg" centered scrollable>
        <Modal.Header closeButton className="bg-primary text-white py-3">
          <Modal.Title as="h5" className="fw-bold mb-0 d-flex align-items-center gap-2">
            <i className="bi bi-award-fill"></i>
            <span>Cẩm Nang Demo & Tiêu Chí Đánh Giá (Môn FER202)</span>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-4">
          {/* Tóm tắt kiến trúc */}
          <div className="p-3 bg-light rounded-3 mb-4 border">
            <h6 className="fw-bold text-dark mb-2">
              <i className="bi bi-layers-fill text-primary me-2"></i>
              Công nghệ & Kiến trúc Đồ án:
            </h6>
            <div className="d-flex flex-wrap gap-2">
              <Badge bg="primary">React 18</Badge>
              <Badge bg="success">React-Bootstrap & Vanilla CSS</Badge>
              <Badge bg="info">Bootstrap Icons</Badge>
              <Badge bg="warning" text="dark">React Router DOM v6</Badge>
              <Badge bg="danger">Recharts Data Visualizations</Badge>
              <Badge bg="secondary">SweetAlert2 Notifications</Badge>
              <Badge bg="dark">LocalStorage Fallback Adapter (Vercel Ready)</Badge>
            </div>
          </div>

          {/* Ma trận phân quyền 3 Role */}
          <h6 className="fw-bold text-dark mb-3">
            <i className="bi bi-person-check-fill text-success me-2"></i>
            Phân cấp 3 Luồng Nghiệp vụ Chuyên Sâu (RBAC Matrix):
          </h6>

          <Table responsive bordered hover className="align-middle small mb-4">
            <thead className="table-light">
              <tr>
                <th>Tính năng / Quyền hạn</th>
                <th className="text-center text-danger">👑 Admin (Quản trị)</th>
                <th className="text-center text-primary">🩺 Doctor (Bác sĩ)</th>
                <th className="text-center text-success">🧑‍💼 Patient (Bệnh nhân)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="fw-semibold">Giao diện Dashboard</td>
                <td className="text-center">Trung tâm điều hành viện</td>
                <td className="text-center">Bàn làm việc Bác sĩ</td>
                <td className="text-center">Cổng sức khỏe cá nhân</td>
              </tr>
              <tr>
                <td className="fw-semibold">Quản lý Bác sĩ (/doctors)</td>
                <td className="text-center text-success">✓ Full CRUD (Thêm/Sửa/Xóa)</td>
                <td className="text-center text-muted">✕ Ẩn menu</td>
                <td className="text-center text-muted">✕ Ẩn menu</td>
              </tr>
              <tr>
                <td className="fw-semibold">Phạm vi Bệnh nhân (/patients)</td>
                <td className="text-center">Bệnh nhân toàn viện</td>
                <td className="text-center">Chỉ bệnh nhân của tôi</td>
                <td className="text-center text-muted">✕ Ẩn menu</td>
              </tr>
              <tr>
                <td className="fw-semibold">Lịch trực lâm sàng tuần</td>
                <td className="text-center">Xem lịch của mọi bác sĩ</td>
                <td className="text-center">Xem lịch của chính mình</td>
                <td className="text-center text-muted">✕</td>
              </tr>
              <tr>
                <td className="fw-semibold">Xử lý Lịch hẹn (/appointments)</td>
                <td className="text-center">Duyệt & Quản lý toàn viện</td>
                <td className="text-center">Duyệt & Khám ca của mình</td>
                <td className="text-center">Đặt lịch khám cá nhân</td>
              </tr>
              <tr>
                <td className="fw-semibold">Hồ sơ Bệnh án (/records)</td>
                <td className="text-center">Toàn bộ hồ sơ viện</td>
                <td className="text-center">Tạo & Chẩn đoán bệnh án</td>
                <td className="text-center">Xem bệnh án cá nhân</td>
              </tr>
            </tbody>
          </Table>

          {/* Các điểm cộng kỹ thuật */}
          <h6 className="fw-bold text-dark mb-2">
            <i className="bi bi-star-fill text-warning me-2"></i>
            Điểm cộng kỹ thuật nổi bật:
          </h6>
          <ul className="small text-muted mb-0 ps-3">
            <li className="mb-1"><strong>Quick View Modal:</strong> Nhấn vào bất kỳ ô StatCard nào trên Dashboard để xem nhanh danh sách chi tiết (Patients, Doctors, Schedule, Records).</li>
            <li className="mb-1"><strong>Real-time Schedule Status:</strong> Lịch trực tự động chuyển trạng thái <code>Đã qua</code> cho các ngày trong quá khứ và <code>Hôm nay</code> cho ngày hiện tại.</li>
            <li className="mb-1"><strong>Clean Architecture:</strong> Không phụ thuộc backend ngoài khi triển khai trên Vercel nhờ <code>storageAdapter</code> thông minh.</li>
            <li><strong>100% Thuần Tiếng Việt:</strong> Giao diện tự nhiên, sạch sẽ, không có chuỗi cứng lỗi thời.</li>
          </ul>
        </Modal.Body>

        <Modal.Footer className="bg-light py-2">
          <Button variant="primary" size="sm" className="px-4 rounded-pill" onClick={() => setShowGuideModal(false)}>
            Đã hiểu & Bắt đầu Demo
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default DemoToolbar;
