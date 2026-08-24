import React, { useMemo, useState } from "react";
import { Row, Col, Card, Table, Badge, Button } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import StatCard from "./StatCard";
import HealthChart from "./HealthChart";
import QuickViewModal from "./QuickViewModal";
import StatusBadge from "../common/StatusBadge";
import { ROUTES } from "../../config/routes";
import { translateReason } from "../../utils/translations";
import { getDoctorWeeklySchedule, getLocalDateStr } from "../../utils/dutySchedule";

/**
 * Sub-component: Chọn bệnh nhân để xem biểu đồ đường huyết
 * Dùng trong DoctorDashboard — cho phép bác sĩ lọc glucose chart theo từng bệnh nhân
 */
function SelectedPatientGlucoseChart({ myPatients, myRecords, defaultPatientId }) {
  const [selectedId, setSelectedId] = React.useState(String(defaultPatientId || ""));

  const selectedPatient = myPatients.find((p) => String(p.id) === selectedId);
  const filteredRecords = myRecords
    .filter((r) => String(r.patientId) === selectedId)
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  return (
    <div className="mb-4">
      <div className="d-flex align-items-center gap-3 mb-2 flex-wrap">
        <h6 className="fw-bold text-dark mb-0">
          <i className="bi bi-graph-up-arrow text-primary me-2"></i>
          Biểu đồ Đường huyết
        </h6>
        <select
          className="form-select form-select-sm w-auto"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {myPatients.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.fullName} ({p.patientCode || `#${p.id}`})
            </option>
          ))}
        </select>
      </div>
      <HealthChart
        data={filteredRecords}
        patientName={selectedPatient?.fullName || null}
      />
    </div>
  );
}

/**
 * Giao diện Bàn làm việc Bác sĩ Lâm sàng (Doctor Clinical Workstation - Thuần Tiếng Việt)
 */
