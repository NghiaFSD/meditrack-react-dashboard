import React, { useEffect, useState } from "react";
import { Modal, Form, Row, Col, Button, Badge } from "react-bootstrap";
import Swal from "sweetalert2";
import { doctorApi } from "../../api/doctorApi";

const SHIFT_OPTIONS = [
  { value: "Morning",   label: "☀️ Ca sáng",  hours: "07:30 – 11:30" },
  { value: "Afternoon", label: "🌙 Ca chiều", hours: "13:30 – 17:30" },
];

const NURSE_OPTIONS = [
  "ĐD. Nguyễn Thị Hoa",
  "ĐD. Trần Thu Trang",
  "ĐD. Lê Minh Châu",
  "ĐD. Phạm Thị Lan",
];

const ROOM_SUGGESTIONS = [
  "A-101","A-201","A-301",
  "B-103","B-202","B-305",
  "C-104","C-205","C-305",
  "D-102","D-204","D-306",
];

const INITIAL_FORM = {
  doctorId: "",
  shift: "Morning",
  room: "",
  nurse: NURSE_OPTIONS[0],
};

/**
 * Modal Tạo / Cập nhật Lịch trực Bác sĩ — Dùng cho Admin Dashboard & Trang Lịch trực
 * Lịch trực được tự động tính toán từ doctor.shift + doctor.room
 * => Chỉnh sửa shift & room là thay đổi lịch trực cho cả tuần
 */
function CreateDutyModal({ show, onHide, onSaved, preselectedDoctorId = null }) {
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  // Load danh sách bác sĩ
  useEffect(() => {
    if (!show) return;
    doctorApi.getAll().then((docs) => {
      setDoctors(docs || []);
      // Nếu có preselect doctor → điền sẵn thông tin
      const defaultId = preselectedDoctorId
        ? String(preselectedDoctorId)
        : docs[0]?.id
        ? String(docs[0].id)
        : "";
      const found = docs.find((d) => String(d.id) === defaultId);
      setForm({
        doctorId: defaultId,
        shift: found?.shift || "Morning",
        room: found?.room || "",
        nurse: found?.nurse || NURSE_OPTIONS[0],
      });
    });
  }, [show, preselectedDoctorId]);

  // Khi chọn bác sĩ khác: điền sẵn shift/room hiện tại của bác sĩ đó
  const handleDoctorChange = (e) => {
    const id = e.target.value;
    const found = doctors.find((d) => String(d.id) === id);
    setForm((prev) => ({
      ...prev,
      doctorId: id,
      shift: found?.shift || "Morning",
      room: found?.room || "",
      nurse: found?.nurse || NURSE_OPTIONS[0],
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.doctorId || !form.room.trim()) {
      Swal.fire("Thiếu thông tin", "Vui lòng chọn bác sĩ và nhập phòng khám.", "warning");
      return;
    }

    try {
      setSaving(true);
      const doctor = doctors.find((d) => String(d.id) === String(form.doctorId));
      if (!doctor) throw new Error("Không tìm thấy bác sĩ");

      // Cập nhật shift, room, nurse vào bác sĩ → lịch trực tự tính lại
      await doctorApi.update(doctor.id, {
        ...doctor,
        shift: form.shift,
        room: form.room.trim(),
        nurse: form.nurse,
      });

      const shiftLabel =
        form.shift === "Morning" ? "Ca sáng (07:30–11:30)" : "Ca chiều (13:30–17:30)";

      Swal.fire({
        title: "Đã lưu lịch trực!",
        html: `<b>${doctor.fullName}</b><br>
               ${shiftLabel} · Phòng <b>${form.room.trim()}</b>`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });

      onSaved?.();
      onHide();
    } catch {
      Swal.fire("Lỗi", "Không thể lưu lịch trực. Vui lòng thử lại.", "error");
    } finally {
      setSaving(false);
    }
  };

  const selectedDoctor = doctors.find((d) => String(d.id) === String(form.doctorId));
  const selectedShift = SHIFT_OPTIONS.find((s) => s.value === form.shift);

  return (
    <Modal show={show} onHide={onHide} centered size="md">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold fs-5">
          <i className="bi bi-calendar2-week-fill text-primary me-2"></i>
          Tạo / Cập nhật Lịch trực
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="px-4">
        {/* Thông tin preview */}
        {selectedDoctor && (
          <div className="d-flex align-items-center gap-3 p-3 bg-light rounded-3 mb-4">
            <div
              className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold"
              style={{ width: "46px", height: "46px", fontSize: "1rem", flexShrink: 0 }}
            >
              {selectedDoctor.fullName?.charAt(0) || "D"}
            </div>
            <div className="flex-grow-1">
              <div className="fw-bold text-dark">{selectedDoctor.fullName}</div>
              <div className="text-muted small">
                {selectedDoctor.specialization || selectedDoctor.specialty || "Bác sĩ"}
              </div>
            </div>
            {selectedShift && (
              <Badge
                bg={form.shift === "Morning" ? "warning" : "info"}
                text="dark"
                className="px-3 py-2"
              >
                {selectedShift.label}
                <div style={{ fontSize: "0.65rem", fontWeight: "normal" }}>
                  {selectedShift.hours}
                </div>
              </Badge>
            )}
          </div>
        )}

        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            {/* Chọn bác sĩ */}
            <Col xs={12}>
              <Form.Group>
                <Form.Label className="fw-semibold small">
                  Bác sĩ <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  name="doctorId"
                  value={form.doctorId}
                  onChange={handleDoctorChange}
                  className="rounded-3"
                  required
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} —{" "}
                      {d.specialization || d.specialty || "Bác sĩ"}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Ca trực */}
            <Col xs={12} sm={6}>
              <Form.Group>
                <Form.Label className="fw-semibold small">
                  Ca trực chính <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  name="shift"
                  value={form.shift}
                  onChange={handleChange}
                  className="rounded-3"
                  required
                >
                  {SHIFT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label} ({s.hours})
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Áp dụng cả tuần • T3/T5 sẽ xoay ca ngược lại
                </Form.Text>
              </Form.Group>
            </Col>

            {/* Phòng khám */}
            <Col xs={12} sm={6}>
              <Form.Group>
                <Form.Label className="fw-semibold small">
                  Phòng khám <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="room"
                  list="room-suggestions"
                  value={form.room}
                  onChange={handleChange}
                  placeholder="VD: A-201"
                  className="rounded-3"
                  required
                />
                <datalist id="room-suggestions">
                  {ROOM_SUGGESTIONS.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </Form.Group>
            </Col>

            {/* Điều dưỡng hỗ trợ */}
            <Col xs={12}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Điều dưỡng hỗ trợ</Form.Label>
                <Form.Select
                  name="nurse"
                  value={form.nurse}
                  onChange={handleChange}
                  className="rounded-3"
                >
                  {NURSE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Ghi chú lịch trực */}
            <Col xs={12}>
              <div className="p-3 bg-light rounded-3 small text-muted">
                <i className="bi bi-info-circle me-1 text-primary"></i>
                <strong>Lưu ý:</strong> Lịch trực được tạo tự động cho cả tuần dựa trên ca trực chính.
                T2/T4/T6 trực ca chính · T3/T5 trực ca xoay · T7 ca sáng · CN nghỉ.
              </div>
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
                <><i className="bi bi-calendar2-check-fill me-2"></i>Lưu Lịch trực</>
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default CreateDutyModal;
