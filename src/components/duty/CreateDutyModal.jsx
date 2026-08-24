import React, { useEffect, useMemo, useState } from "react";
import { Modal, Form, Row, Col, Button, Badge } from "react-bootstrap";
import Swal from "sweetalert2";
import { doctorApi } from "../../api/doctorApi";
import { translateSpecialty } from "../../utils/translations";
import { saveCustomDutySchedule, getLocalDateStr, getCustomDutySchedules, getDoctorWeeklySchedule } from "../../utils/dutySchedule";

const SHIFT_OPTIONS = [
  { value: "Ca sáng", label: "☀️ Ca sáng", hours: "07:30 - 11:30", variant: "warning" },
  { value: "Ca chiều", label: "🌙 Ca chiều", hours: "13:30 - 17:30", variant: "info" },
  { value: "Cả ngày", label: "☀️🌙 Cả ngày (2 ca: Sáng & Chiều)", hours: "07:30 - 11:30 & 13:30 - 17:30", variant: "success" },
  { value: "Ca tối", label: "⭐ Ca tối (Ngoài giờ)", hours: "17:30 - 21:00", variant: "primary" },
  { value: "Nghỉ trực", label: "🏖️ Nghỉ trực", hours: "Nghỉ ca", variant: "secondary" },
];

const NURSE_OPTIONS = [
  "ĐD. Nguyễn Thị Hoa",
  "ĐD. Trần Thu Trang",
  "ĐD. Lê Minh Châu",
  "ĐD. Phạm Thị Lan",
];

const ROOM_OPTIONS = [
  "A-101", "A-201", "A-301",
  "B-103", "B-202", "B-305",
  "C-104", "C-205", "C-305",
  "D-102", "D-204", "D-306",
];

const DAY_NAMES = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

/**
 * Modal Tạo / Phân ca trực Bác sĩ theo Ngày cụ thể (Phương án 1 - Demo linh hoạt)
 */
