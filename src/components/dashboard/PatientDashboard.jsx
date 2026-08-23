import React, { useMemo, useState } from "react";
import { Row, Col, Card, Table, Badge, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import StatusBadge from "../common/StatusBadge";
import HealthChart from "./HealthChart";
import QuickViewModal from "./QuickViewModal";
import { ROUTES } from "../../config/routes";
import { getGlucoseStatus, getHbA1cStatus } from "../../utils/healthStatus";
import { translateDiagnosis, translateReason } from "../../utils/translations";
import { getLocalDateStr } from "../../utils/dutySchedule";

/**
 * Giao diện Cổng thông tin Sức khỏe Cá nhân cho Bệnh nhân (Patient Health Portal - Thuần Tiếng Việt)
 */
function PatientDashboard({
  patient,
  doctors = [],
  appointments = [],
  records = [],
}) {
  const navigate = useNavigate();
  const today = getLocalDateStr();

  // State quản lý QuickViewModal
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    subtitle: "",
    type: "records",
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

  const patientId = Number(patient?.id || 1);

  // Lọc dữ liệu của bệnh nhân này
  const myAppointments = useMemo(
    () => appointments.filter((a) => Number(a.patientId) === patientId),
    [appointments, patientId]
  );
  const myRecords = useMemo(
    () => records.filter((r) => Number(r.patientId) === patientId),
    [records, patientId]
  );

  const latestRecord = useMemo(() => myRecords[myRecords.length - 1] || null, [myRecords]);

  // Lịch khám sắp tới (từ hôm nay trở đi)
  const nextAppointment = useMemo(() => {
    return (
      [...myAppointments]
        .filter((a) => a.date >= today && a.status !== "Cancelled")
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0] || null
    );
  }, [myAppointments, today]);

  const getDoctor = (id) => doctors.find((d) => Number(d.id) === Number(id)) || null;

  return (
    <div>
      {/* Banner Hồ sơ Sức khỏe Bệnh nhân */}
      <Card className="border-0 shadow-sm rounded-4 mb-4 bg-success text-white overflow-hidden">
        <Card.Body className="p-4 position-relative">
          <Row className="align-items-center">
            <Col xs={12} md={8}>
              <div className="d-flex align-items-center gap-3 mb-2">
                <div
                  className="bg-white text-success rounded-circle d-flex align-items-center justify-content-center fw-bold fs-3 shadow"
                  style={{ width: "60px", height: "60px" }}
                >
                  <i className="bi bi-heart-pulse-fill"></i>
                </div>
                <div>
                  <h3 className="fw-bold mb-0 text-white">{patient?.fullName || "Lê Trọng Nghĩa"}</h3>
                  <div className="d-flex flex-wrap gap-2 mt-1 align-items-center">
                    <Badge bg="light" text="dark" className="fw-semibold">
                      <i className="bi bi-card-text me-1"></i>
                      {patient?.patientCode || `PT-001`}
                    </Badge>
                    <Badge bg="light" text="dark" className="fw-semibold">
                      <i className="bi bi-shield-check me-1"></i>
                      Thẻ bảo hiểm: {patient?.insuranceType || "Cao cấp"}
                    </Badge>
                    <Badge bg="light" text="dark" className="fw-semibold">
                      <i className="bi bi-activity me-1"></i>
                      Mức nguy cơ: <StatusBadge status={patient?.riskLevel || "Low"} className="ms-1" />
                    </Badge>
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={12} md={4} className="text-md-end mt-3 mt-md-0">
              <Button
                variant="light"
                className="text-success fw-bold px-3 py-2 shadow-sm rounded-pill d-inline-flex align-items-center gap-2"
                onClick={() => navigate(ROUTES.APPOINTMENTS)}
              >
                <i className="bi bi-calendar-plus-fill"></i>
                <span>Đặt lịch khám mới</span>
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* 4 Thẻ chỉ số đo đạc sinh học mới nhất */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold text-dark mb-0">
          <i className="bi bi-speedometer2 text-success me-2"></i>
          Chỉ số Đo Đạc Sinh Học Mới Nhất
        </h5>
        <small className="text-muted fst-italic">
          💡 Nhấn vào ô để xem toàn bộ lịch sử đo
        </small>
      </div>

      <Row className="g-3 mb-4">
        {/* Đường huyết */}
        <Col xs={12} sm={6} lg={3}>
          <Card
            className="border-0 shadow-sm rounded-3 h-100 p-3 bg-white stat-card-clickable cursor-pointer"
            onClick={() =>
              openQuickView(
                "records",
                "Lịch sử Đo Đường huyết (Glucose)",
                "Theo dõi diễn tiến chỉ số đường huyết qua các lần khám",
                myRecords
              )
            }
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <small className="text-muted text-uppercase fw-semibold">Đường huyết</small>
              {latestRecord && (
                <StatusBadge
                  status={getGlucoseStatus(latestRecord.glucose).label}
                  type={getGlucoseStatus(latestRecord.glucose).type}
                />
              )}
            </div>
            <h3 className="fw-bold text-primary mb-1">
              {latestRecord ? `${latestRecord.glucose} mg/dL` : "-"}
            </h3>
            <small className="text-muted">
              Đường huyết lúc đói
            </small>
          </Card>
        </Col>

        {/* HbA1c */}
        <Col xs={12} sm={6} lg={3}>
          <Card
            className="border-0 shadow-sm rounded-3 h-100 p-3 bg-white stat-card-clickable cursor-pointer"
            onClick={() =>
              openQuickView(
                "records",
                "Lịch sử Chỉ số HbA1c",
                "Theo dõi mức độ kiểm soát đường huyết trung bình 3 tháng",
                myRecords
              )
            }
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <small className="text-muted text-uppercase fw-semibold">HbA1c</small>
              {latestRecord && (
                <StatusBadge
                  status={getHbA1cStatus(latestRecord.hba1c).label}
                  type={getHbA1cStatus(latestRecord.hba1c).type}
                />
              )}
            </div>
            <h3 className="fw-bold text-success mb-1">
              {latestRecord ? `${latestRecord.hba1c}%` : "-"}
            </h3>
            <small className="text-muted">
              Chỉ số đường huyết 3 tháng
            </small>
          </Card>
        </Col>

        {/* Huyết áp */}
        <Col xs={12} sm={6} lg={3}>
          <Card
            className="border-0 shadow-sm rounded-3 h-100 p-3 bg-white stat-card-clickable cursor-pointer"
            onClick={() =>
              openQuickView(
                "records",
                "Lịch sử Đo Huyết áp",
                "Chỉ số huyết áp tâm thu và tâm trương qua các lần thăm khám",
                myRecords
              )
            }
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <small className="text-muted text-uppercase fw-semibold">Huyết áp</small>
              <Badge bg="info" className="text-dark">mmHg</Badge>
            </div>
            <h3 className="fw-bold text-dark mb-1">
              {latestRecord ? latestRecord.bloodPressure : "-"}
            </h3>
            <small className="text-muted">
              Tâm thu / Tâm trương
            </small>
          </Card>
        </Col>

        {/* BMI */}
        <Col xs={12} sm={6} lg={3}>
          <Card
            className="border-0 shadow-sm rounded-3 h-100 p-3 bg-white stat-card-clickable cursor-pointer"
            onClick={() =>
              openQuickView(
                "records",
                "Lịch sử Chỉ số Thể trạng BMI",
                "Theo dõi cân nặng và thể trạng qua các giai đoạn điều trị",
                myRecords
              )
            }
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <small className="text-muted text-uppercase fw-semibold">Chỉ số BMI</small>
              <Badge bg="success">Chuẩn</Badge>
            </div>
            <h3 className="fw-bold text-dark mb-1">
              {latestRecord ? latestRecord.bmi : "-"}
            </h3>
            <small className="text-muted">
              Thể trạng cân đối
            </small>
          </Card>
        </Col>
      </Row>

      {/* Thẻ nhắc lịch khám & Lời dặn Bác sĩ */}
      <Row className="g-4 mb-4">
        {/* Lịch khám sắp tới */}
        <Col xs={12} lg={5}>
          <Card className="border-0 shadow-sm rounded-3 h-100 border-start border-success border-4">
            <Card.Header className="bg-white border-0 pt-3 pb-0">
              <Card.Title as="h5" className="fw-bold mb-1 text-dark">
                <i className="bi bi-bell-fill text-warning me-2"></i>
                Lịch khám sắp tới
              </Card.Title>
            </Card.Header>
            <Card.Body className="d-flex flex-column justify-content-between">
              {nextAppointment ? (
                <div>
                  <div className="p-3 bg-light rounded-3 mb-3 border">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <i className="bi bi-calendar-event text-primary fs-5"></i>
                      <strong className="fs-5 text-primary">{nextAppointment.date}</strong>
                      <Badge bg="primary" className="ms-auto">{nextAppointment.time}</Badge>
                    </div>
                    <div className="small text-muted mb-1">
                      <i className="bi bi-person-fill me-1"></i>
                      Bác sĩ phụ trách: <strong>{getDoctor(nextAppointment.doctorId)?.fullName || "Dr. Nguyen Minh"}</strong>
                    </div>
                    <div className="small text-muted mb-2">
                      <i className="bi bi-chat-left-text me-1"></i>
                      Lý do khám: {translateReason(nextAppointment.reason)}
                    </div>
                    <div>
                      <StatusBadge status={nextAppointment.status} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted">
                  <i className="bi bi-calendar-check fs-2 d-block mb-2 text-success"></i>
                  <p className="mb-0">Bạn chưa có lịch hẹn khám sắp tới.</p>
                </div>
              )}

              <Button
                variant="outline-success"
                className="w-100 py-2 fw-semibold rounded-pill d-flex align-items-center justify-content-center gap-2"
                onClick={() => navigate(ROUTES.APPOINTMENTS)}
              >
                <i className="bi bi-plus-circle"></i>
                <span>Đặt lịch khám mới</span>
              </Button>
            </Card.Body>
          </Card>
        </Col>

        {/* Lời dặn & Chẩn đoán của Bác sĩ */}
        <Col xs={12} lg={7}>
          <Card className="border-0 shadow-sm rounded-3 h-100">
            <Card.Header className="bg-white border-0 pt-3 pb-2 d-flex justify-content-between align-items-center">
              <div>
                <Card.Title as="h5" className="fw-bold mb-1 text-dark">
                  <i className="bi bi-chat-quote-fill text-primary me-2"></i>
                  Chẩn đoán & Lời dặn của Bác sĩ
                </Card.Title>
                <Card.Subtitle className="text-muted small">
                  Lịch sử chẩn đoán qua các đợt thăm khám
                </Card.Subtitle>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">Ngày khám</th>
                    <th>Chẩn đoán</th>
                    <th>Lời dặn & Hướng dẫn</th>
                    <th className="pe-3">Tái khám</th>
                  </tr>
                </thead>
                <tbody>
                  {[...myRecords].reverse().slice(0, 4).map((rec) => (
                    <tr key={rec.id}>
                      <td className="ps-3 fw-medium">{rec.date}</td>
                      <td className="fw-semibold text-primary">{translateDiagnosis(rec.diagnosis)}</td>
                      <td className="small text-muted">{rec.note || "-"}</td>
                      <td className="pe-3 small fw-medium">{rec.followUpDate || "-"}</td>
                    </tr>
                  ))}
                  {myRecords.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-muted">
                        Chưa có dữ liệu hồ sơ bệnh án nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Biểu đồ theo dõi tiến triển điều trị đường huyết qua các tháng */}
      <HealthChart data={myRecords} />

      {/* Quick View Modal */}
      <QuickViewModal
        isOpen={modalConfig.isOpen}
        onClose={closeQuickView}
        title={modalConfig.title}
        subtitle={modalConfig.subtitle}
        type={modalConfig.type}
        data={modalConfig.data}
        patients={[{ id: patientId, fullName: patient?.fullName }]}
        doctors={doctors}
      />
    </div>
  );
}

export default PatientDashboard;
