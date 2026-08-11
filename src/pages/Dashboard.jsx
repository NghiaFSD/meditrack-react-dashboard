import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { patientApi } from "../api/patientApi";
import { doctorApi } from "../api/doctorApi";
import { appointmentApi } from "../api/appointmentApi";
import { recordApi } from "../api/recordApi";
import StatCard from "../components/dashboard/StatCard";
import HealthChart from "../components/dashboard/HealthChart";
import Loading from "../components/common/Loading";
import StatusBadge from "../components/common/StatusBadge";
import { ROLES, findLinkedDoctor, findLinkedPatient, getCurrentUser } from "../utils/auth";
import {
  getBloodPressureStatus,
  getBmiStatus,
  getGlucoseStatus,
  getHbA1cStatus,
} from "../utils/healthStatus";
import { useLanguage } from "../context/LanguageContext";
import { translateDiagnosis, translateReason } from "../utils/dataTranslations";

// Dashboard tổng quan cho toàn hệ thống.
function Dashboard() {
  const { lang, t } = useLanguage();
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = getCurrentUser();
  const currentRole = currentUser?.role;

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const [patientData, doctorData, appointmentData, recordData] = await Promise.all([
          patientApi.getAll(),
          doctorApi.getAll(),
          appointmentApi.getAll(),
          recordApi.getAll(),
        ]);

        setPatients(patientData);
        setDoctors(doctorData);
        setAppointments(appointmentData);
        setRecords(recordData);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const linkedPatient = useMemo(() => findLinkedPatient(patients, currentUser), [patients, currentUser]);
  const linkedDoctor = useMemo(() => findLinkedDoctor(doctors, currentUser), [doctors, currentUser]);

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
      const patientIds = new Set([
        ...appointments.filter((item) => Number(item.doctorId) === Number(linkedDoctor.id)).map((item) => Number(item.patientId)),
        ...records.filter((item) => Number(item.doctorId) === Number(linkedDoctor.id)).map((item) => Number(item.patientId)),
      ]);

      return patients.filter((item) => patientIds.has(Number(item.id)));
    }

    return patients;
  }, [patients, appointments, records, currentRole, linkedPatient, linkedDoctor]);

  const todayAppointments = scopedAppointments.filter((item) => item.date === today);
  const latestRecord = scopedRecords[scopedRecords.length - 1] || null;
  const pendingAppointments = scopedAppointments.filter((item) => item.status === "Pending");
  const approvedAppointments = scopedAppointments.filter((item) => item.status === "Approved");
  const assignedDoctors = new Set(scopedAppointments.map((item) => Number(item.doctorId)));
  if (currentRole === ROLES.PATIENT && linkedDoctor) {
    assignedDoctors.add(Number(linkedDoctor.id));
  }

  const nextAppointment = [...scopedAppointments]
    .filter((item) => item.date >= today)
    .sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`))[0] || null;

  const dashboardTitle =
    currentRole === ROLES.ADMIN
      ? t("dashboard.titleAdmin")
      : currentRole === ROLES.DOCTOR
        ? t("dashboard.titleDoctor")
        : t("dashboard.titlePatient");

  const dashboardDescription =
    currentRole === ROLES.PATIENT
      ? t("dashboard.descPatient")
      : currentRole === ROLES.DOCTOR
        ? t("dashboard.descDoctor")
        : t("dashboard.descAdmin");

  // Gom số lượng lịch hẹn theo status để vẽ chart.
  const appointmentStatusData = useMemo(() => {
    const statuses = [
      { raw: "Pending", label: lang === "vi" ? "Chờ duyệt" : "Pending" },
      { raw: "Approved", label: lang === "vi" ? "Đã duyệt" : "Approved" },
      { raw: "Completed", label: lang === "vi" ? "Hoàn thành" : "Completed" },
      { raw: "Cancelled", label: lang === "vi" ? "Đã hủy" : "Cancelled" },
    ];

    return statuses.map((item) => ({
      status: item.label,
      total: scopedAppointments.filter((entry) => entry.status === item.raw).length,
    }));
  }, [scopedAppointments, lang]);

  const doctorPatientRows = useMemo(() => {
    return scopedPatients
      .map((patient) => {
        const patientAppointments = scopedAppointments.filter((item) => Number(item.patientId) === Number(patient.id));
        const patientRecords = scopedRecords.filter((item) => Number(item.patientId) === Number(patient.id));
        const latestDate = [...patientAppointments, ...patientRecords]
          .map((item) => item.date)
          .sort((left, right) => right.localeCompare(left))[0] || "-";

        return {
          ...patient,
          appointmentCount: patientAppointments.length,
          recordCount: patientRecords.length,
          latestDate,
        };
      })
      .sort((left, right) => right.latestDate.localeCompare(left.latestDate) || left.fullName.localeCompare(right.fullName));
  }, [scopedPatients, scopedAppointments, scopedRecords]);

  const adminPendingAppointments = useMemo(() => {
    return appointments
      .filter((item) => item.status === "Pending")
      .sort((left, right) => `${right.date} ${right.time}`.localeCompare(`${left.date} ${left.time}`))
      .slice(0, 5);
  }, [appointments]);

  const patientHealthSummary = latestRecord
    ? [
        { label: "Glucose", value: `${latestRecord.glucose} mg/dL`, status: getGlucoseStatus(latestRecord.glucose) },
        { label: "HbA1c", value: `${latestRecord.hba1c}%`, status: getHbA1cStatus(latestRecord.hba1c) },
        { label: "BMI", value: `${latestRecord.bmi}`, status: getBmiStatus(latestRecord.bmi) },
        { label: "Blood Pressure", value: latestRecord.bloodPressure, status: getBloodPressureStatus(latestRecord.bloodPressure) },
      ]
    : [];

  if (loading) return <Loading text={t("common.loading")} />;

  return (
    <div className={`dashboard-shell ${currentRole ? `role-${currentRole.toLowerCase()}` : ""}`}>
      <div className="page-title">
        <div>
          <h1>{dashboardTitle}</h1>
          <p>{dashboardDescription}</p>
        </div>
        <div className="role-badge">{currentRole || "USER"}</div>
      </div>

      <div className="stats-grid">
        <StatCard
          title={t("dashboard.statTotalPatients")}
          value={scopedPatients.length}
          icon="🧑‍⚕️"
          note={
            currentRole === ROLES.ADMIN
              ? t("dashboard.noteActivePatients")
              : currentRole === ROLES.DOCTOR
                ? t("dashboard.noteAssignedPatients")
                : t("dashboard.noteYourProfile")
          }
        />
        <StatCard
          title={t("dashboard.statTotalDoctors")}
          value={currentRole === ROLES.PATIENT ? assignedDoctors.size : doctors.length}
          icon="👨‍⚕️"
          note={currentRole === ROLES.PATIENT ? t("dashboard.noteAssignedDoctors") : t("dashboard.noteAvailableDoctors")}
        />
        <StatCard
          title={t("dashboard.statTodayAppointments")}
          value={todayAppointments.length}
          icon="📅"
          note={
            currentRole === ROLES.DOCTOR
              ? `${pendingAppointments.length} ${lang === "vi" ? "chờ duyệt" : "pending"}, ${approvedAppointments.length} ${lang === "vi" ? "đã duyệt" : "approved"}`
              : currentRole === ROLES.PATIENT
                ? t("dashboard.noteScheduleToday")
                : t("dashboard.noteScheduledToday")
          }
        />
        <StatCard
          title={t("dashboard.statMedicalRecords")}
          value={scopedRecords.length}
          icon="📋"
          note={currentRole === ROLES.PATIENT ? t("dashboard.noteYourRecords") : t("dashboard.noteRecordsStored")}
        />
      </div>

      {currentRole === ROLES.ADMIN && (
        <>
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
                  <Bar dataKey="total" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="dashboard-grid bottom">
            <div className="table-card">
              <div className="section-title compact">
                <div>
                  <h3>{t("dashboard.sectionPendingApprovals")}</h3>
                  <p>{t("dashboard.descPendingApprovals")}</p>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>{t("patientDetail.date")}</th>
                    <th>{t("patientDetail.time")}</th>
                    <th>{t("appointments.tablePatient")}</th>
                    <th>{t("appointments.tableDoctor")}</th>
                  </tr>
                </thead>
                <tbody>
                  {adminPendingAppointments.map((item) => (
                    <tr key={item.id}>
                      <td>{item.date}</td>
                      <td>{item.time}</td>
                      <td>{patients.find((patient) => Number(patient.id) === Number(item.patientId))?.fullName || "Unknown"}</td>
                      <td>{doctors.find((doctor) => Number(doctor.id) === Number(item.doctorId))?.fullName || "Unknown"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-card">
              <div className="section-title compact">
                <div>
                  <h3>{t("dashboard.sectionRecentAppointments")}</h3>
                  <p>{t("dashboard.descRecentAppointments")}</p>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>{t("patientDetail.date")}</th>
                    <th>{t("patientDetail.time")}</th>
                    <th>{t("patientDetail.reason")}</th>
                    <th>{t("patientDetail.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {scopedAppointments.slice(0, 5).map((item) => (
                    <tr key={item.id}>
                      <td>{item.date}</td>
                      <td>{item.time}</td>
                      <td>{translateReason(item.reason, lang)}</td>
                      <td><StatusBadge status={item.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {currentRole === ROLES.DOCTOR && (
        <>
          <div className="dashboard-grid">
            <div className="table-card">
              <div className="section-title compact">
                <div>
                  <h3>{t("dashboard.sectionMyPatients")}</h3>
                  <p>{t("dashboard.descMyPatients")}</p>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>{t("appointments.tablePatient")}</th>
                    <th>{t("nav.appointments")}</th>
                    <th>{t("nav.medicalRecords")}</th>
                    <th>{t("patients.tableLastVisit")}</th>
                  </tr>
                </thead>
                <tbody>
                  {doctorPatientRows.map((patient) => (
                    <tr key={patient.id}>
                      <td>{patient.fullName}</td>
                      <td>{patient.appointmentCount}</td>
                      <td>{patient.recordCount}</td>
                      <td>{patient.latestDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-card">
              <div className="section-title compact">
                <div>
                  <h3>{t("dashboard.sectionTodayQueue")}</h3>
                  <p>{t("dashboard.descTodayQueue")}</p>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>{t("patientDetail.time")}</th>
                    <th>{t("appointments.tablePatient")}</th>
                    <th>{t("patientDetail.reason")}</th>
                    <th>{t("patientDetail.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAppointments.map((item) => (
                    <tr key={item.id}>
                      <td>{item.time}</td>
                      <td>{patients.find((patient) => Number(patient.id) === Number(item.patientId))?.fullName || "Unknown"}</td>
                      <td>{translateReason(item.reason, lang)}</td>
                      <td><StatusBadge status={item.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="dashboard-grid bottom">
            <div className="chart-card">
              <div className="section-title compact">
                <div>
                  <h3>{t("dashboard.sectionWorkloadStatus")}</h3>
                  <p>{t("dashboard.descWorkloadStatus")}</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={appointmentStatusData}>
                  <XAxis dataKey="status" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="table-card">
              <div className="section-title compact">
                <div>
                  <h3>{t("dashboard.sectionLatestRecords")}</h3>
                  <p>{t("dashboard.descLatestRecords")}</p>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>{t("appointments.tablePatient")}</th>
                    <th>{t("patientDetail.date")}</th>
                    <th>{t("patientDetail.glucose")}</th>
                    <th>{t("patientDetail.diagnosis")}</th>
                  </tr>
                </thead>
                <tbody>
                  {scopedRecords.slice(0, 5).map((record) => (
                    <tr key={record.id}>
                      <td>{patients.find((patient) => Number(patient.id) === Number(record.patientId))?.fullName || "Unknown"}</td>
                      <td>{record.date}</td>
                      <td>{record.glucose} mg/dL</td>
                      <td>{translateDiagnosis(record.diagnosis, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {currentRole === ROLES.PATIENT && (
        <>
          <div className="dashboard-grid">
            <div className="chart-card">
              <div className="section-title compact">
                <div>
                  <h3>{t("dashboard.sectionHealthSummary")}</h3>
                  <p>{t("dashboard.descHealthSummary")}</p>
                </div>
              </div>

              {latestRecord ? (
                <div className="health-summary">
                  {patientHealthSummary.map((item) => (
                    <div key={item.label}>
                      <span>{item.label === "Glucose" ? t("patientDetail.glucose") : item.label === "HbA1c" ? t("patientDetail.hba1c") : item.label === "BMI" ? t("patientDetail.bmi") : t("patientDetail.bloodPressure")}</span>
                      <strong>{item.value}</strong>
                      <StatusBadge status={item.status.label} type={item.status.type} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">{t("dashboard.noRecordText")}</p>
              )}
            </div>

            <div className="table-card">
              <div className="section-title compact">
                <div>
                  <h3>{t("dashboard.sectionNextAppointment")}</h3>
                  <p>{t("dashboard.descNextAppointment")}</p>
                </div>
              </div>

              {nextAppointment ? (
                <div className="health-summary">
                  <div>
                    <span>{t("patientDetail.date")}</span>
                    <strong>{nextAppointment.date}</strong>
                  </div>
                  <div>
                    <span>{t("patientDetail.time")}</span>
                    <strong>{nextAppointment.time}</strong>
                  </div>
                  <div>
                    <span>{t("patientDetail.doctor")}</span>
                    <strong>{doctors.find((doctor) => Number(doctor.id) === Number(nextAppointment.doctorId))?.fullName || "Unknown doctor"}</strong>
                  </div>
                  <div>
                    <span>{t("patientDetail.status")}</span>
                    <strong><StatusBadge status={nextAppointment.status} /></strong>
                  </div>
                </div>
              ) : (
                <p className="text-muted">{t("dashboard.noUpcomingText")}</p>
              )}
            </div>
          </div>

          <div className="dashboard-grid bottom">
            <div className="chart-card">
              <div className="section-title compact">
                <div>
                  <h3>{t("dashboard.sectionMyRecordsTrend")}</h3>
                  <p>{t("dashboard.descMyRecordsTrend")}</p>
                </div>
              </div>
              <HealthChart data={scopedRecords} />
            </div>

            <div className="table-card">
              <div className="section-title compact">
                <div>
                  <h3>{t("appointments.titleMy")}</h3>
                  <p>{t("dashboard.descRecentAppointments")}</p>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>{t("patientDetail.date")}</th>
                    <th>{t("patientDetail.time")}</th>
                    <th>{t("patientDetail.reason")}</th>
                    <th>{t("patientDetail.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {scopedAppointments.slice(0, 5).map((item) => (
                    <tr key={item.id}>
                      <td>{item.date}</td>
                      <td>{item.time}</td>
                      <td>{translateReason(item.reason, lang)}</td>
                      <td><StatusBadge status={item.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;
