import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import Button from "../components/common/Button";
import EmptyState from "../components/common/EmptyState";
import Input from "../components/common/Input";
import Loading from "../components/common/Loading";
import Modal from "../components/common/Modal";
import SearchBox from "../components/common/SearchBox";
import StatusBadge from "../components/common/StatusBadge";
import { recordApi } from "../api/recordApi";
import { patientApi } from "../api/patientApi";
import { doctorApi } from "../api/doctorApi";
import { useRecords } from "../hooks/useRecords";
import { ROLES, findLinkedDoctor, findLinkedPatient, getCurrentUser } from "../utils/auth";
import { useLanguage } from "../context/LanguageContext";
import { translateDiagnosis, translateRiskLevel } from "../utils/dataTranslations";
import {
  getBloodPressureStatus,
  getBmiStatus,
  getGlucoseStatus,
  getHbA1cStatus,
} from "../utils/healthStatus";

const emptyRecord = {
  patientId: "",
  doctorId: "",
  date: "",
  glucose: "",
  hba1c: "",
  bmi: "",
  bloodPressure: "",
  riskLevel: "Low",
  followUpDate: "",
  diagnosis: "",
  note: "",
};

// Trang quản lý hồ sơ bệnh án + i18n.
function MedicalRecords() {
  const { records, loading, fetchRecords } = useRecords();
  const { lang, t } = useLanguage();
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const currentUser = getCurrentUser();
  const currentRole = currentUser?.role;
  const linkedPatient = useMemo(() => findLinkedPatient(patients, currentUser), [patients, currentUser]);
  const linkedDoctor = useMemo(() => findLinkedDoctor(doctors, currentUser), [doctors, currentUser]);
  const canCreate = [ROLES.ADMIN, ROLES.DOCTOR].includes(currentRole);
  const canEdit = [ROLES.ADMIN, ROLES.DOCTOR].includes(currentRole);
  const canDelete = currentRole === ROLES.ADMIN;
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState(emptyRecord);

  useEffect(() => {
    async function fetchReferences() {
      const [patientData, doctorData] = await Promise.all([
        patientApi.getAll(),
        doctorApi.getAll(),
      ]);
      setPatients(patientData);
      setDoctors(doctorData);
    }

    fetchReferences();
  }, []);

  const getPatientName = (patientId) => {
    return patients.find((patient) => Number(patient.id) === Number(patientId))?.fullName || "Unknown patient";
  };

  const getDoctorName = (doctorId) => {
    return doctors.find((doctor) => Number(doctor.id) === Number(doctorId))?.fullName || "Unknown doctor";
  };

  const filteredRecords = useMemo(() => {
    const scopedRecords = records.filter((record) => {
      if (currentRole === ROLES.PATIENT && linkedPatient) {
        return Number(record.patientId) === Number(linkedPatient.id);
      }

      if (currentRole === ROLES.DOCTOR && linkedDoctor) {
        return Number(record.doctorId) === Number(linkedDoctor.id);
      }

      return true;
    });

    return scopedRecords.filter((record) => {
      const keyword = search.toLowerCase();
      return (
        getPatientName(record.patientId).toLowerCase().includes(keyword) ||
        getDoctorName(record.doctorId).toLowerCase().includes(keyword) ||
        record.diagnosis.toLowerCase().includes(keyword)
      );
    });
  }, [records, patients, doctors, search, currentRole, linkedPatient, linkedDoctor]);

  const openAddModal = () => {
    if (!canCreate) return;
    setEditingRecord(null);
    setForm(
      currentRole === ROLES.DOCTOR && linkedDoctor
        ? { ...emptyRecord, doctorId: linkedDoctor.id }
        : emptyRecord
    );
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
    if (!canEdit) return;
    setEditingRecord(record);
    setForm(record);
    setIsModalOpen(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.patientId || !form.doctorId || !form.date || !form.diagnosis.trim()) {
      Swal.fire(t("patients.valInvalidData"), lang === "vi" ? "Vui lòng chọn bệnh nhân, bác sĩ, ngày khám và chẩn đoán." : "Please fill patient, doctor, date and diagnosis.", "warning");
      return;
    }

    const selectedPatientId = Number(form.patientId);
    const selectedDoctorId = currentRole === ROLES.DOCTOR ? linkedDoctor?.id : Number(form.doctorId);
    const validPatient = patients.some((patient) => Number(patient.id) === Number(form.patientId));
    const validDoctor = doctors.some((doctor) => Number(doctor.id) === Number(form.doctorId));

    if (currentRole === ROLES.DOCTOR && !selectedDoctorId) {
      Swal.fire(t("patients.valInvalidData"), lang === "vi" ? "Không thể xác định hồ sơ bác sĩ của bạn." : "Unable to determine your doctor profile.", "warning");
      return;
    }

    if (!validPatient || !validDoctor) {
      Swal.fire(t("patients.valInvalidData"), lang === "vi" ? "Bệnh nhân hoặc bác sĩ được chọn không tồn tại." : "Selected patient or doctor does not exist.", "warning");
      return;
    }

    if (Number(form.glucose) <= 0 || Number(form.hba1c) <= 0 || Number(form.bmi) <= 0) {
      Swal.fire(t("patients.valInvalidData"), lang === "vi" ? "Chỉ số Glucose, HbA1c và BMI phải lớn hơn 0." : "Glucose, HbA1c and BMI must be greater than 0.", "warning");
      return;
    }

    if (!form.bloodPressure.trim() || !form.bloodPressure.includes("/")) {
      Swal.fire(t("patients.valInvalidData"), t("records.valBpFormat"), "warning");
      return;
    }

    const payload = {
      ...form,
      patientId: Number(selectedPatientId),
      doctorId: Number(selectedDoctorId),
      glucose: Number(form.glucose),
      hba1c: Number(form.hba1c),
      bmi: Number(form.bmi),
    };

    try {
      if (editingRecord) {
        await recordApi.update(editingRecord.id, payload);
        Swal.fire(t("patientEdit.updateSuccessTitle"), t("records.valUpdated"), "success");
      } else {
        await recordApi.create(payload);
        Swal.fire(lang === "vi" ? "Thành công" : "Created", t("records.valCreated"), "success");
      }

      setIsModalOpen(false);
      fetchRecords();
    } catch (err) {
      Swal.fire(t("patientEdit.updateErrorTitle"), t("records.valSaveError"), "error");
    }
  };

  const handleDelete = async (record) => {
    if (!canDelete) {
      Swal.fire(t("common.forbidden"), t("common.onlyAdminsCanDelete"), "warning");
      return;
    }

    const result = await Swal.fire({
      title: t("records.deleteConfirmTitle"),
      text: t("records.deleteConfirmText"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t("patients.btnDelete"),
      cancelButtonText: t("patients.btnCancel"),
      confirmButtonColor: "#e11d48",
    });

    if (result.isConfirmed) {
      try {
        await recordApi.remove(record.id);
        Swal.fire(t("patients.deleteSuccessTitle"), t("records.deleteSuccessText"), "success");
        fetchRecords();
      } catch (err) {
        Swal.fire(t("patientEdit.updateErrorTitle"), lang === "vi" ? "Không thể xóa hồ sơ bệnh án." : "Cannot delete medical record.", "error");
      }
    }
  };

  if (loading) return <Loading text={t("common.loading")} />;

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>{currentRole === ROLES.PATIENT ? t("records.titleMy") : t("records.title")}</h1>
          <p>{currentRole === ROLES.PATIENT ? t("records.subtitleView") : t("records.subtitleAdmin")}</p>
        </div>
        {canCreate && <Button onClick={openAddModal}>{t("records.addBtn")}</Button>}
      </div>

      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder={t("records.searchPlaceholder")} />
      </div>

      <div className="table-card">
        {filteredRecords.length === 0 ? (
          <EmptyState title={t("records.noRecords")} message={t("records.noRecordsMsg")} />
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t("patients.tableId")}</th>
                <th>{t("records.tablePatient")}</th>
                <th>{t("records.tableDoctor")}</th>
                <th>{t("records.tableDate")}</th>
                <th>{t("records.tableGlucose")}</th>
                <th>{t("records.tableHbA1c")}</th>
                <th>{t("records.tableBMI")}</th>
                <th>{t("records.tableBP")}</th>
                <th>{t("patients.tableRisk")}</th>
                <th>{t("patients.tableLastVisit")}</th>
                <th>{t("records.tableDiagnosis")}</th>
                <th>{t("patients.tableAction")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const glucoseStatus = getGlucoseStatus(record.glucose);
                const hba1cStatus = getHbA1cStatus(record.hba1c);
                const bmiStatus = getBmiStatus(record.bmi);
                const bpStatus = getBloodPressureStatus(record.bloodPressure);

                return (
                  <tr key={record.id}>
                    <td>#{record.id}</td>
                    <td>{getPatientName(record.patientId)}</td>
                    <td>{getDoctorName(record.doctorId)}</td>
                    <td>{record.date}</td>
                    <td>
                      {record.glucose} mg/dL<br />
                      <StatusBadge status={glucoseStatus.label} type={glucoseStatus.type} />
                    </td>
                    <td>
                      {record.hba1c}%<br />
                      <StatusBadge status={hba1cStatus.label} type={hba1cStatus.type} />
                    </td>
                    <td>
                      {record.bmi}<br />
                      <StatusBadge status={bmiStatus.label} type={bmiStatus.type} />
                    </td>
                    <td>
                      {record.bloodPressure}<br />
                      <StatusBadge status={bpStatus.label} type={bpStatus.type} />
                    </td>
                    <td><StatusBadge status={record.riskLevel || "Low"} /></td>
                    <td>{record.followUpDate || "-"}</td>
                    <td>{translateDiagnosis(record.diagnosis, lang)}</td>
                    <td>
                      <div className="action-group">
                        {canEdit && <button onClick={() => openEditModal(record)}>{t("patients.btnEdit")}</button>}
                        {canDelete && <button className="danger" onClick={() => handleDelete(record)}>{t("patients.btnDelete")}</button>}
                        {!canEdit && !canDelete && <span className="text-muted">{t("dashboard.viewOnly")}</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        title={editingRecord ? t("records.modalEditTitle") : t("records.modalAddTitle")}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>{t("records.lblPatient")}</label>
            {currentRole === ROLES.PATIENT ? (
              <>
                <input value={linkedPatient?.fullName || (lang === "vi" ? "Bệnh nhân hiện tại" : "Current patient")} disabled />
                <input type="hidden" name="patientId" value={linkedPatient?.id || ""} />
              </>
            ) : (
              <select name="patientId" value={form.patientId} onChange={handleChange}>
                <option value="">{lang === "vi" ? "-- Chọn bệnh nhân --" : "-- Select patient --"}</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>{patient.fullName}</option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label>{t("records.lblDoctor")}</label>
            {currentRole === ROLES.DOCTOR ? (
              <>
                <input value={linkedDoctor?.fullName || (lang === "vi" ? "Bác sĩ hiện tại" : "Current doctor")} disabled />
                <input type="hidden" name="doctorId" value={linkedDoctor?.id || ""} />
              </>
            ) : (
              <select name="doctorId" value={form.doctorId} onChange={handleChange}>
                <option value="">{lang === "vi" ? "-- Chọn bác sĩ --" : "-- Select doctor --"}</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>
                ))}
              </select>
            )}
          </div>

          <Input label={t("records.lblDate")} name="date" type="date" value={form.date} onChange={handleChange} />
          <Input label={t("records.lblGlucose")} name="glucose" type="number" value={form.glucose} onChange={handleChange} />
          <Input label={t("records.lblHbA1c")} name="hba1c" type="number" value={form.hba1c} onChange={handleChange} />
          <Input label={t("records.lblBMI")} name="bmi" type="number" value={form.bmi} onChange={handleChange} />
          <Input label={t("records.lblBP")} name="bloodPressure" value={form.bloodPressure} onChange={handleChange} placeholder="120/80" />
          <div className="form-group">
            <label>{t("records.lblRisk")}</label>
            <select name="riskLevel" value={form.riskLevel} onChange={handleChange}>
              <option value="Low">{t("common.riskLow")}</option>
              <option value="Medium">{t("common.riskMedium")}</option>
              <option value="High">{t("common.riskHigh")}</option>
            </select>
          </div>
          <Input label={t("records.lblFollowUp")} name="followUpDate" type="date" value={form.followUpDate} onChange={handleChange} />
          <Input label={t("records.lblDiagnosis")} name="diagnosis" value={form.diagnosis} onChange={handleChange} />

          <div className="form-group full-width">
            <label>{t("records.lblNote")}</label>
            <textarea name="note" value={form.note} onChange={handleChange} rows="4" />
          </div>

          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>{t("patients.btnCancel")}</Button>
            <Button type="submit">{t("patients.btnSave")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default MedicalRecords;
