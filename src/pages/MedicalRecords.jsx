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
    return records.filter((record) => {
      const keyword = search.toLowerCase();
      return (
        getPatientName(record.patientId).toLowerCase().includes(keyword) ||
        getDoctorName(record.doctorId).toLowerCase().includes(keyword) ||
        record.diagnosis.toLowerCase().includes(keyword)
      );
    });
  }, [records, patients, doctors, search]);

  const openAddModal = () => {
    setEditingRecord(null);
    setForm(emptyRecord);
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
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

    const payload = {
      ...form,
      patientId: Number(form.patientId),
      doctorId: Number(form.doctorId),
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
    const result = await Swal.fire({
      title: "Delete record?",
      text: "This medical record will be removed.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#e11d48",
    });

    if (result.isConfirmed) {
      await recordApi.remove(record.id);
      Swal.fire("Deleted", "Medical record deleted successfully.", "success");
      fetchRecords();
    }
  };

  if (loading) return <Loading text="Loading medical records..." />;

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>Medical Records</h1>
          <p>Track glucose, HbA1c, BMI, blood pressure and diagnosis.</p>
        </div>
        <Button onClick={openAddModal}>+ New Record</Button>
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
                        <button onClick={() => openEditModal(record)}>Edit</button>
                        <button className="danger" onClick={() => handleDelete(record)}>Delete</button>
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
            <select name="patientId" value={form.patientId} onChange={handleChange}>
              <option value="">Select patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.fullName}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Doctor</label>
            <select name="doctorId" value={form.doctorId} onChange={handleChange}>
              <option value="">Select doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>
              ))}
            </select>
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
