import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Card, Table, Badge } from "react-bootstrap";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { patientApi } from "../api/patientApi";
import { doctorApi } from "../api/doctorApi";
import { appointmentApi } from "../api/appointmentApi";
import { recordApi } from "../api/recordApi";
import StatCard from "../components/dashboard/StatCard";
import HealthChart from "../components/dashboard/HealthChart";
import Loading from "../components/common/Loading";
import StatusBadge from "../components/common/StatusBadge";
import { ROLES, findLinkedDoctor, findLinkedPatient } from "../utils/auth";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { translateReason } from "../utils/translations";

/**
 * Dashboard tổng quan phân quyền theo 3 Role: ADMIN, DOCTOR, PATIENT sử dụng React-Bootstrap
 */
function Dashboard() {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const currentRole = user?.role;

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [p, d, a, r] = await Promise.all([
          patientApi.getAll(),
          doctorApi.getAll(),
          appointmentApi.getAll(),
          recordApi.getAll(),
        ]);
        setPatients(p);
        setDoctors(d);
        setAppointments(a);
        setRecords(r);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const linkedPatient = useMemo(() => findLinkedPatient(patients, user), [patients, user]);
  const linkedDoctor = useMemo(() => findLinkedDoctor(doctors, user), [doctors, user]);

  // Phân vùng dữ liệu theo Role
  const scopedAppointments = useMemo(() => {
    if (currentRole === ROLES.PATIENT && linkedPatient) {
      return appointments.filter((item) => Number(item.patientId) === Number(linkedPatient.id));
    }
    if (currentRole === ROLES.DOCTOR && linkedDoctor) {
      return appointments.filter((item) => Number(item.doctorId) === Number(linkedDoctor.id));
    }
    return appointments;
  }, [appointments, currentRole, linkedPatient, linkedDoctor]);

  const scopedRecords = useMemo(() => {
    if (currentRole === ROLES.PATIENT && linkedPatient) {
      return records.filter((item) => Number(item.patientId) === Number(linkedPatient.id));
    }
    if (currentRole === ROLES.DOCTOR && linkedDoctor) {
      return records.filter((item) => Number(item.doctorId) === Number(linkedDoctor.id));
    }
    return records;
  }, [records, currentRole, linkedPatient, linkedDoctor]);

  const scopedPatients = useMemo(() => {
    if (currentRole === ROLES.PATIENT && linkedPatient) {
      return patients.filter((item) => Number(item.id) === Number(linkedPatient.id));
    }
    if (currentRole === ROLES.DOCTOR && linkedDoctor) {
      const docPatientIds = new Set([
        ...appointments.filter((a) => Number(a.doctorId) === Number(linkedDoctor.id)).map((a) => Number(a.patientId)),
        ...records.filter((r) => Number(r.doctorId) === Number(linkedDoctor.id)).map((r) => Number(r.patientId)),
      ]);
      return patients.filter((p) => docPatientIds.has(Number(p.id)));
    }
    return patients;
  }, [patients, appointments, records, currentRole, linkedPatient, linkedDoctor]);

  // Thống kê nhanh
  const todayAppointments = scopedAppointments.filter((a) => a.date === today);
  const nextAppointment =
    [...scopedAppointments]
      .filter((a) => a.date >= today)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0] || null;

  // Dữ liệu biểu đồ trạng thái lịch hẹn
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
      total: scopedAppointments.filter((a) => a.status === k).length,
    }));
  }, [scopedAppointments, lang]);

  if (loading) return <Loading text={t("common.loading")} />;

  const getPatientName = (id) => patients.find((p) => Number(p.id) === Number(id))?.fullName || "Unknown";
  const getDoctorName = (id) => doctors.find((d) => Number(d.id) === Number(id))?.fullName || "Unknown";

  return (
    <Container fluid className="px-0">
      {/* Tiêu đề trang */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">
            {t(`dashboard.title${currentRole === ROLES.ADMIN ? "Admin" : currentRole === ROLES.DOCTOR ? "Doctor" : "Patient"}`)}
          </h2>
          <p className="text-muted mb-0">
            {t(`dashboard.desc${currentRole === ROLES.ADMIN ? "Admin" : currentRole === ROLES.DOCTOR ? "Doctor" : "Patient"}`)}
          </p>
        </div>
        <div>
          <Badge
            bg={currentRole === ROLES.ADMIN ? "danger" : currentRole === ROLES.DOCTOR ? "primary" : "success"}
            className="px-3 py-2 fs-6 shadow-sm rounded-pill"
          >
            <i className="bi bi-shield-check me-1"></i>
            {currentRole || "USER"}
          </Badge>
        </div>
      </div>

      {/* 4 Thẻ thống kê chính */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title={t("dashboard.statTotalPatients")}
            value={scopedPatients.length}
            icon={<i className="bi bi-people-fill"></i>}
            note={t("dashboard.noteActivePatients")}
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title={t("dashboard.statTotalDoctors")}
            value={doctors.length}
            icon={<i className="bi bi-person-badge-fill"></i>}
            note={t("dashboard.noteAvailableDoctors")}
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title={t("dashboard.statTodayAppointments")}
            value={todayAppointments.length}
            icon={<i className="bi bi-calendar-check-fill"></i>}
            note={t("dashboard.noteScheduleToday")}
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title={t("dashboard.statMedicalRecords")}
            value={scopedRecords.length}
            icon={<i className="bi bi-file-earmark-medical-fill"></i>}
            note={t("dashboard.noteRecordsStored")}
          />
        </Col>
      </Row>

      {/* Khu vực Biểu đồ */}
      <Row className="g-3 mb-4">
        <Col xs={12} lg={6}>
          <HealthChart data={scopedRecords} />
        </Col>
        <Col xs={12} lg={6}>
          <Card className="border-0 shadow-sm rounded-3 h-100 mb-4">
            <Card.Header className="bg-white border-0 pt-3 pb-0">
              <Card.Title as="h5" className="fw-bold mb-1">
                {t("dashboard.sectionApptStatus")}
              </Card.Title>
              <Card.Subtitle className="text-muted small">
                {t("dashboard.descApptStatus")}
              </Card.Subtitle>
            </Card.Header>
            <Card.Body>
              <div style={{ width: "100%", height: "280px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={appointmentStatusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="status" stroke="#94a3b8" fontSize={12} />
                    <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Bar dataKey="total" fill="#0d6efd" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Khu vực Danh sách Lịch hẹn gần đây */}
      <Card className="border-0 shadow-sm rounded-3">
        <Card.Header className="bg-white border-0 pt-3 pb-2 d-flex flex-wrap justify-content-between align-items-center">
          <div>
            <Card.Title as="h5" className="fw-bold mb-1">
              {t("dashboard.sectionRecentAppointments")}
            </Card.Title>
            <Card.Subtitle className="text-muted small">
              {nextAppointment
                ? `${t("dashboard.sectionNextAppointment")}: ${nextAppointment.date} ${nextAppointment.time}`
                : t("dashboard.descRecentAppointments")}
            </Card.Subtitle>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <Table responsive hover className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="ps-3">{t("patientDetail.date")}</th>
                <th>{t("patientDetail.time")}</th>
                <th>{t("appointments.tablePatient")}</th>
                <th>{t("appointments.tableDoctor")}</th>
                <th>{t("patientDetail.reason")}</th>
                <th className="pe-3">{t("patientDetail.status")}</th>
              </tr>
            </thead>
            <tbody>
              {scopedAppointments.slice(0, 6).map((item) => (
                <tr key={item.id}>
                  <td className="ps-3 fw-medium">{item.date}</td>
                  <td>{item.time}</td>
                  <td>{getPatientName(item.patientId)}</td>
                  <td>{getDoctorName(item.doctorId)}</td>
                  <td>{translateReason(item.reason, lang)}</td>
                  <td className="pe-3">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))}
              {scopedAppointments.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    <i className="bi bi-calendar-x fs-3 d-block mb-1"></i>
                    {t("dashboard.descRecentAppointments")}
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

export default Dashboard;
