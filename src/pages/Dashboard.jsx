import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
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

// Dashboard tổng quan cho toàn hệ thống.
function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

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
  const todayAppointments = appointments.filter((item) => item.date === today);

  // Gom số lượng lịch hẹn theo status để vẽ chart.
  const appointmentStatusData = useMemo(() => {
    const statuses = ["Pending", "Approved", "Completed", "Cancelled"];

    return statuses.map((status) => ({
      status,
      total: appointments.filter((item) => item.status === status).length,
    }));
  }, [appointments]);

  const genderData = useMemo(() => {
    const male = patients.filter((patient) => patient.gender === "Male").length;
    const female = patients.filter((patient) => patient.gender === "Female").length;

    return [
      { name: "Male", value: male },
      { name: "Female", value: female },
    ];
  }, [patients]);

  if (loading) return <Loading text="Loading dashboard..." />;

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of patients, appointments and health records.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard title="Total Patients" value={patients.length} icon="🧑‍⚕️" note="Active patient profiles" />
        <StatCard title="Total Doctors" value={doctors.length} icon="👨‍⚕️" note="Available doctors" />
        <StatCard title="Today Appointments" value={todayAppointments.length} icon="📅" note="Scheduled today" />
        <StatCard title="Medical Records" value={records.length} icon="📋" note="Health records stored" />
      </div>

      <div className="dashboard-grid">
        <HealthChart data={records} />

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
        <div className="chart-card">
          <div className="section-title compact">
            <div>
              <h3>Patient Gender Ratio</h3>
              <p>Simple patient demographic chart</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={genderData} dataKey="value" nameKey="name" outerRadius={90} label>
                {genderData.map((entry, index) => (
                  <Cell key={entry.name} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
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
              {appointments.slice(0, 5).map((item) => (
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
    </div>
  );
}

export default Dashboard;