function DoctorDashboard({
  doctor,
  patients = [],
  appointments = [],
  records = [],
  onUpdateAppointmentStatus,
}) {
  const navigate = useNavigate();
  const today = getLocalDateStr();

  // State quản lý QuickViewModal
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    subtitle: "",
    type: "patients",
    data: [],
  });

  const openQuickView = (type, title, subtitle, data) => {
    setModalConfig({
      isOpen: true,
      title,
      subtitle,
      type,
      data,
    });
  };

  const closeQuickView = () => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  };

  const docId = Number(doctor?.id || 1);

  // Dữ liệu thuộc về Bác sĩ này
  const myAppointments = useMemo(
    () => appointments.filter((a) => Number(a.doctorId) === docId),
    [appointments, docId]
  );
  const myRecords = useMemo(
    () => records.filter((r) => Number(r.doctorId) === docId),
    [records, docId]
  );

  const myAssignedPatientIds = useMemo(() => {
    return new Set([
      ...myAppointments.map((a) => Number(a.patientId)),
      ...myRecords.map((r) => Number(r.patientId)),
    ]);
  }, [myAppointments, myRecords]);

  const myPatients = useMemo(
    () => patients.filter((p) => myAssignedPatientIds.has(Number(p.id))),
    [patients, myAssignedPatientIds]
  );

  const myTodayAppointments = useMemo(
    () => myAppointments.filter((a) => a.date === today),
    [myAppointments, today]
  );

  const myPendingApprovals = useMemo(
    () => myAppointments.filter((a) => a.status === "Pending"),
    [myAppointments]
  );

  // Lịch trực 7 ngày trong tuần
  const weeklySchedule = useMemo(
    () => getDoctorWeeklySchedule(doctor, appointments),
    [doctor, appointments]
  );

  const todayScheduleItem = useMemo(
    () => weeklySchedule.find((item) => item.isToday) || weeklySchedule[0],
    [weeklySchedule]
  );

  // Hàng đợi cần xử lý hôm nay: Lịch hẹn hôm nay HOẶC lịch hẹn đang Pending
  const activeQueue = useMemo(() => {
    return myAppointments
      .filter((a) => a.status === "Pending" || a.date === today)
      .sort((a, b) => (a.status === "Pending" ? -1 : 1));
  }, [myAppointments, today]);

  // Danh sách bệnh nhân có rủi ro cao (Glucose > 140 mg/dL hoặc Risk High)
  const highRiskPatients = useMemo(() => {
    return myPatients
      .filter((p) => {
        const pRecords = myRecords.filter((r) => Number(r.patientId) === Number(p.id));
        const latestRec = pRecords[pRecords.length - 1];
        return p.riskLevel === "High" || (latestRec && Number(latestRec.glucose) >= 140);
      })
      .map((p) => {
        const pRecords = myRecords.filter((r) => Number(r.patientId) === Number(p.id));
        const latestRec = pRecords[pRecords.length - 1];
        return {
          ...p,
          latestGlucose: latestRec?.glucose || "-",
          latestHbA1c: latestRec?.hba1c || "-",
          latestBP: latestRec?.bloodPressure || "-",
          latestDiagnosis: latestRec?.diagnosis || "-",
        };
      });
  }, [myPatients, myRecords]);

  const handleRequestShiftChange = () => {
    Swal.fire({
      title: "Đăng ký đổi ca trực",
      html: `
        <div class="text-start">
          <p class="mb-2">Ca hiện tại: <strong>${todayScheduleItem?.shiftType} (${todayScheduleItem?.shiftHours})</strong></p>
          <div class="mb-3">
            <label class="form-label fw-bold small">Chọn ngày muốn đổi:</label>
            <input type="date" id="swapDate" class="form-control" value="${today}" />
          </div>
          <div class="mb-3">
            <label class="form-label fw-bold small">Lý do xin đổi ca:</label>
            <textarea id="swapReason" class="form-control" rows="2" placeholder="Ví dụ: Có lịch hội chẩn đột xuất..."></textarea>
          </div>
        </div>
      `,
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Gửi yêu cầu",
      cancelButtonText: "Hủy",
      preConfirm: () => {
        const reason = document.getElementById("swapReason")?.value;
        if (!reason) {
          Swal.showValidationMessage("Vui lòng nhập lý do đổi ca");
        }
        return { reason };
      },
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire(
          "Đã gửi yêu cầu",
          "Yêu cầu đổi ca trực đã được gửi tới Quản trị viên phòng khám xét duyệt.",
          "success"
        );
      }
    });
  };

  const getPatientName = (id) => patients.find((p) => Number(p.id) === Number(id))?.fullName || "Chưa xác định";

  return (
    <div>
      {/* Banner Bàn làm việc Bác sĩ Lâm sàng */}
      <Card className="border-0 shadow-sm rounded-4 mb-4 bg-primary text-white overflow-hidden">
        <Card.Body className="p-4 position-relative">
          <Row className="align-items-center">
            <Col xs={12} md={8}>
              <div className="d-flex align-items-center gap-3 mb-2">
                <div
                  className="bg-white text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold fs-3 shadow"
                  style={{ width: "60px", height: "60px" }}
                >
                  <i className="bi bi-person-badge-fill"></i>
                </div>
                <div>
                  <h3 className="fw-bold mb-0 text-white">{doctor?.fullName || "Dr. Nguyen Minh"}</h3>
                  <div className="d-flex flex-wrap gap-2 mt-1">
                    <Badge bg="light" text="dark" className="fw-semibold">
                      <i className="bi bi-hospital me-1"></i>
                      Chuyên khoa: {doctor?.specialization || "Nội tiết"}
                    </Badge>
                    <Badge bg="light" text="dark" className="fw-semibold">
                      <i className="bi bi-door-open me-1"></i>
                      Phòng khám: {doctor?.room || "A-201"}
                    </Badge>
                    <Badge bg="warning" text="dark" className="fw-bold">
                      <i className="bi bi-clock-history me-1"></i>
                      Hôm nay: {todayScheduleItem?.shiftType} ({todayScheduleItem?.shiftHours})
                    </Badge>
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={12} md={4} className="text-md-end mt-3 mt-md-0 d-flex flex-wrap gap-2 justify-content-md-end">
              <Button
                variant="outline-light"
                className="fw-semibold px-3 py-2 rounded-pill d-inline-flex align-items-center gap-1 shadow-sm"
                onClick={() =>
                  openQuickView(
                    "schedule",
                    "Lịch Trực Lâm Sàng Tuần Này",
                    `Phân bổ ca trực và lịch làm việc của ${doctor?.fullName || "Bác sĩ"}`,
                    weeklySchedule
                  )
                }
              >
                <i className="bi bi-calendar-week-fill"></i>
                <span>Xem lịch trực tuần</span>
              </Button>
              <Button
                variant="light"
                className="text-primary fw-bold px-3 py-2 shadow-sm rounded-pill d-inline-flex align-items-center gap-1"
                onClick={() => navigate(ROUTES.RECORDS)}
              >
                <i className="bi bi-file-earmark-plus-fill"></i>
                <span>+ Tạo Bệnh án mới</span>
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* 4 Thẻ KPI Bác sĩ phụ trách */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Bệnh nhân phụ trách"
            value={myPatients.length}
            icon={<i className="bi bi-people-fill"></i>}
            note="Đang theo dõi điều trị"
            onClick={() =>
              openQuickView(
                "patients",
                "Bệnh nhân do Bác sĩ phụ trách",
                `Danh sách các bệnh nhân đang điều trị cùng ${doctor?.fullName || "Bác sĩ"}`,
                myPatients
              )
            }
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Lịch khám hôm nay"
            value={myTodayAppointments.length}
            icon={<i className="bi bi-calendar-event-fill"></i>}
            note={`Ca khám: ${todayScheduleItem?.shiftHours || "Ca sáng"}`}
            onClick={() =>
              openQuickView(
                "appointments",
                "Lịch khám của Bác sĩ Hôm nay",
                `Các ca khám được xếp lịch trong ngày ${today}`,
                myTodayAppointments
              )
            }
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Ca trực tuần này"
            value="5 ca trực"
            icon={<i className="bi bi-calendar-week-fill text-warning"></i>}
            note="Phòng khám A-201"
            onClick={() =>
              openQuickView(
                "schedule",
                "Lịch Trực Lâm Sàng Tuần Này",
                `Chi tiết 7 ngày phân bổ ca trực của ${doctor?.fullName || "Bác sĩ"}`,
                weeklySchedule
              )
            }
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Yêu cầu chờ duyệt"
            value={myPendingApprovals.length}
            icon={<i className="bi bi-clock-history text-danger"></i>}
            note="Cần duyệt gấp"
            onClick={() =>
              openQuickView(
                "appointments",
                "Yêu cầu Lịch hẹn Chờ duyệt",
                "Các lịch hẹn bệnh nhân vừa đăng ký cần bác sĩ xác nhận duyệt",
                myPendingApprovals
              )
            }
          />
        </Col>
      </Row>

      {/* SECTION MỚI: LỊCH TRỰC LÂM SÀNG & PHÂN CÔNG CA KHÁM TUẦN NÀY */}
      <Card className="border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
        <Card.Header className="bg-white border-0 pt-3 pb-2 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <Card.Title as="h5" className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
              <i className="bi bi-calendar-range-fill text-primary"></i>
              <span>Lịch Trực Lâm Sàng & Phân Công Ca Khám Tuần Này</span>
            </Card.Title>
            <Card.Subtitle className="text-muted small">
              Theo dõi ca trực hàng ngày, phòng khám phân bổ và điều dưỡng phối hợp
            </Card.Subtitle>
          </div>
          <div className="d-flex gap-2">
            <Button
              size="sm"
              variant="outline-secondary"
              className="rounded-pill d-flex align-items-center gap-1"
              onClick={handleRequestShiftChange}
            >
              <i className="bi bi-arrow-left-right"></i>
              <span>Đổi ca trực</span>
            </Button>
            <Button
              size="sm"
              variant="primary"
              className="rounded-pill d-flex align-items-center gap-1 shadow-sm"
              onClick={() =>
                openQuickView(
                  "schedule",
                  "Lịch Trực Lâm Sàng Tuần Này",
                  `Chi tiết 7 ngày phân bổ ca trực của ${doctor?.fullName || "Bác sĩ"}`,
                  weeklySchedule
                )
              }
            >
              <i className="bi bi-arrows-fullscreen"></i>
              <span>Xem chi tiết lịch</span>
            </Button>
          </div>
        </Card.Header>
        <Card.Body className="pt-1 pb-3">
          <Row className="g-2">
            {weeklySchedule.map((day, idx) => (
              <Col key={idx} xs={12} sm={6} md={4} lg className="d-flex">
                <Card
                  className={`w-100 border rounded-3 p-3 transition-all ${
                    day.isToday
                      ? "border-primary bg-primary bg-opacity-10 shadow-sm"
                      : day.isPassed
                      ? "bg-light bg-opacity-50 text-muted border-secondary-subtle opacity-75"
                      : day.status === "off"
                      ? "bg-light border-light text-muted"
                      : "bg-white"
                  }`}
                  style={{ minHeight: "160px" }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className={`fw-bold small ${day.isToday ? "text-primary" : day.isPassed ? "text-muted" : "text-dark"}`}>
                      {day.dayName}
                    </span>
                    <small className="text-muted">{day.displayDate}</small>
                  </div>

                  {day.isToday ? (
                    <Badge bg="danger" className="mb-2 align-self-start rounded-pill" style={{ fontSize: "0.65rem" }}>
                      <i className="bi bi-broadcast me-1"></i>Hôm nay
                    </Badge>
                  ) : day.isPassed ? (
                    <Badge bg="secondary" className="mb-2 align-self-start rounded-pill" style={{ fontSize: "0.65rem" }}>
                      <i className="bi bi-clock-history me-1"></i>Đã qua
                    </Badge>
                  ) : day.isWorking ? (
                    <Badge bg="primary" className="mb-2 align-self-start rounded-pill bg-opacity-75" style={{ fontSize: "0.65rem" }}>
                      <i className="bi bi-calendar-check me-1"></i>Sắp tới
                    </Badge>
                  ) : (
                    <Badge bg="light" text="dark" className="border mb-2 align-self-start rounded-pill" style={{ fontSize: "0.65rem" }}>
                      Nghỉ ca
                    </Badge>
                  )}

                  <div className="my-auto">
                    <div className="fw-semibold small text-dark mb-1 d-flex align-items-center gap-1">
                      {day.shiftType === "Ca sáng" ? (
                        <i className="bi bi-sun-fill text-warning"></i>
                      ) : day.shiftType === "Ca chiều" ? (
                        <i className="bi bi-moon-stars-fill text-info"></i>
                      ) : (
                        <i className="bi bi-cup-hot text-secondary"></i>
                      )}
                      <span>{day.shiftType}</span>
                    </div>
                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                      {day.shiftHours}
                    </div>
                  </div>

                  <div className="pt-2 border-top mt-2 small d-flex justify-content-between align-items-center">
                    <span className="text-muted" style={{ fontSize: "0.7rem" }}>
                      {day.room !== "-" ? `Phòng: ${day.room}` : "Nghỉ"}
                    </span>
                    {day.appointmentsCount > 0 && (
                      <Badge bg="primary" pill style={{ fontSize: "0.65rem" }}>
                        {day.appointmentsCount} ca
                      </Badge>
                    )}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card.Body>
      </Card>

      {/* Hàng đợi Khám & Duyệt lịch hôm nay (Active Clinical Queue) */}
      <Row className="g-4 mb-4">
        <Col xs={12} lg={7}>
          <Card className="border-0 shadow-sm rounded-3 h-100">
            <Card.Header className="bg-white border-0 pt-3 pb-2 d-flex justify-content-between align-items-center">
              <div>
                <Card.Title as="h5" className="fw-bold mb-1 text-dark">
                  <i className="bi bi-list-check text-primary me-2"></i>
                  Hàng đợi Khám & Duyệt lịch hôm nay
                </Card.Title>
                <Card.Subtitle className="text-muted small">
                  Các ca khám cần tiếp nhận và xử lý trong ngày
                </Card.Subtitle>
              </div>
              <Badge bg="primary" className="px-2 py-1 rounded-pill">
                {activeQueue.length} Ca khám
              </Badge>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">Giờ khám</th>
                    <th>Bệnh nhân</th>
                    <th>Lý do khám</th>
                    <th>Trạng thái</th>
                    <th className="text-center pe-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {activeQueue.map((item) => (
                    <tr key={item.id}>
                      <td className="ps-3 fw-medium">
                        {item.time} <small className="text-muted d-block">{item.date}</small>
                      </td>
                      <td className="fw-semibold text-primary">
                        <Link to={ROUTES.PATIENT_DETAIL(item.patientId)} className="text-decoration-none">
                          {getPatientName(item.patientId)}
                        </Link>
                      </td>
                      <td>{translateReason(item.reason)}</td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="text-center pe-3">
                        <div className="d-flex justify-content-center gap-1">
                          {item.status === "Pending" && (
                            <Button
                              size="sm"
                              variant="success"
                              className="py-1 px-2 fw-medium rounded-pill"
                              onClick={() => onUpdateAppointmentStatus(item, "Approved")}
                              title="Duyệt lịch khám"
                            >
                              <i className="bi bi-check me-1"></i>
                              Duyệt lịch
                            </Button>
                          )}
                          {item.status === "Approved" && (
                            <Button
                              size="sm"
                              variant="primary"
                              className="py-1 px-2 fw-medium rounded-pill"
                              onClick={() => onUpdateAppointmentStatus(item, "Completed")}
                              title="Hoàn thành khám bệnh"
                            >
                              <i className="bi bi-check2-all me-1"></i>
                              Khám xong
                            </Button>
                          )}
                          {item.status === "Completed" && (
                            <span className="text-muted small">✓ Đã khám</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeQueue.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted">
                        <i className="bi bi-check-circle fs-3 text-success d-block mb-1"></i>
                        Không có cuộc hẹn nào trong hàng đợi hôm nay.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        {/* Bảng Cảnh báo Bệnh nhân Nguy cơ cao (High-Risk Alert) */}
        <Col xs={12} lg={5}>
          <Card className="border-0 shadow-sm rounded-3 h-100 border-top border-danger border-3">
            <Card.Header className="bg-white border-0 pt-3 pb-2 d-flex justify-content-between align-items-center">
              <div>
                <Card.Title as="h5" className="fw-bold mb-1 text-danger">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  Cảnh báo Bệnh nhân Nguy cơ cao
                </Card.Title>
                <Card.Subtitle className="text-muted small">
                  Chỉ số Glucose &gt; 140 mg/dL hoặc Huyết áp bất thường cần theo dõi sát
                </Card.Subtitle>
              </div>
              <Badge bg="danger" className="px-2 py-1 rounded-pill">
                {highRiskPatients.length} Cảnh báo
              </Badge>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">Họ và tên</th>
                    <th>Đường huyết</th>
                    <th>Huyết áp</th>
                    <th className="pe-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {highRiskPatients.map((p) => (
                    <tr key={p.id}>
                      <td className="ps-3">
                        <div className="fw-semibold text-dark">{p.fullName}</div>
                        <small className="text-muted">{p.patientCode || `#${p.id}`}</small>
                      </td>
                      <td>
                        <span className="badge bg-danger bg-opacity-10 text-danger fw-bold px-2 py-1">
                          {p.latestGlucose} mg/dL
                        </span>
                      </td>
                      <td className="small text-muted">{p.latestBP}</td>
                      <td className="pe-3">
                        <Link to={ROUTES.PATIENT_DETAIL(p.id)}>
                          <Button size="sm" variant="outline-danger" className="rounded-pill py-0 px-2">
                            <i className="bi bi-eye me-1"></i>
                            Xem
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {highRiskPatients.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-muted">
                        <i className="bi bi-shield-check fs-3 text-success d-block mb-1"></i>
                        Hiện không có bệnh nhân nào có cảnh báo rủi ro cao.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Biểu đồ xu hướng đường huyết — chọn bệnh nhân cụ thể */}
      {myPatients.length > 0 && (() => {
        // Chọn mặc định bệnh nhân nguy cơ cao đầu tiên, hoặc bệnh nhân đầu tiên
        const defaultPatient = highRiskPatients[0] || myPatients[0];
        return (
          <SelectedPatientGlucoseChart
            myPatients={myPatients}
            myRecords={myRecords}
            defaultPatientId={defaultPatient?.id}
          />
        );
      })()}

      {/* Quick View Modal */}
      <QuickViewModal
        isOpen={modalConfig.isOpen}
        onClose={closeQuickView}
        title={modalConfig.title}
        subtitle={modalConfig.subtitle}
        type={modalConfig.type}
        data={modalConfig.data}
        patients={patients}
        doctors={[{ id: docId, fullName: doctor?.fullName }]}
        onApproveAppointment={onUpdateAppointmentStatus}
      />
    </div>
  );
}

export default DoctorDashboard;
