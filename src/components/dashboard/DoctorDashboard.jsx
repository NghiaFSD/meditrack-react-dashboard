import React, { useMemo, useState } from "react";
import { Row, Col, Card, Table, Badge, Button } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import StatCard from "./StatCard";
import HealthChart from "./HealthChart";
import QuickViewModal from "./QuickViewModal";
import StatusBadge from "../common/StatusBadge";
import { ROUTES } from "../../config/routes";
import { translateReason } from "../../utils/translations";

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
  const today = new Date().toISOString().slice(0, 10);

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
                    <Badge bg="light" text="dark" className="fw-semibold">
                      <i className="bi bi-clock me-1"></i>
                      Ca trực: {doctor?.shift === "Morning" ? "Ca sáng" : "Ca chiều"}
                    </Badge>
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={12} md={4} className="text-md-end mt-3 mt-md-0">
              <Button
                variant="light"
                className="text-primary fw-bold px-3 py-2 shadow-sm rounded-pill d-inline-flex align-items-center gap-2"
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
            note="Lịch khám đã lên lịch"
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
            title="Yêu cầu chờ tôi duyệt"
            value={myPendingApprovals.length}
            icon={<i className="bi bi-clock-history"></i>}
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
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Bệnh án đã chẩn đoán"
            value={myRecords.length}
            icon={<i className="bi bi-clipboard-pulse"></i>}
            note="Bệnh án đã lập"
            onClick={() =>
              openQuickView(
                "records",
                "Bệnh án do Bác sĩ đã chẩn đoán",
                "Lịch sử các hồ sơ bệnh án và lời dặn điều trị đã ghi nhận",
                myRecords
              )
            }
          />
        </Col>
      </Row>

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

      {/* Biểu đồ xu hướng điều trị của bệnh nhân phụ trách */}
      <HealthChart data={myRecords} />

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
