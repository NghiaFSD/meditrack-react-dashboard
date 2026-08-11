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
      ? "System overview"
      : currentRole === ROLES.DOCTOR
        ? "Your clinical overview"
        : "Your personal overview";

  const dashboardDescription =
    currentRole === ROLES.PATIENT
      ? "See your own appointments, records and health summary."
      : currentRole === ROLES.DOCTOR
        ? "Track your assigned patients, appointments and records."
        : "Overview of patients, appointments and health records.";

  // Gom số lượng lịch hẹn theo status để vẽ chart.
  const appointmentStatusData = useMemo(() => {
    const statuses = ["Pending", "Approved", "Completed", "Cancelled"];

    return statuses.map((status) => ({
      status,
      total: scopedAppointments.filter((item) => item.status === status).length,
    }));
  }, [scopedAppointments]);

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
          title="Total Patients"
          value={scopedPatients.length}
          icon="🧑‍⚕️"
          note={
            currentRole === ROLES.ADMIN
              ? "Active patient profiles"
              : currentRole === ROLES.DOCTOR
                ? "Assigned patients"
                : "Your profile"
          }
        />
        <StatCard
          title="Total Doctors"
          value={currentRole === ROLES.PATIENT ? assignedDoctors.size : doctors.length}
          icon="👨‍⚕️"
          note={currentRole === ROLES.PATIENT ? "Your assigned doctors" : "Available doctors"}
        />
        <StatCard
          title="Today Appointments"
          value={todayAppointments.length}
          icon="📅"
          note={
            currentRole === ROLES.DOCTOR
              ? `${pendingAppointments.length} pending, ${approvedAppointments.length} approved`
              : currentRole === ROLES.PATIENT
                ? "Your schedule today"
                : "Scheduled today"
          }
        />
        <StatCard
          title="Medical Records"
          value={scopedRecords.length}
          icon="📋"
          note={currentRole === ROLES.PATIENT ? "Your records" : "Health records stored"}
        />
      </div>

      {currentRole === ROLES.ADMIN && (
        <>
          <div className="dashboard-grid">
            <HealthChart data={scopedRecords} />

            <div className="chart-card">
              <div className="section-title compact">
                <div>
                  <h3>Appointments by Status</h3>
                  <p>Distribution of appointment status</p>
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
                  <h3>Pending Approvals</h3>
                  <p>Appointments waiting for review</p>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Patient</th>
                    <th>Doctor</th>
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
                  <h3>Recent Appointments</h3>
                  <p>Latest appointment list</p>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {scopedAppointments.slice(0, 5).map((item) => (
                    <tr key={item.id}>
                      <td>{item.date}</td>
                      <td>{item.time}</td>
                      <td>{item.reason}</td>
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
                  <h3>My Patients</h3>
                  <p>Patients linked to your appointments and records</p>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Appointments</th>
                    <th>Records</th>
                    <th>Last Visit</th>
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
                  <h3>Today Queue</h3>
                  <p>Your appointments for today</p>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Patient</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAppointments.map((item) => (
                    <tr key={item.id}>
                      <td>{item.time}</td>
                      <td>{patients.find((patient) => Number(patient.id) === Number(item.patientId))?.fullName || "Unknown"}</td>
                      <td>{item.reason}</td>
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
                  <h3>Appointment Status</h3>
                  <p>Your workload by status</p>
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
                  <h3>Latest Records</h3>
                  <p>Recent records under your care</p>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Date</th>
                    <th>Glucose</th>
                    <th>Diagnosis</th>
                  </tr>
                </thead>
                <tbody>
                  {scopedRecords.slice(0, 5).map((record) => (
                    <tr key={record.id}>
                      <td>{patients.find((patient) => Number(patient.id) === Number(record.patientId))?.fullName || "Unknown"}</td>
                      <td>{record.date}</td>
                      <td>{record.glucose} mg/dL</td>
                      <td>{record.diagnosis}</td>
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
                  <h3>Health Summary</h3>
                  <p>Your latest medical values</p>
                </div>
              </div>

              {latestRecord ? (
                <div className="health-summary">
                  {patientHealthSummary.map((item) => (
                    <div key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <StatusBadge status={item.status.label} type={item.status.type} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">You do not have a medical record yet.</p>
              )}
            </div>

            <div className="table-card">
              <div className="section-title compact">
                <div>
                  <h3>Next Appointment</h3>
                  <p>Your upcoming schedule</p>
                </div>
              </div>

              {nextAppointment ? (
                <div className="health-summary">
                  <div>
                    <span>Date</span>
                    <strong>{nextAppointment.date}</strong>
                  </div>
                  <div>
                    <span>Time</span>
                    <strong>{nextAppointment.time}</strong>
                  </div>
                  <div>
                    <span>Doctor</span>
                    <strong>{doctors.find((doctor) => Number(doctor.id) === Number(nextAppointment.doctorId))?.fullName || "Unknown doctor"}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong>{nextAppointment.status}</strong>
                  </div>
                </div>
              ) : (
                <p className="text-muted">No upcoming appointment found.</p>
              )}
            </div>
          </div>

          <div className="dashboard-grid bottom">
            <div className="chart-card">
              <div className="section-title compact">
                <div>
                  <h3>My Records Trend</h3>
                  <p>Recent glucose trend for your profile</p>
                </div>
              </div>
              <HealthChart data={scopedRecords} />
            </div>

            <div className="table-card">
              <div className="section-title compact">
                <div>
                  <h3>My Appointments</h3>
                  <p>Latest appointment list</p>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {scopedAppointments.slice(0, 5).map((item) => (
                    <tr key={item.id}>
                      <td>{item.date}</td>
                      <td>{item.time}</td>
                      <td>{item.reason}</td>
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