function CreateDutyModal({
  show,
  onHide,
  onSaved,
  preselectedDoctorId = null,
  preselectedDate = null,
}) {
  const [doctors, setDoctors] = useState([]);
  const todayStr = getLocalDateStr();

  // Tạo danh sách 7 ngày trong tuần hiện tại
  const weekDays = useMemo(() => {
    const curr = new Date();
    const currentDayIndex = curr.getDay();
    const mondayOffset = currentDayIndex === 0 ? -6 : 1 - currentDayIndex;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + mondayOffset);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = getLocalDateStr(d);
      const dayName = DAY_NAMES[d.getDay()];
      days.push({
        date: dateStr,
        dayName,
        label: `${dayName}, ${dateStr}${dateStr === todayStr ? " (Hôm nay)" : ""}`,
      });
    }
    return days;
  }, [todayStr]);

  const [form, setForm] = useState({
    date: todayStr,
    doctorId: "",
    shiftType: "Ca sáng",
    room: "A-201",
    nurse: NURSE_OPTIONS[0],
  });
  const [saving, setSaving] = useState(false);

  // Load danh sách bác sĩ khi mở modal
  useEffect(() => {
    if (!show) return;
    doctorApi.getAll().then((docs) => {
      setDoctors(docs || []);
      const defaultDocId = preselectedDoctorId
        ? String(preselectedDoctorId)
        : docs[0]?.id
        ? String(docs[0].id)
        : "";
      const defaultDate = preselectedDate || todayStr;

      // Kiểm tra xem ngày đó bác sĩ đó đã có custom chưa
      const customList = getCustomDutySchedules();
      const existing = customList.find(
        (c) => c.date === defaultDate && String(c.doctorId) === defaultDocId
      );

      const foundDoc = docs.find((d) => String(d.id) === defaultDocId);

      setForm({
        date: defaultDate,
        doctorId: defaultDocId,
        shiftType: existing?.shiftType || (foundDoc?.shift === "Afternoon" ? "Ca chiều" : "Ca sáng"),
        room: existing?.room || foundDoc?.room || "A-201",
        nurse: existing?.nurse || foundDoc?.nurse || NURSE_OPTIONS[0],
      });
    });
  }, [show, preselectedDoctorId, preselectedDate, todayStr]);

  // Khi đổi Bác sĩ hoặc đổi Ngày: nạp thông tin ca nếu đã tồn tại
  const handleDoctorChange = (e) => {
    const docId = e.target.value;
    const customList = getCustomDutySchedules();
    const existing = customList.find(
      (c) => c.date === form.date && String(c.doctorId) === docId
    );
    const foundDoc = doctors.find((d) => String(d.id) === docId);

    setForm((prev) => ({
      ...prev,
      doctorId: docId,
      shiftType: existing?.shiftType || (foundDoc?.shift === "Afternoon" ? "Ca chiều" : "Ca sáng"),
      room: existing?.room || foundDoc?.room || "A-201",
      nurse: existing?.nurse || NURSE_OPTIONS[0],
    }));
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    const customList = getCustomDutySchedules();
    const existing = customList.find(
      (c) => c.date === newDate && String(c.doctorId) === form.doctorId
    );
    const foundDoc = doctors.find((d) => String(d.id) === form.doctorId);

    setForm((prev) => ({
      ...prev,
      date: newDate,
      shiftType: existing?.shiftType || (foundDoc?.shift === "Afternoon" ? "Ca chiều" : "Ca sáng"),
      room: existing?.room || foundDoc?.room || "A-201",
      nurse: existing?.nurse || NURSE_OPTIONS[0],
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.doctorId || !form.date) {
      Swal.fire("Thiếu thông tin", "Vui lòng chọn ngày và bác sĩ trực.", "warning");
      return;
    }

    try {
      setSaving(true);
      const doctor = doctors.find((d) => String(d.id) === String(form.doctorId));
      if (!doctor) throw new Error("Không tìm thấy bác sĩ");

      const selectedShiftObj = SHIFT_OPTIONS.find((s) => s.value === form.shiftType);
      const isOff = form.shiftType === "Nghỉ trực";

      // Kiểm tra trùng lặp Phòng khám (nếu không phải ca Nghỉ trực)
      if (!isOff) {
        const otherDoctors = doctors.filter((d) => String(d.id) !== String(doctor.id));
        let roomConflict = null;

        for (const otherDoc of otherDoctors) {
          const otherSchedule = getDoctorWeeklySchedule(otherDoc);
          const daySchedule = otherSchedule.find((s) => s.date === form.date);
          if (
            daySchedule &&
            daySchedule.isWorking &&
            daySchedule.shiftType === form.shiftType &&
            daySchedule.room === form.room
          ) {
            roomConflict = {
              doctor: otherDoc,
              room: daySchedule.room,
              shiftType: daySchedule.shiftType,
              date: form.date,
            };
            break;
          }
        }

        if (roomConflict) {
          Swal.fire({
            title: "Trùng lặp Phòng khám!",
            html: `<b>Phòng ${form.room}</b> trong <b>${form.shiftType}</b> ngày <b>${form.date}</b> đã được phân công cho bác sĩ <b>${roomConflict.doctor.fullName}</b>.<br><br>Vui lòng chọn phòng khám khác hoặc ca làm việc khác.`,
            icon: "warning",
          });
          setSaving(false);
          return;
        }
      }

      // Lưu phân ca trực theo ngày cụ thể vào localStorage
      saveCustomDutySchedule({
        date: form.date,
        doctorId: doctor.id,
        shiftType: form.shiftType,
        shiftHours: selectedShiftObj?.hours || "07:30 - 11:30",
        room: isOff ? "-" : form.room,
        nurse: isOff ? "-" : form.nurse,
      });

      // Hiển thị thông báo thành công
      Swal.fire({
        title: "Đã phân ca trực thành công!",
        html: `<b>${doctor.fullName}</b><br>
               📅 Ngày: <b>${form.date}</b><br>
               🕒 Ca: <b>${form.shiftType}</b> (${selectedShiftObj?.hours})<br>
               🏥 Phòng: <b>${isOff ? "Nghỉ ca" : "Phòng " + form.room}</b>`,
        icon: "success",
        timer: 2200,
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
  const selectedShift = SHIFT_OPTIONS.find((s) => s.value === form.shiftType);
  const isOff = form.shiftType === "Nghỉ trực";

  return (
    <Modal show={show} onHide={onHide} centered size="md">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold fs-5">
          <i className="bi bi-calendar2-plus-fill text-primary me-2"></i>
          Phân Ca Trực Bác sĩ Theo Ngày
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="px-4">
        {/* Banner tóm tắt ca đang chọn */}
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
                {translateSpecialty(selectedDoctor.specialization || selectedDoctor.specialty)}
              </div>
            </div>
            {selectedShift && (
              <Badge
                bg={selectedShift.variant}
                text={selectedShift.variant === "warning" || selectedShift.variant === "info" ? "dark" : "white"}
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
            {/* Chọn Ngày trực */}
            <Col xs={12}>
              <Form.Group>
                <Form.Label className="fw-semibold small">
                  <i className="bi bi-calendar-event text-primary me-1"></i>
                  Chọn ngày trực <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  name="date"
                  value={form.date}
                  onChange={handleDateChange}
                  className="rounded-3 fw-medium"
                  required
                >
                  {weekDays.map((w) => (
                    <option key={w.date} value={w.date}>
                      {w.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Chọn Bác sĩ */}
            <Col xs={12}>
              <Form.Group>
                <Form.Label className="fw-semibold small">
                  <i className="bi bi-person-badge text-primary me-1"></i>
                  Bác sĩ trực <span className="text-danger">*</span>
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
                      {d.fullName} — {translateSpecialty(d.specialization || d.specialty)}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Ca trực */}
            <Col xs={12} sm={6}>
              <Form.Group>
                <Form.Label className="fw-semibold small">
                  Ca làm việc <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  name="shiftType"
                  value={form.shiftType}
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
              </Form.Group>
            </Col>

            {/* Phòng khám */}
            <Col xs={12} sm={6}>
              <Form.Group>
                <Form.Label className="fw-semibold small">
                  Phòng khám {!isOff && <span className="text-danger">*</span>}
                </Form.Label>
                <Form.Select
                  name="room"
                  value={form.room}
                  onChange={handleChange}
                  className="rounded-3"
                  disabled={isOff}
                  required={!isOff}
                >
                  {ROOM_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      Phòng {r}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Điều dưỡng hỗ trợ */}
            <Col xs={12}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Điều dưỡng phối hợp</Form.Label>
                <Form.Select
                  name="nurse"
                  value={form.nurse}
                  onChange={handleChange}
                  className="rounded-3"
                  disabled={isOff}
                >
                  {NURSE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Ghi chú */}
            <Col xs={12}>
              <div className="p-2 bg-light rounded-3 small text-muted">
                <i className="bi bi-check-circle-fill text-success me-1"></i>
                Lịch trực sau khi lưu sẽ áp dụng ngay cho ngày được chọn và cập nhật toàn bộ bảng điều khiển.
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
                <><i className="bi bi-check2-circle me-2"></i>Lưu ca trực</>
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default CreateDutyModal;

