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
  diagnosis: "",
  note: "",
};

// Trang quản lý hồ sơ bệnh án.
function MedicalRecords() {
  const { records, loading, fetchRecords } = useRecords();
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
      Swal.fire("Missing data", "Please fill patient, doctor, date and diagnosis.", "warning");
      return;
    }

    const selectedPatientId = Number(form.patientId);
    const selectedDoctorId = currentRole === ROLES.DOCTOR ? linkedDoctor?.id : Number(form.doctorId);
    const validPatient = patients.some((patient) => Number(patient.id) === Number(form.patientId));
    const validDoctor = doctors.some((doctor) => Number(doctor.id) === Number(form.doctorId));

    if (currentRole === ROLES.DOCTOR && !selectedDoctorId) {
      Swal.fire("Invalid data", "Unable to determine your doctor profile.", "warning");
      return;
    }

    if (!validPatient || !validDoctor) {
      Swal.fire("Invalid data", "Selected patient or doctor does not exist.", "warning");
      return;
    }

    if (Number(form.glucose) <= 0 || Number(form.hba1c) <= 0 || Number(form.bmi) <= 0) {
      Swal.fire("Invalid data", "Glucose, HbA1c and BMI must be greater than 0.", "warning");
      return;
    }

    if (!form.bloodPressure.trim() || !form.bloodPressure.includes("/")) {
      Swal.fire("Invalid data", "Blood pressure must be in the format systolic/diastolic.", "warning");
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
        Swal.fire("Updated", "Medical record updated successfully.", "success");
      } else {
        await recordApi.create(payload);
        Swal.fire("Created", "Medical record created successfully.", "success");
      }

      setIsModalOpen(false);
      fetchRecords();
    } catch (err) {
      Swal.fire("Error", "Cannot save medical record.", "error");
    }
  };

  const handleDelete = async (record) => {
    if (!canDelete) {
      Swal.fire("Forbidden", "Only admins can delete medical records.", "warning");
      return;
    }

    const result = await Swal.fire({
      title: "Delete record?",
      text: "This medical record will be removed.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#e11d48",
    });

    if (result.isConfirmed) {
      try {
        await recordApi.remove(record.id);
        Swal.fire("Deleted", "Medical record deleted successfully.", "success");
        fetchRecords();
      } catch (err) {
        Swal.fire("Error", "Cannot delete medical record.", "error");
      }
    }
  };

  if (loading) return <Loading text="Loading medical records..." />;

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>{currentRole === ROLES.PATIENT ? "My Medical Records" : "Medical Records"}</h1>
          <p>{currentRole === ROLES.PATIENT ? "View your own medical records." : "Track glucose, HbA1c, BMI, blood pressure and diagnosis."}</p>
        </div>
        {canCreate && <Button onClick={openAddModal}>+ New Record</Button>}
      </div>

      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search by patient, doctor or diagnosis..." />
      </div>

      <div className="table-card">
        {filteredRecords.length === 0 ? (
          <EmptyState title="No records" message="No medical records match your search." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Date</th>
                <th>Glucose</th>
                <th>HbA1c</th>
                <th>BMI</th>
                <th>Blood Pressure</th>
                <th>Diagnosis</th>
                <th>Action</th>
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
                    <td>{record.diagnosis}</td>
                    <td>
                      <div className="action-group">
                        {canEdit && <button onClick={() => openEditModal(record)}>Edit</button>}
                        {canDelete && <button className="danger" onClick={() => handleDelete(record)}>Delete</button>}
                        {!canEdit && !canDelete && <span className="text-muted">View only</span>}
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
        title={editingRecord ? "Edit Medical Record" : "New Medical Record"}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>Patient</label>
            {currentRole === ROLES.PATIENT ? (
              <>
                <input value={linkedPatient?.fullName || "Current patient"} disabled />
                <input type="hidden" name="patientId" value={linkedPatient?.id || ""} />
              </>
            ) : (
              <select name="patientId" value={form.patientId} onChange={handleChange}>
                <option value="">Select patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>{patient.fullName}</option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label>Doctor</label>
            {currentRole === ROLES.DOCTOR ? (
              <>
                <input value={linkedDoctor?.fullName || "Current doctor"} disabled />
                <input type="hidden" name="doctorId" value={linkedDoctor?.id || ""} />
              </>
            ) : (
              <select name="doctorId" value={form.doctorId} onChange={handleChange}>
                <option value="">Select doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>
                ))}
              </select>
            )}
          </div>

          <Input label="Date" name="date" type="date" value={form.date} onChange={handleChange} />
          <Input label="Glucose" name="glucose" type="number" value={form.glucose} onChange={handleChange} />
          <Input label="HbA1c" name="hba1c" type="number" value={form.hba1c} onChange={handleChange} />
          <Input label="BMI" name="bmi" type="number" value={form.bmi} onChange={handleChange} />
          <Input label="Blood Pressure" name="bloodPressure" value={form.bloodPressure} onChange={handleChange} placeholder="120/80" />
          <Input label="Diagnosis" name="diagnosis" value={form.diagnosis} onChange={handleChange} />

          <div className="form-group full-width">
            <label>Note</label>
            <textarea name="note" value={form.note} onChange={handleChange} rows="4" />
          </div>

          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default MedicalRecords;
