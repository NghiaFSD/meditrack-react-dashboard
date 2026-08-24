import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Container, Row, Col, Card, Table, ListGroup } from "react-bootstrap";
import Button from "../components/common/Button";
import Loading from "../components/common/Loading";
import EmptyState from "../components/common/EmptyState";
import StatusBadge from "../components/common/StatusBadge";
import HealthChart from "../components/dashboard/HealthChart";
import { patientApi } from "../api/patientApi";
import { appointmentApi } from "../api/appointmentApi";
import { recordApi } from "../api/recordApi";
import { doctorApi } from "../api/doctorApi";
import { getGlucoseStatus, getHbA1cStatus } from "../utils/healthStatus";
import { ROLES, getCurrentUser } from "../utils/auth";
import { ROUTES } from "../config/routes";
import { translateDiagnosis, translateReason } from "../utils/translations";

/**
 * Trang chi tiết bệnh nhân (Route: /patients/:id) sử dụng React-Bootstrap (Thuần Tiếng Việt)
 */
function PatientDetail() {
  const { id } = useParams();
  const currentUser = getCurrentUser();
  const canManage = currentUser?.role === ROLES.ADMIN; // Chỉ Admin mới chỉnh sửa bệnh nhân
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetail() {
      try {
        setLoading(true);
        const [patientData, appointmentData, recordData, doctorData] = await Promise.all([
          patientApi.getById(id),
          appointmentApi.getAll(),
          recordApi.getAll(),
          doctorApi.getAll(),
        ]);

        setPatient(patientData);
        setAppointments(appointmentData.filter((item) => Number(item.patientId) === Number(id)));
        setRecords(recordData.filter((item) => Number(item.patientId) === Number(id)));
        setDoctors(doctorData);
      } catch (err) {
        setPatient(null);
        setAppointments([]);
        setRecords([]);
        setDoctors([]);
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
  }, [id]);

  const latestRecord = useMemo(() => records[records.length - 1], [records]);

  const getDoctorName = (doctorId) => {
    return (
      doctors.find((doctor) => Number(doctor.id) === Number(doctorId))?.fullName || "Chưa xác định"
    );
  };

  if (loading) return <Loading text="Đang tải dữ liệu..." />;
  if (!patient)
    return (
      <EmptyState
        title="Không tìm thấy bệnh nhân"
        message="Bệnh nhân được chọn không tồn tại."
        icon="bi-person-x"
      />
    );

  return (
    <Container fluid className="px-0">
      {/* Tiêu đề trang & Hành động */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">{patient.fullName}</h2>
          <p className="text-muted mb-0">Thông tin chi tiết hồ sơ bệnh án và lịch sử khám bệnh.</p>
        </div>
        <div className="d-flex gap-2">
          {canManage && (
            <Link to={ROUTES.PATIENT_EDIT(patient.id)}>
              <Button variant="primary" className="d-flex align-items-center gap-1 shadow-sm">
                <i className="bi bi-pencil-square"></i>
                <span>Chỉnh sửa</span>
              </Button>
            </Link>
          )}
          <Link to={ROUTES.PATIENTS}>
            <Button variant="outline-secondary" className="d-flex align-items-center gap-1">
              <i className="bi bi-arrow-left"></i>
              <span>← Quay lại</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Thông tin hồ sơ & Tóm tắt chỉ số sức khỏe */}
      <Row className="g-4 mb-4">
        {/* Profile Card */}
        <Col xs={12} lg={4}>
          <Card className="border-0 shadow-sm rounded-3 text-center h-100">
            <Card.Body className="p-4">
              <div
                className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center fw-bold fs-3 mb-3 shadow"
                style={{ width: "70px", height: "70px" }}
              >
                {patient.fullName.slice(0, 2).toUpperCase()}
              </div>
              <Card.Title as="h4" className="fw-bold mb-1">
                {patient.fullName}
              </Card.Title>
              <Card.Subtitle className="text-muted small mb-2">{patient.email}</Card.Subtitle>
              <div className="mb-3">
                <StatusBadge status={patient.status || "Active"} />
              </div>

              <ListGroup variant="flush" className="text-start small">
                <ListGroup.Item className="d-flex justify-content-between px-0 py-2 border-light">
                  <span className="text-muted">Mã BN:</span>
                  <span className="fw-semibold text-primary">
                    {patient.patientCode || `PT-${String(patient.id).padStart(3, "0")}`}
                  </span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between px-0 py-2 border-light">
                  <span className="text-muted">Giới tính:</span>
                  <span className="fw-semibold">
                    {patient.gender === "Male" ? "Nam" : "Nữ"}
                  </span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between px-0 py-2 border-light">
                  <span className="text-muted">Tuổi:</span>
                  <span className="fw-semibold">{patient.age}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between px-0 py-2 border-light">
                  <span className="text-muted">Điện thoại:</span>
                  <span className="fw-semibold">{patient.phone}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between px-0 py-2 border-light">
                  <span className="text-muted">Địa chỉ:</span>
                  <span className="fw-semibold">{patient.address}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between px-0 py-2 border-light">
                  <span className="text-muted">Bảo hiểm:</span>
                  <StatusBadge status={patient.insuranceType || "Standard"} />
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between px-0 py-2 border-light">
                  <span className="text-muted">Nguy cơ:</span>
                  <StatusBadge status={patient.riskLevel || "Low"} />
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between px-0 py-2 border-light">
                  <span className="text-muted">Khám gần nhất:</span>
                  <span className="fw-semibold">{patient.lastVisit || "-"}</span>
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        {/* Chỉ số sức khỏe mới nhất */}
        <Col xs={12} lg={8}>
          <Card className="border-0 shadow-sm rounded-3 h-100">
            <Card.Header className="bg-white border-0 pt-3 pb-2">
              <Card.Title as="h5" className="fw-bold mb-1">
                Chỉ số sức khỏe gần nhất
              </Card.Title>
              <Card.Subtitle className="text-muted small">
                Dữ liệu đo đạc sinh học mới nhất
              </Card.Subtitle>
            </Card.Header>
            <Card.Body className="p-3">
              {latestRecord ? (
                <Row className="g-3">
                  <Col xs={12} sm={6}>
                    <div className="p-3 bg-light rounded-3 border">
                      <small className="text-muted d-block mb-1">Đường huyết</small>
                      <div className="d-flex align-items-baseline justify-content-between">
                        <h3 className="fw-bold mb-0 text-primary">{latestRecord.glucose} mg/dL</h3>
                        <StatusBadge
                          status={getGlucoseStatus(latestRecord.glucose).label}
                          type={getGlucoseStatus(latestRecord.glucose).type}
                        />
                      </div>
                    </div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <div className="p-3 bg-light rounded-3 border">
                      <small className="text-muted d-block mb-1">HbA1c</small>
                      <div className="d-flex align-items-baseline justify-content-between">
                        <h3 className="fw-bold mb-0 text-success">{latestRecord.hba1c}%</h3>
                        <StatusBadge
                          status={getHbA1cStatus(latestRecord.hba1c).label}
                          type={getHbA1cStatus(latestRecord.hba1c).type}
                        />
                      </div>
                    </div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <div className="p-3 bg-light rounded-3 border">
                      <small className="text-muted d-block mb-1">Chỉ số BMI</small>
                      <h3 className="fw-bold mb-0 text-dark">{latestRecord.bmi}</h3>
                    </div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <div className="p-3 bg-light rounded-3 border">
                      <small className="text-muted d-block mb-1">Huyết áp</small>
                      <h3 className="fw-bold mb-0 text-dark">{latestRecord.bloodPressure}</h3>
                    </div>
                  </Col>
                </Row>
              ) : (
                <EmptyState
                  title="Chưa có bệnh án"
                  message="Bệnh nhân chưa có dữ liệu hồ sơ bệnh án nào."
                  icon="bi-file-earmark-x"
                />
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Biểu đồ xu hướng và Lịch hẹn */}
      <Row className="g-4 mb-4">
        <Col xs={12} lg={6}>
          <HealthChart data={records} />
        </Col>
        <Col xs={12} lg={6}>
          <Card className="border-0 shadow-sm rounded-3 h-100">
            <Card.Header className="bg-white border-0 pt-3 pb-2">
              <Card.Title as="h5" className="fw-bold mb-1">
                Lịch hẹn khám
              </Card.Title>
              <Card.Subtitle className="text-muted small">
                Danh sách các cuộc hẹn của bệnh nhân
              </Card.Subtitle>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">Ngày khám</th>
                    <th>Giờ</th>
                    <th>Bác sĩ phụ trách</th>
                    <th>Lý do khám</th>
                    <th className="pe-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((item) => (
                    <tr key={item.id}>
                      <td className="ps-3 fw-medium">{item.date}</td>
                      <td>{item.time}</td>
                      <td>{getDoctorName(item.doctorId)}</td>
                      <td>{translateReason(item.reason)}</td>
                      <td className="pe-3">
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                  {appointments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted">
                        Chưa có lịch hẹn nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Toàn bộ lịch sử hồ sơ bệnh án */}
      <Card className="border-0 shadow-sm rounded-3">
        <Card.Header className="bg-white border-0 pt-3 pb-2">
          <Card.Title as="h5" className="fw-bold mb-1">
            Lịch sử bệnh án
          </Card.Title>
          <Card.Subtitle className="text-muted small">
            Chi tiết các lần thăm khám và chẩn đoán
          </Card.Subtitle>
        </Card.Header>
        <Card.Body className="p-0">
          <Table responsive hover className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="ps-3">Ngày khám</th>
                <th>Bác sĩ phụ trách</th>
                <th>Đường huyết</th>
                <th>HbA1c</th>
                <th>BMI</th>
                <th>Huyết áp</th>
                <th className="pe-3">Chẩn đoán</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="ps-3 fw-medium">{record.date}</td>
                  <td>{getDoctorName(record.doctorId)}</td>
                  <td>{record.glucose} mg/dL</td>
                  <td>{record.hba1c}%</td>
                  <td>{record.bmi}</td>
                  <td>{record.bloodPressure}</td>
                  <td className="pe-3">{translateDiagnosis(record.diagnosis)}</td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    Bệnh nhân chưa có dữ liệu hồ sơ bệnh án nào.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default PatientDetail;
