import React from "react";
import { Modal, Table, Badge, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import StatusBadge from "../common/StatusBadge";
import { ROUTES } from "../../config/routes";
import { translateDiagnosis, translateReason } from "../../utils/translations";
import { getRealtimeShiftStatus } from "../../utils/dutySchedule";

/**
 * Modal dùng chung để Xem nhanh (Quick View Pop-up) khi click vào các ô StatCard trên Dashboard (Thuần Tiếng Việt)
 */
function QuickViewModal({
  isOpen,
  onClose,
  title,
  subtitle,
  type,
  data = [],
  patients = [],
  doctors = [],
  onApproveAppointment,
}) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const getPatientName = (id) => patients.find((p) => Number(p.id) === Number(id))?.fullName || "Chưa xác định";
  const getDoctorName = (id) => doctors.find((d) => Number(d.id) === Number(id))?.fullName || "Chưa xác định";

  const getTargetPageUrl = () => {
    switch (type) {
      case "patients":
        return ROUTES.PATIENTS;
      case "doctors":
        return ROUTES.DOCTORS;
      case "appointments":
        return ROUTES.APPOINTMENTS;
      case "records":
        return ROUTES.RECORDS;
      default:
        return null;
    }
  };

  const targetPage = getTargetPageUrl();

  return (
    <Modal show={isOpen} onHide={onClose} size="xl" centered scrollable backdrop="static">
      <Modal.Header closeButton className="bg-light border-bottom py-3">
        <div>
          <Modal.Title as="h5" className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
            <i
              className={`bi ${
                type === "patients"
                  ? "bi-people-fill text-primary"
                  : type === "doctors"
                  ? "bi-person-badge-fill text-info"
                  : type === "appointments"
                  ? "bi-calendar-check-fill text-success"
                  : type === "schedule"
                  ? "bi-calendar-week-fill text-warning"
                  : type === "dutySchedule"
                  ? "bi-calendar2-week-fill text-primary"
                  : "bi-clipboard2-pulse-fill text-danger"
              }`}
            ></i>
            <span>{title}</span>
            <Badge bg="primary" className="rounded-pill ms-2" style={{ fontSize: "0.75rem" }}>
              {data.length} {type === "schedule" || type === "dutySchedule" ? "ngày" : "kết quả"}
            </Badge>
          </Modal.Title>
          {subtitle && <small className="text-muted">{subtitle}</small>}
        </div>
      </Modal.Header>

      <Modal.Body className="p-0">
        {data.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-inbox fs-1 d-block mb-2 text-secondary"></i>
            <p className="mb-0">Không có dữ liệu trong mục này.</p>
          </div>
        ) : (
          <Table responsive hover className="align-middle mb-0">
            {/* 1. BẢNG BỆNH NHÂN */}
            {type === "patients" && (
              <>
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">Mã BN</th>
                    <th>Họ và tên</th>
                    <th>Giới tính</th>
                    <th>Tuổi</th>
                    <th>Mức nguy cơ</th>
                    <th>Bảo hiểm</th>
                    <th>Số điện thoại</th>
                    <th className="text-center pe-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((p) => (
                    <tr key={p.id}>
                      <td className="ps-3 fw-semibold text-primary">
                        {p.patientCode || `PT-${String(p.id).padStart(3, "0")}`}
                      </td>
                      <td className="fw-medium text-dark">{p.fullName}</td>
                      <td>{p.gender === "Male" ? "Nam" : "Nữ"}</td>
                      <td>{p.age}</td>
                      <td>
                        <StatusBadge status={p.riskLevel || "Low"} />
                      </td>
                      <td>
                        <StatusBadge status={p.insuranceType || "Standard"} />
                      </td>
                      <td>{p.phone}</td>
                      <td className="text-center pe-3">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          className="py-1 px-2 rounded-pill fw-medium"
                          onClick={() => {
                            onClose();
                            navigate(ROUTES.PATIENT_DETAIL(p.id));
                          }}
                        >
                          <i className="bi bi-eye me-1"></i>
                          Xem chi tiết
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* 2. BẢNG BÁC SĨ */}
            {type === "doctors" && (
              <>
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">ID</th>
                    <th>Bác sĩ</th>
                    <th>Chuyên khoa</th>
                    <th>Phòng khám</th>
                    <th>Ca trực</th>
                    <th>Số điện thoại</th>
                    <th className="pe-3">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d) => (
                    <tr key={d.id}>
                      <td className="ps-3 text-muted">#{d.id}</td>
                      <td className="fw-semibold text-primary">{d.fullName}</td>
                      <td>
                        <Badge bg="light" text="dark" className="border">
                          {d.specialization || d.specialty || "Nội tổng quát"}
                        </Badge>
                      </td>
                      <td>{d.room || "A-201"}</td>
                      <td>{d.shift === "Morning" ? "Ca sáng" : "Ca chiều"}</td>
                      <td>{d.phone}</td>
                      <td className="pe-3">{d.email}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* 3. BẢNG LỊCH HẸN KHÁM */}
            {type === "appointments" && (
              <>
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">ID</th>
                    <th>Ngày khám</th>
                    <th>Giờ</th>
                    <th>Bệnh nhân</th>
                    <th>Bác sĩ</th>
                    <th>Lý do khám</th>
                    <th>Trạng thái</th>
                    {onApproveAppointment && <th className="text-center pe-3">Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.map((a) => (
                    <tr key={a.id}>
                      <td className="ps-3 text-muted">#{a.id}</td>
                      <td className="fw-medium">{a.date}</td>
                      <td>{a.time}</td>
                      <td className="fw-semibold text-primary">{getPatientName(a.patientId)}</td>
                      <td>{getDoctorName(a.doctorId)}</td>
                      <td>{translateReason(a.reason)}</td>
                      <td>
                        <StatusBadge status={a.status} />
                      </td>
                      {onApproveAppointment && (
                        <td className="text-center pe-3">
                          {a.status === "Pending" ? (
                            <Button
                              size="sm"
                              variant="success"
                              className="py-1 px-2 rounded-pill fw-medium"
                              onClick={() => onApproveAppointment(a, "Approved")}
                            >
                              <i className="bi bi-check me-1"></i>
                              Duyệt lịch
                            </Button>
                          ) : a.status === "Approved" ? (
                            <Button
                              size="sm"
                              variant="primary"
                              className="py-1 px-2 rounded-pill fw-medium"
                              onClick={() => onApproveAppointment(a, "Completed")}
                            >
                              <i className="bi bi-check2-all me-1"></i>
                              Khám xong
                            </Button>
                          ) : (
                            <span className="text-muted small">✓ Đã duyệt</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* 4. BẢNG HỒ SƠ BỆNH ÁN */}
            {type === "records" && (
              <>
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">ID</th>
                    <th>Ngày khám</th>
                    <th>Bệnh nhân</th>
                    <th>Bác sĩ</th>
                    <th>Đường huyết</th>
                    <th>HbA1c</th>
                    <th>Huyết áp</th>
                    <th>Chẩn đoán</th>
                    <th className="pe-3">Tái khám</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={r.id}>
                      <td className="ps-3 text-muted">#{r.id}</td>
                      <td className="fw-medium">{r.date}</td>
                      <td className="fw-semibold text-primary">{getPatientName(r.patientId)}</td>
                      <td>{getDoctorName(r.doctorId)}</td>
                      <td>
                        <span className="fw-bold text-danger">{r.glucose ? `${r.glucose} mg/dL` : "-"}</span>
                      </td>
                      <td>{r.hba1c ? `${r.hba1c}%` : "-"}</td>
                      <td>{r.bloodPressure || "-"}</td>
                      <td>{translateDiagnosis(r.diagnosis)}</td>
                      <td className="pe-3 small text-muted">{r.followUpDate || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* 5. BẢNG LỊCH TRỰC TOÀN VIỆN (ADMIN — tất cả bác sĩ) */}
            {type === "dutySchedule" && (
              <>
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">Bác sĩ</th>
                    <th>Thứ</th>
                    <th>Ngày</th>
                    <th>Ca trực</th>
                    <th>Khung giờ</th>
                    <th>Phòng khám</th>
                    <th>Lịch hẹn</th>
                    <th className="pe-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, idx) => (
                    <tr key={idx} className={item.isToday ? "table-primary bg-opacity-25" : ""}>
                      <td className="ps-3 fw-semibold text-primary">{item.doctorName || "—"}</td>
                      <td className="fw-bold text-dark">
                        {item.dayName}{" "}
                        {item.isToday && (
                          <Badge bg="danger" className="ms-1 rounded-pill">Hôm nay</Badge>
                        )}
                      </td>
                      <td className="fw-medium">{item.date}</td>
                      <td>
                        <span
                          className={`badge ${
                            item.shiftType === "Ca sáng"
                              ? "bg-warning bg-opacity-25 text-dark border border-warning"
                              : item.shiftType === "Ca chiều"
                              ? "bg-info bg-opacity-25 text-dark border border-info"
                              : item.shiftType === "Ca tối"
                              ? "bg-primary bg-opacity-25 text-primary border border-primary"
                              : "bg-secondary bg-opacity-25 text-secondary"
                          } px-2 py-1 fw-semibold`}
                        >
                          {item.shiftType === "Ca sáng"
                            ? "☀️ Ca sáng"
                            : item.shiftType === "Ca chiều"
                            ? "🌙 Ca chiều"
                            : item.shiftType === "Ca tối"
                            ? "⭐ Ca tối"
                            : "🏖️ Nghỉ trực"}
                        </span>
                      </td>
                      <td className="small fw-medium text-dark">{item.shiftHours}</td>
                      <td className="fw-semibold text-primary">{item.room}</td>
                      <td>
                        {item.appointmentsCount > 0 ? (
                          <Badge bg="primary" className="rounded-pill px-2 py-1">
                            {item.appointmentsCount} bệnh nhân
                          </Badge>
                        ) : (
                          <span className="text-muted small">0 ca hẹn</span>
                        )}
                      </td>
                      <td className="pe-3">
                        {(() => {
                          const s = getRealtimeShiftStatus(item, new Date());
                          const isOff = s.key === "off";
                          return (
                            <Badge
                              bg={s.variant}
                              text={isOff ? "dark" : undefined}
                              className={`px-2 py-1${isOff ? " border" : ""}`}
                            >
                              <i className={`bi ${s.icon} me-1`}></i>
                              {s.label}
                            </Badge>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* 6. BẢNG LỊCH TRỰC TUẦN (DOCTOR DUTY SCHEDULE — 1 bác sĩ) */}
            {type === "schedule" && (
              <>
                <thead className="table-light">
                  <tr>
                    <th className="ps-3" style={{ minWidth: "120px" }}>Thứ / Ngày</th>
                    <th style={{ minWidth: "130px" }}>Ca trực</th>
                    <th style={{ minWidth: "100px" }}>Phòng khám</th>
                    <th style={{ minWidth: "130px" }}>Điều dưỡng</th>
                    <th style={{ minWidth: "280px" }}>Danh sách bệnh nhân trong ca</th>
                    <th className="pe-3" style={{ minWidth: "110px" }}>Trạng thái ca</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, idx) => (
                    <tr key={idx} className={item.isToday ? "table-primary bg-opacity-25 align-top" : "align-top"}>
                      <td className="ps-3">
                        <div className="fw-bold text-dark">
                          {item.dayName}
                          {item.isToday && (
                            <Badge bg="danger" className="ms-1 rounded-pill" style={{ fontSize: "0.65rem" }}>
                              Hôm nay
                            </Badge>
                          )}
                        </div>
                        <small className="text-muted">{item.date}</small>
                      </td>
                      <td>
                        {item.shifts && item.shifts.length > 1 ? (
                          <div className="d-flex flex-column gap-1">
                            {item.shifts.map((s, sIdx) => (
                              <div key={sIdx} className="d-flex align-items-center gap-1">
                                <Badge
                                  bg={
                                    s.shiftType === "Ca sáng"
                                      ? "warning"
                                      : s.shiftType === "Ca chiều"
                                      ? "info"
                                      : "primary"
                                  }
                                  text={
                                    s.shiftType === "Ca sáng" || s.shiftType === "Ca chiều"
                                      ? "dark"
                                      : "white"
                                  }
                                  className="px-2 py-1"
                                >
                                  {s.shiftType}
                                </Badge>
                                <span className="small text-muted" style={{ fontSize: "0.75rem" }}>
                                  ({s.shiftHours})
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div>
                            <span
                              className={`badge ${
                                item.shiftType === "Ca sáng"
                                  ? "bg-warning bg-opacity-25 text-dark border border-warning"
                                  : item.shiftType === "Ca chiều"
                                  ? "bg-info bg-opacity-25 text-dark border border-info"
                                  : item.shiftType?.includes("2 ca")
                                  ? "bg-success bg-opacity-25 text-success border border-success"
                                  : "bg-secondary bg-opacity-25 text-secondary"
                              } px-2 py-1 fw-semibold`}
                            >
                              {item.shiftType === "Ca sáng"
                                ? "☀️ Ca sáng"
                                : item.shiftType === "Ca chiều"
                                ? "🌙 Ca chiều"
                                : item.shiftType?.includes("2 ca")
                                ? "☀️🌙 2 Ca trực"
                                : "🏖️ Nghỉ trực"}
                            </span>
                            <div className="small fw-medium text-muted mt-1">{item.shiftHours}</div>
                          </div>
                        )}
                      </td>
                      <td>
                        {item.shifts && item.shifts.length > 1 ? (
                          <div className="d-flex flex-column gap-1">
                            {item.shifts.map((s, sIdx) => (
                              <div key={sIdx} className="small fw-semibold text-primary">
                                {s.shiftType.replace("Ca ", "")}: {s.room}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="fw-semibold text-primary">{item.room}</span>
                        )}
                      </td>
                      <td>
                        {item.shifts && item.shifts.length > 1 ? (
                          <div className="d-flex flex-column gap-1">
                            {item.shifts.map((s, sIdx) => (
                              <div key={sIdx} className="small text-muted">
                                {s.nurse}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="small text-muted">{item.nurse}</span>
                        )}
                      </td>
                      <td>
                        {item.appointments && item.appointments.length > 0 ? (
                          <div className="d-flex flex-column gap-2 py-1">
                            {item.appointments.map((appt) => (
                              <div
                                key={appt.id}
                                className="d-flex align-items-center justify-content-between p-2 rounded border bg-light bg-opacity-75"
                                style={{ fontSize: "0.82rem" }}
                              >
                                <div>
                                  <div className="fw-semibold text-primary d-flex align-items-center gap-1">
                                    <i className="bi bi-clock text-secondary"></i>
                                    <span>{appt.time}</span>
                                    <span className="text-dark ms-1">• {getPatientName(appt.patientId)}</span>
                                  </div>
                                  <small className="text-muted d-block">{translateReason(appt.reason)}</small>
                                </div>
                                <StatusBadge status={appt.status} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted small">
                            {item.isWorking ? "Chưa có bệnh nhân đặt lịch" : "Nghỉ ca khám"}
                          </span>
                        )}
                      </td>
                      <td className="pe-3">
                        {(() => {
                          const s = getRealtimeShiftStatus(item, new Date());
                          const isOff = s.key === "off";
                          return (
                            <Badge
                              bg={s.variant}
                              text={isOff ? "dark" : undefined}
                              className={`px-2 py-1${isOff ? " border" : ""}`}
                            >
                              <i className={`bi ${s.icon} me-1`}></i>
                              {s.label}
                            </Badge>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </Table>
        )}
      </Modal.Body>

      <Modal.Footer className="bg-light border-top py-2 d-flex justify-content-between">
        {targetPage ? (
          <Button
            variant="link"
            className="text-decoration-none text-primary fw-semibold p-0"
            onClick={() => {
              onClose();
              navigate(targetPage);
            }}
          >
            Mở trang quản lý đầy đủ →
          </Button>
        ) : (
          <div></div>
        )}

        <Button variant="secondary" size="sm" className="px-3 rounded-pill" onClick={onClose}>
          Đóng
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default QuickViewModal;
