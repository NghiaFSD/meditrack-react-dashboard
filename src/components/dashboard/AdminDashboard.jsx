import React, { useMemo, useState } from "react";
import { Row, Col, Card, Table, Badge, Button } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import StatCard from "./StatCard";
import QuickViewModal from "./QuickViewModal";
import StatusBadge from "../common/StatusBadge";
import { ROUTES } from "../../config/routes";
import { useLanguage } from "../../context/LanguageContext";
import { translateReason } from "../../utils/translations";

const RISK_COLORS = {
  High: "#dc3545",
  Medium: "#ffc107",
  Low: "#198754",
};

/**
 * Giao diện Dashboard chuyên biệt cho Quản trị viên (Admin Operations Center) có hỗ trợ Click xem nhanh
 */
function AdminDashboard({
  patients = [],
  doctors = [],
  appointments = [],
  records = [],
  onUpdateAppointmentStatus,
}) {
  const { lang, t } = useLanguage();
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

  const todayAppointments = appointments.filter((a) => a.date === today);
  const pendingAppointments = appointments.filter((a) => a.status === "Pending");
  const recentPatients = [...patients].slice(-5).reverse();

  const getPatientName = (id) => patients.find((p) => Number(p.id) === Number(id))?.fullName || "Unknown";
  const getDoctorName = (id) => doctors.find((d) => Number(d.id) === Number(id))?.fullName || "Unknown";

  // Thống kê trạng thái lịch hẹn
  const appointmentStatusData = useMemo(() => {
    const statusKeys = ["Pending", "Approved", "Completed", "Cancelled"];
    return statusKeys.map((k) => ({
      status:
        lang === "vi"
          ? k === "Pending"
            ? "Chờ duyệt"
            : k === "Approved"
            ? "Đã duyệt"
            : k === "Completed"
            ? "Hoàn thành"
            : "Đã hủy"
          : k,
      total: appointments.filter((a) => a.status === k).length,
    }));
  }, [appointments, lang]);

  // Thống kê phân loại rủi ro bệnh nhân
  const riskData = useMemo(() => {
    const counts = { High: 0, Medium: 0, Low: 0 };
    patients.forEach((p) => {
      const r = p.riskLevel || "Low";
      if (counts[r] !== undefined) counts[r]++;
      else counts.Low++;
    });
    return [
      { name: lang === "vi" ? "Nguy cơ Cao" : "High Risk", value: counts.High, color: RISK_COLORS.High },
      { name: lang === "vi" ? "Trung bình" : "Medium Risk", value: counts.Medium, color: RISK_COLORS.Medium },
      { name: lang === "vi" ? "Thấp" : "Low Risk", value: counts.Low, color: RISK_COLORS.Low },
    ];
  }, [patients, lang]);

  return (
    <div>
      {/* Tiêu đề & Action Center */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h2 className="fw-bold text-dark mb-0">{t("dashboard.admOperationsTitle")}</h2>
            <Badge bg="danger" className="px-2 py-1 fs-6 rounded-pill">
              <i className="bi bi-shield-lock me-1"></i>ADMIN
            </Badge>
          </div>
          <p className="text-muted mb-0">{t("dashboard.admOperationsSub")}</p>
        </div>

        {/* Thanh tác vụ nhanh của Admin */}
        <div className="d-flex flex-wrap gap-2">
          <Button
            variant="primary"
            className="d-flex align-items-center gap-2 shadow-sm"
            onClick={() => navigate(ROUTES.PATIENTS)}
          >
            <i className="bi bi-person-plus-fill"></i>
            <span>{t("dashboard.admQuickAddPatient")}</span>
          </Button>
          <Button
            variant="outline-primary"
            className="d-flex align-items-center gap-2 bg-white"
            onClick={() => navigate(ROUTES.APPOINTMENTS)}
          >
            <i className="bi bi-calendar-plus"></i>
            <span>{t("dashboard.admQuickAddAppt")}</span>
          </Button>
          <Button
            variant="outline-secondary"
            className="d-flex align-items-center gap-2 bg-white"
            onClick={() => navigate(ROUTES.RECORDS)}
          >
            <i className="bi bi-file-earmark-medical"></i>
            <span>{t("dashboard.admQuickAddRecord")}</span>
          </Button>
        </div>
      </div>

      {/* 4 Thẻ KPI điều hành toàn viện - CÓ HỖ TRỢ CLICK XEM NHANH */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title={t("dashboard.statTotalPatients")}
            value={patients.length}
            icon={<i className="bi bi-people-fill"></i>}
            note={t("dashboard.noteActivePatients")}
            onClick={() =>
              openQuickView(
                "patients",
                lang === "vi" ? "Danh sách Bệnh nhân Toàn hệ thống" : "All Registered Patients",
                lang === "vi" ? "Xem nhanh danh sách tất cả hồ sơ bệnh nhân trong phòng khám" : "Quick overview of all patient profiles",
                patients
              )
            }
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title={t("dashboard.statTotalDoctors")}
            value={doctors.length}
            icon={<i className="bi bi-person-badge-fill"></i>}
            note={t("dashboard.noteAvailableDoctors")}
            onClick={() =>
              openQuickView(
                "doctors",
                lang === "vi" ? "Danh sách Bác sĩ Phòng khám" : "Medical Staff & Doctors",
                lang === "vi" ? "Thông tin chuyên khoa, phòng khám và ca trực của bác sĩ" : "Specialty, room and shift details",
                doctors
              )
            }
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title={t("dashboard.statTodayAppointments")}
            value={todayAppointments.length}
            icon={<i className="bi bi-calendar-check-fill"></i>}
            note={t("dashboard.noteScheduleToday")}
            onClick={() =>
              openQuickView(
                "appointments",
                lang === "vi" ? "Danh sách Lịch khám Hôm nay" : "Today's Scheduled Appointments",
                lang === "vi" ? `Các ca khám đã lên lịch trong ngày ${today}` : `Appointments scheduled for ${today}`,
                todayAppointments
              )
            }
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title={t("dashboard.statMedicalRecords")}
            value={records.length}
            icon={<i className="bi bi-file-earmark-medical-fill"></i>}
            note={t("dashboard.noteRecordsStored")}
            onClick={() =>
              openQuickView(
                "records",
                lang === "vi" ? "Hồ sơ Bệnh án Toàn viện" : "Hospital Medical Records",
                lang === "vi" ? "Tổng hợp kết quả khám và chỉ số sinh học của tất cả bệnh nhân" : "Comprehensive diagnostic records",
                records
              )
            }
          />
        </Col>
      </Row>

      {/* Biểu đồ phân bổ Lịch hẹn & Phân loại rủi ro bệnh nhân */}
      <Row className="g-4 mb-4">
        <Col xs={12} lg={7}>
          <Card className="border-0 shadow-sm rounded-3 h-100">
            <Card.Header className="bg-white border-0 pt-3 pb-0">
              <Card.Title as="h5" className="fw-bold mb-1">
                {t("dashboard.sectionApptStatus")}
              </Card.Title>
              <Card.Subtitle className="text-muted small">
                {t("dashboard.descApptStatus")}
              </Card.Subtitle>
            </Card.Header>
            <Card.Body>
              <div style={{ width: "100%", height: "260px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={appointmentStatusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="status" stroke="#94a3b8" fontSize={12} />
                    <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                      }}
                    />
                    <Bar dataKey="total" fill="#0d6efd" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} lg={5}>
          <Card className="border-0 shadow-sm rounded-3 h-100">
            <Card.Header className="bg-white border-0 pt-3 pb-0">
              <Card.Title as="h5" className="fw-bold mb-1">
                {lang === "vi" ? "Phân loại Nguy cơ Bệnh nhân" : "Patient Risk Stratification"}
              </Card.Title>
              <Card.Subtitle className="text-muted small">
                {lang === "vi" ? "Tỷ lệ mức độ rủi ro tiểu đường toàn viện" : "Hospital-wide diabetes risk distribution"}
              </Card.Subtitle>
            </Card.Header>
            <Card.Body className="d-flex flex-column justify-content-center">
              <div style={{ width: "100%", height: "180px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                      {riskData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="d-flex justify-content-center gap-3 mt-2 small">
                {riskData.map((item, idx) => (
                  <div key={idx} className="d-flex align-items-center gap-1">
                    <span style={{ width: "10px", height: "10px", backgroundColor: item.color, borderRadius: "50%", display: "inline-block" }}></span>
                    <span className="text-muted">{item.name}: <strong>{item.value}</strong></span>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Hàng đợi tiếp nhận toàn viện & Bệnh nhân mới */}
      <Row className="g-4">
        {/* Hàng đợi Chờ duyệt toàn viện */}
        <Col xs={12} lg={7}>
          <Card className="border-0 shadow-sm rounded-3 h-100">
            <Card.Header className="bg-white border-0 pt-3 pb-2 d-flex justify-content-between align-items-center">
              <div>
                <Card.Title as="h5" className="fw-bold mb-1 text-dark">
                  <i className="bi bi-clock-history text-warning me-2"></i>
                  {t("dashboard.admGlobalQueueTitle")}
                </Card.Title>
                <Card.Subtitle className="text-muted small">
                  {t("dashboard.admGlobalQueueSub")}
                </Card.Subtitle>
              </div>
              <Badge bg="warning" text="dark" className="px-2 py-1 rounded-pill">
                {pendingAppointments.length} {lang === "vi" ? "Chờ duyệt" : "Pending"}
              </Badge>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">{t("patientDetail.date")}</th>
                    <th>{t("appointments.tablePatient")}</th>
                    <th>{t("appointments.tableDoctor")}</th>
                    <th>{t("patientDetail.reason")}</th>
                    <th className="text-center pe-3">{t("patients.tableAction")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingAppointments.slice(0, 5).map((item) => (
                    <tr key={item.id}>
                      <td className="ps-3 fw-medium">
                        {item.date} <small className="text-muted">({item.time})</small>
                      </td>
                      <td className="fw-semibold text-primary">{getPatientName(item.patientId)}</td>
                      <td>{getDoctorName(item.doctorId)}</td>
                      <td>{translateReason(item.reason, lang)}</td>
                      <td className="text-center pe-3">
                        <Button
                          size="sm"
                          variant="success"
                          className="py-0 px-2 fw-medium rounded-pill"
                          onClick={() => onUpdateAppointmentStatus(item, "Approved")}
                        >
                          <i className="bi bi-check me-1"></i>
                          {t("dashboard.btnApprove")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {pendingAppointments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted">
                        <i className="bi bi-check-circle fs-3 text-success d-block mb-1"></i>
                        {lang === "vi" ? "Tất cả lịch khám đã được xử lý xong!" : "All appointments have been processed!"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        {/* Bệnh nhân mới tiếp nhận */}
        <Col xs={12} lg={5}>
          <Card className="border-0 shadow-sm rounded-3 h-100">
            <Card.Header className="bg-white border-0 pt-3 pb-2 d-flex justify-content-between align-items-center">
              <div>
                <Card.Title as="h5" className="fw-bold mb-1 text-dark">
                  <i className="bi bi-person-plus text-primary me-2"></i>
                  {t("dashboard.admRecentPatients")}
                </Card.Title>
                <Card.Subtitle className="text-muted small">
                  {lang === "vi" ? "Danh sách hồ sơ bệnh nhân đăng ký mới" : "Recently registered patient records"}
                </Card.Subtitle>
              </div>
              <Link to={ROUTES.PATIENTS} className="small fw-semibold text-primary">
                {lang === "vi" ? "Xem tất cả →" : "View all →"}
              </Link>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">{t("patients.tableCode")}</th>
                    <th>{t("patients.tableName")}</th>
                    <th>{t("patients.tableRisk")}</th>
                    <th className="pe-3">{t("patients.tableStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPatients.map((p) => (
                    <tr key={p.id}>
                      <td className="ps-3 fw-semibold text-primary">
                        {p.patientCode || `PT-${String(p.id).padStart(3, "0")}`}
                      </td>
                      <td className="fw-medium">{p.fullName}</td>
                      <td>
                        <StatusBadge status={p.riskLevel || "Low"} />
                      </td>
                      <td className="pe-3">
                        <StatusBadge status={p.status || "Active"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick View Modal */}
      <QuickViewModal
        isOpen={modalConfig.isOpen}
        onClose={closeQuickView}
        title={modalConfig.title}
        subtitle={modalConfig.subtitle}
        type={modalConfig.type}
        data={modalConfig.data}
        patients={patients}
        doctors={doctors}
        onApproveAppointment={onUpdateAppointmentStatus}
      />
    </div>
  );
}

export default AdminDashboard;
