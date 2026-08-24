import React, { useEffect, useState } from "react";
import { Modal, Form, Row, Col, Button, Badge } from "react-bootstrap";
import Swal from "sweetalert2";
import { useAuth } from "../../context/AuthContext";
import { doctorApi } from "../../api/doctorApi";
import { storageAdapter } from "../../api/storageAdapter";
import { ROLES } from "../../utils/auth";

/**
 * Modal chỉnh sửa thông tin cá nhân — Admin & Doctor
 * Doctor: fullName, email, phone, password có thể sửa
 *          chuyên khoa, phòng khám, ca trực → CỐ ĐỊNH (chỉ Admin mới đổi được)
 * Admin:  fullName, email, password có thể sửa
 */
function ProfileModal({ show, onHide }) {
  const { user, updateUser } = useAuth();
  const isDoctor = user?.role === ROLES.DOCTOR;
  const isAdmin = user?.role === ROLES.ADMIN;

  const [linkedDoctor, setLinkedDoctor] = useState(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);

  // Khi mở modal: load thông tin hiện tại
  useEffect(() => {
    if (!show || !user) return;
    setForm({
      fullName: user.fullName || "",
      email: user.email || "",
      phone: user.phone || "",
      password: "",
      confirmPassword: "",
    });

    // Nếu là Doctor: tìm bản ghi Doctor liên kết để hiển thị trường cố định
    if (isDoctor) {
      doctorApi.getAll().then((docs) => {
        const found = docs.find(
          (d) =>
            d.email === user.email ||
            d.userId === user.id ||
            String(d.id) === String(user.doctorId)
        );
        setLinkedDoctor(found || null);
      });
    }
  }, [show, user, isDoctor]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.fullName.trim() || !form.email.trim()) {
      Swal.fire("Thiếu thông tin", "Họ tên và email không được để trống.", "warning");
      return;
    }

    if (form.password && form.password !== form.confirmPassword) {
      Swal.fire("Mật khẩu không khớp", "Vui lòng nhập lại mật khẩu xác nhận.", "error");
      return;
    }

    try {
      setSaving(true);

      // Dữ liệu cần cập nhật vào user session
      const updatedFields = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        ...(isDoctor && { phone: form.phone.trim() }),
        ...(form.password && { password: form.password }),
      };

      // Cập nhật vào AuthContext + localStorage (session)
      updateUser(updatedFields);

      // Đồng thời cập nhật vào bảng users trong storageAdapter
      if (user?.id) {
        await storageAdapter.put(`/users/${user.id}`, {
          ...user,
          ...updatedFields,
        });
      }

      // Nếu là Doctor: cập nhật fullName và email vào bảng doctors
      if (isDoctor && linkedDoctor?.id) {
        await doctorApi.update(linkedDoctor.id, {
          ...linkedDoctor,
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        });
      }

      Swal.fire({
        title: "Đã lưu!",
        text: "Thông tin cá nhân đã được cập nhật thành công.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
      onHide();
    } catch {
      Swal.fire("Lỗi", "Không thể lưu thông tin. Vui lòng thử lại.", "error");
    } finally {
      setSaving(false);
    }
  };

  const badgeVariant = isAdmin ? "danger" : "primary";
  const roleLabel = isAdmin ? "Quản trị viên" : "Bác sĩ";
  const avatarLetter = user?.fullName?.charAt(0) || "U";

  return (
    <Modal show={show} onHide={onHide} centered size="md">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold fs-5">
          <i className="bi bi-person-circle me-2 text-primary"></i>
          Chỉnh sửa thông tin cá nhân
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="px-4">
        {/* Avatar + Role */}
        <div className="d-flex align-items-center gap-3 mb-4 p-3 bg-light rounded-3">
          <div
            className={`bg-${badgeVariant} text-white rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm`}
            style={{ width: "52px", height: "52px", fontSize: "1.2rem", flexShrink: 0 }}
          >
            {avatarLetter}
          </div>
          <div>
            <div className="fw-bold text-dark">{user?.fullName}</div>
            <Badge bg={badgeVariant} style={{ fontSize: "0.65rem" }}>{roleLabel}</Badge>
            <div className="text-muted small mt-1">{user?.email}</div>
          </div>
        </div>

        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            {/* Họ tên */}
            <Col xs={12}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Họ và tên</Form.Label>
                <Form.Control
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Nhập họ tên đầy đủ"
                  className="rounded-3"
                  required
                />
              </Form.Group>
            </Col>

            {/* Email */}
            <Col xs={12}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Email</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  className="rounded-3"
                  required
                />
              </Form.Group>
            </Col>

            {/* Số điện thoại — chỉ Doctor */}
            {isDoctor && (
              <Col xs={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold small">Số điện thoại</Form.Label>
                  <Form.Control
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="0901 234 567"
                    className="rounded-3"
                  />
                </Form.Group>
              </Col>
            )}

            {/* === Trường cố định chỉ Doctor mới có === */}
            {isDoctor && linkedDoctor && (
              <>
                <Col xs={12}>
                  <hr className="my-1" />
                  <div className="small text-muted mb-2">
                    <i className="bi bi-lock-fill me-1"></i>
                    Các trường sau chỉ Admin mới có thể thay đổi
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold small d-flex align-items-center gap-1">
                      Chuyên khoa
                      <Badge bg="secondary" style={{ fontSize: "0.6rem" }}>Cố định</Badge>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={linkedDoctor.specialization || linkedDoctor.specialty || "—"}
                      disabled
                      className="rounded-3 bg-light"
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} sm={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold small d-flex align-items-center gap-1">
                      Phòng khám
                      <Badge bg="secondary" style={{ fontSize: "0.6rem" }}>Cố định</Badge>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={linkedDoctor.room || "—"}
                      disabled
                      className="rounded-3 bg-light"
                    />
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label className="fw-semibold small d-flex align-items-center gap-1">
                      Ca trực chính
                      <Badge bg="secondary" style={{ fontSize: "0.6rem" }}>Cố định</Badge>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={
                        linkedDoctor.shift === "Morning"
                          ? "Ca sáng (07:30 – 11:30)"
                          : linkedDoctor.shift === "Afternoon"
                          ? "Ca chiều (13:30 – 17:30)"
                          : linkedDoctor.shift || "—"
                      }
                      disabled
                      className="rounded-3 bg-light"
                    />
                  </Form.Group>
                </Col>
              </>
            )}

            {/* Đổi mật khẩu */}
            <Col xs={12}>
              <hr className="my-1" />
              <div className="small text-muted mb-2">
                <i className="bi bi-shield-lock me-1"></i>
                Đổi mật khẩu (để trống nếu không muốn đổi)
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Mật khẩu mới</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="rounded-3"
                  minLength={form.password ? 6 : undefined}
                />
              </Form.Group>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Xác nhận mật khẩu</Form.Label>
                <Form.Control
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="rounded-3"
                />
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex gap-2 justify-content-end mt-4">
            <Button variant="outline-secondary" onClick={onHide} className="rounded-3 px-4">
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="rounded-3 px-4"
              disabled={saving}
            >
              {saving ? (
                <><span className="spinner-border spinner-border-sm me-2"></span>Đang lưu…</>
              ) : (
                <><i className="bi bi-check2-circle me-2"></i>Lưu thay đổi</>
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default ProfileModal;
