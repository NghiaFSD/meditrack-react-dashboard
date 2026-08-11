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
import { ROLES, getCurrentUser } from "../utils/auth";
import { useLanguage } from "../context/LanguageContext";

// Trang chi tiết bệnh nhân sử dụng route /patients/:id + i18n.
function PatientDetail() {
  const { id } = useParams();
  const { lang, t } = useLanguage();
  const currentUser = getCurrentUser();
  const canManage = currentUser?.role === ROLES.ADMIN || currentUser?.role === ROLES.DOCTOR;
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

  if (loading) return <Loading text={t("common.loading")} />;
  if (!patient) return <EmptyState title={lang === "vi" ? "Không tìm thấy bệnh nhân" : "Patient not found"} message={lang === "vi" ? "Bệnh nhân được chọn không tồn tại." : "The selected patient does not exist."} />;

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>{patient.fullName}</h1>
          <p>{t("patientDetail.subtitle")}</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {canManage && (
            <Link className="btn btn-primary" to={`/patients/${patient.id}/edit`}>
              {t("patientDetail.btnEdit")}
            </Link>
          )}
          <Link className="btn btn-secondary" to="/patients">{t("patientDetail.btnBack")}</Link>
        </div>
      </div>

      <div className="detail-grid">
        <div className="profile-card">
          <div className="profile-avatar">{patient.fullName.slice(0, 2).toUpperCase()}</div>
          <h2>{patient.fullName}</h2>
          <p>{patient.email}</p>
          <StatusBadge status={patient.status} />

          <div className="info-list">
            <div><span>{t("patientDetail.code")}</span><strong>{patient.patientCode || `PT-${String(patient.id).padStart(3, "0")}`}</strong></div>
            <div><span>{t("patientDetail.gender")}</span><strong>{patient.gender === "Male" ? t("patients.male") : t("patients.female")}</strong></div>
            <div><span>{t("patientDetail.age")}</span><strong>{patient.age}</strong></div>
            <div><span>{t("patientDetail.phone")}</span><strong>{patient.phone}</strong></div>
            <div><span>{t("patientDetail.address")}</span><strong>{patient.address}</strong></div>
            <div><span>{t("patientDetail.insurance")}</span><strong>{patient.insuranceType || "Standard"}</strong></div>
            <div><span>{t("patientDetail.riskLevel")}</span><strong>{patient.riskLevel || "Low"}</strong></div>
            <div><span>{t("patientDetail.lastVisit")}</span><strong>{patient.lastVisit || "-"}</strong></div>
          </div>
        </div>

        <div className="table-card">
          <div className="section-title compact">
            <div>
              <h3>{t("patientDetail.latestHealthStatus")}</h3>
              <p>{t("patientDetail.latestHealthSub")}</p>
            </div>
          </div>

          {latestRecord ? (
            <div className="health-summary">
              <div>
                <span>{t("patientDetail.glucose")}</span>
                <strong>{latestRecord.glucose} mg/dL</strong>
                <StatusBadge status={getGlucoseStatus(latestRecord.glucose).label} type={getGlucoseStatus(latestRecord.glucose).type} />
              </div>
              <div>
                <span>{t("patientDetail.hba1c")}</span>
                <strong>{latestRecord.hba1c}%</strong>
                <StatusBadge status={getHbA1cStatus(latestRecord.hba1c).label} type={getHbA1cStatus(latestRecord.hba1c).type} />
              </div>
              <div>
                <span>{t("patientDetail.bmi")}</span>
                <strong>{latestRecord.bmi}</strong>
              </div>
              <div>
                <span>{t("patientDetail.bloodPressure")}</span>
                <strong>{latestRecord.bloodPressure}</strong>
              </div>
            </div>
          ) : (
            <EmptyState title={t("patientDetail.noRecordTitle")} message={t("patientDetail.noRecordMsg")} />
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        <HealthChart data={records} />

        <div className="table-card">
          <div className="section-title compact">
            <div>
              <h3>{t("patientDetail.appointmentsTitle")}</h3>
              <p>{t("patientDetail.appointmentsSub")}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>{t("patientDetail.date")}</th>
                <th>{t("patientDetail.time")}</th>
                <th>{t("patientDetail.doctor")}</th>
                <th>{t("patientDetail.reason")}</th>
                <th>{t("patientDetail.status")}</th>
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
            <h3>{t("patientDetail.recordsTitle")}</h3>
            <p>{t("patientDetail.recordsSub")}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>{t("patientDetail.date")}</th>
              <th>{t("patientDetail.doctor")}</th>
              <th>{t("patientDetail.glucose")}</th>
              <th>{t("patientDetail.hba1c")}</th>
              <th>{t("patientDetail.bmi")}</th>
              <th>{t("patientDetail.bloodPressure")}</th>
              <th>{t("patientDetail.diagnosis")}</th>
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
