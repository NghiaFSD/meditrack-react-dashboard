import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Loading from "../components/common/Loading";
import EmptyState from "../components/common/EmptyState";
import StatusBadge from "../components/common/StatusBadge";
import HealthChart from "../components/dashboard/HealthChart";
import { patientApi } from "../api/patientApi";
import { appointmentApi } from "../api/appointmentApi";
import { recordApi } from "../api/recordApi";
import { doctorApi } from "../api/doctorApi";
import { getGlucoseStatus, getHbA1cStatus } from "../utils/healthStatus";

// Trang chi tiết bệnh nhân sử dụng route /patients/:id.
function PatientDetail() {
  const { id } = useParams();
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
    return doctors.find((doctor) => Number(doctor.id) === Number(doctorId))?.fullName || "Unknown doctor";
  };

  if (loading) return <Loading text="Loading patient detail..." />;
  if (!patient) return <EmptyState title="Patient not found" message="The selected patient does not exist." />;

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>{patient.fullName}</h1>
          <p>Patient profile, appointments and medical records.</p>
        </div>
        <Link className="btn btn-secondary" to="/patients">← Back</Link>
      </div>

      <div className="detail-grid">
        <div className="profile-card">
          <div className="profile-avatar">{patient.fullName.slice(0, 2).toUpperCase()}</div>
          <h2>{patient.fullName}</h2>
          <p>{patient.email}</p>
          <StatusBadge status={patient.status} />

          <div className="info-list">
            <div><span>Code</span><strong>{patient.patientCode || `PT-${String(patient.id).padStart(3, "0")}`}</strong></div>
            <div><span>Gender</span><strong>{patient.gender}</strong></div>
            <div><span>Age</span><strong>{patient.age}</strong></div>
            <div><span>Phone</span><strong>{patient.phone}</strong></div>
            <div><span>Address</span><strong>{patient.address}</strong></div>
            <div><span>Insurance</span><strong>{patient.insuranceType || "Standard"}</strong></div>
            <div><span>Risk Level</span><strong>{patient.riskLevel || "Low"}</strong></div>
            <div><span>Last Visit</span><strong>{patient.lastVisit || "-"}</strong></div>
          </div>
        </div>

        <div className="table-card">
          <div className="section-title compact">
            <div>
              <h3>Latest Health Status</h3>
              <p>Based on the latest medical record</p>
            </div>
          </div>

          {latestRecord ? (
            <div className="health-summary">
              <div>
                <span>Glucose</span>
                <strong>{latestRecord.glucose} mg/dL</strong>
                <StatusBadge status={getGlucoseStatus(latestRecord.glucose).label} type={getGlucoseStatus(latestRecord.glucose).type} />
              </div>
              <div>
                <span>HbA1c</span>
                <strong>{latestRecord.hba1c}%</strong>
                <StatusBadge status={getHbA1cStatus(latestRecord.hba1c).label} type={getHbA1cStatus(latestRecord.hba1c).type} />
              </div>
              <div>
                <span>BMI</span>
                <strong>{latestRecord.bmi}</strong>
              </div>
              <div>
                <span>Blood Pressure</span>
                <strong>{latestRecord.bloodPressure}</strong>
              </div>
            </div>
          ) : (
            <EmptyState title="No record" message="This patient has no medical record yet." />
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        <HealthChart data={records} />

        <div className="table-card">
          <div className="section-title compact">
            <div>
              <h3>Appointments</h3>
              <p>Appointments of this patient</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Doctor</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((item) => (
                <tr key={item.id}>
                  <td>{item.date}</td>
                  <td>{item.time}</td>
                  <td>{getDoctorName(item.doctorId)}</td>
                  <td>{item.reason}</td>
                  <td><StatusBadge status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-card">
        <div className="section-title compact">
          <div>
            <h3>Medical Records</h3>
            <p>Patient health record history</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Doctor</th>
              <th>Glucose</th>
              <th>HbA1c</th>
              <th>BMI</th>
              <th>Blood Pressure</th>
              <th>Diagnosis</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td>{record.date}</td>
                <td>{getDoctorName(record.doctorId)}</td>
                <td>{record.glucose}</td>
                <td>{record.hba1c}</td>
                <td>{record.bmi}</td>
                <td>{record.bloodPressure}</td>
                <td>{record.diagnosis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PatientDetail;
