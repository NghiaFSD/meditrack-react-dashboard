import React, { useEffect, useMemo, useState } from "react";
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
 * Dashboard tổng quan phân quyền theo 3 Role: ADMIN, DOCTOR, PATIENT
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
  const nextAppointment = [...scopedAppointments]
    .filter((a) => a.date >= today)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0] || null;

  // Dữ liệu biểu đồ trạng thái lịch hẹn
  const appointmentStatusData = useMemo(() => {
    const statusKeys = ["Pending", "Approved", "Completed", "Cancelled"];
    return statusKeys.map((k) => ({
      status: lang === "vi" ? (k === "Pending" ? "Chờ duyệt" : k === "Approved" ? "Đã duyệt" : k === "Completed" ? "Hoàn thành" : "Đã hủy") : k,
      total: scopedAppointments.filter((a) => a.status === k).length,
    }));
  }, [scopedAppointments, lang]);

  if (loading) return <Loading text={t("common.loading")} />;

  const getPatientName = (id) => patients.find((p) => Number(p.id) === Number(id))?.fullName || "Unknown";
  const getDoctorName = (id) => doctors.find((d) => Number(d.id) === Number(id))?.fullName || "Unknown";

  return (
    <div className={`dashboard-shell role-${(currentRole || "user").toLowerCase()}`}>
      <div className="page-title">
        <div>
          <h1>{t(`dashboard.title${currentRole === ROLES.ADMIN ? "Admin" : currentRole === ROLES.DOCTOR ? "Doctor" : "Patient"}`)}</h1>
          <p>{t(`dashboard.desc${currentRole === ROLES.ADMIN ? "Admin" : currentRole === ROLES.DOCTOR ? "Doctor" : "Patient"}`)}</p>
        </div>
        <div className="role-badge">{currentRole || "USER"}</div>
      </div>

      {/* 4 Thẻ thống kê chính */}
      <div className="stats-grid">
        <StatCard title={t("dashboard.statTotalPatients")} value={scopedPatients.length} icon="🧑‍⚕️" note={t("dashboard.noteActivePatients")} />
        <StatCard title={t("dashboard.statTotalDoctors")} value={doctors.length} icon="👨‍⚕️" note={t("dashboard.noteAvailableDoctors")} />
        <StatCard title={t("dashboard.statTodayAppointments")} value={todayAppointments.length} icon="📅" note={t("dashboard.noteScheduleToday")} />
        <StatCard title={t("dashboard.statMedicalRecords")} value={scopedRecords.length} icon="📋" note={t("dashboard.noteRecordsStored")} />
      </div>

      {/* Khu vực Biểu đồ */}
      <div className="dashboard-grid">
        <HealthChart data={scopedRecords} />

        <div className="chart-card">
          <div className="section-title compact">
            <div>
              <h3>{t("dashboard.sectionApptStatus")}</h3>
              <p>{t("dashboard.descApptStatus")}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={appointmentStatusData}>
              <XAxis dataKey="status" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Khu vực Danh sách Lịch hẹn gần đây */}
      <div className="table-card" style={{ marginTop: "1.5rem" }}>
        <div className="section-title compact">
          <div>
            <h3>{t("dashboard.sectionRecentAppointments")}</h3>
            <p>{nextAppointment ? `${t("dashboard.sectionNextAppointment")}: ${nextAppointment.date} ${nextAppointment.time}` : t("dashboard.descRecentAppointments")}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>{t("patientDetail.date")}</th>
              <th>{t("patientDetail.time")}</th>
              <th>{t("appointments.tablePatient")}</th>
              <th>{t("appointments.tableDoctor")}</th>
              <th>{t("patientDetail.reason")}</th>
              <th>{t("patientDetail.status")}</th>
            </tr>
          </thead>
          <tbody>
            {scopedAppointments.slice(0, 6).map((item) => (
              <tr key={item.id}>
                <td>{item.date}</td>
                <td>{item.time}</td>
                <td>{getPatientName(item.patientId)}</td>
                <td>{getDoctorName(item.doctorId)}</td>
                <td>{translateReason(item.reason, lang)}</td>
                <td><StatusBadge status={item.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;
