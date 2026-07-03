import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import Button from "../components/common/Button";
import EmptyState from "../components/common/EmptyState";
import Input from "../components/common/Input";
import Loading from "../components/common/Loading";
import Modal from "../components/common/Modal";
import SearchBox from "../components/common/SearchBox";
import StatusBadge from "../components/common/StatusBadge";
import { appointmentApi } from "../api/appointmentApi";
import { patientApi } from "../api/patientApi";
import { doctorApi } from "../api/doctorApi";
import { useAppointments } from "../hooks/useAppointments";

const emptyAppointment = {
  patientId: "",
  doctorId: "",
  date: "",
  time: "",
  reason: "",
  status: "Pending",
};

// Trang quản lý lịch hẹn.
function Appointments() {
  const { appointments, loading, fetchAppointments } = useAppointments();
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [form, setForm] = useState(emptyAppointment);

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

  const filteredAppointments = useMemo(() => {
    return appointments.filter((item) => {
      const patientName = getPatientName(item.patientId).toLowerCase();
      const doctorName = getDoctorName(item.doctorId).toLowerCase();
      const keyword = search.toLowerCase();

      const matchSearch =
        patientName.includes(keyword) ||
        doctorName.includes(keyword) ||
        item.reason.toLowerCase().includes(keyword);

      const matchStatus = statusFilter === "All" || item.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [appointments, patients, doctors, search, statusFilter]);

  const openAddModal = () => {
    setEditingAppointment(null);
    setForm(emptyAppointment);
    setIsModalOpen(true);
  };

  const openEditModal = (appointment) => {
    setEditingAppointment(appointment);
    setForm(appointment);
    setIsModalOpen(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.patientId || !form.doctorId || !form.date || !form.time || !form.reason.trim()) {
      Swal.fire("Missing data", "Please fill all appointment fields.", "warning");
      return;
    }

    const payload = {
      ...form,
      patientId: Number(form.patientId),
      doctorId: Number(form.doctorId),
    };

    try {
      if (editingAppointment) {
        await appointmentApi.update(editingAppointment.id, payload);
        Swal.fire("Updated", "Appointment updated successfully.", "success");
      } else {
        await appointmentApi.create(payload);
        Swal.fire("Created", "Appointment created successfully.", "success");
      }

      setIsModalOpen(false);
      fetchAppointments();
    } catch (err) {
      Swal.fire("Error", "Cannot save appointment.", "error");
    }
  };

  const handleDelete = async (appointment) => {
    const result = await Swal.fire({
      title: "Delete appointment?",
      text: "This appointment will be removed.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#e11d48",
    });

    if (result.isConfirmed) {
      await appointmentApi.remove(appointment.id);
      Swal.fire("Deleted", "Appointment deleted successfully.", "success");
      fetchAppointments();
    }
  };

  const handleQuickStatus = async (appointment, status) => {
    await appointmentApi.patchStatus(appointment.id, status);
    fetchAppointments();
  };

  if (loading) return <Loading text="Loading appointments..." />;

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>Appointments</h1>
          <p>Manage appointment booking and status.</p>
        </div>
        <Button onClick={openAddModal}>+ New Appointment</Button>
      </div>

      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search by patient, doctor or reason..." />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="All">All status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      <div className="table-card">
        {filteredAppointments.length === 0 ? (
          <EmptyState title="No appointments" message="No appointments match your filters." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Date</th>
                <th>Time</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((item) => (
                <tr key={item.id}>
                  <td>#{item.id}</td>
                  <td>{getPatientName(item.patientId)}</td>
                  <td>{getDoctorName(item.doctorId)}</td>
                  <td>{item.date}</td>
                  <td>{item.time}</td>
                  <td>{item.reason}</td>
                  <td><StatusBadge status={item.status} /></td>
                  <td>
                    <div className="action-group wrap">
                      <button onClick={() => openEditModal(item)}>Edit</button>
                      <button onClick={() => handleQuickStatus(item, "Approved")}>Approve</button>
                      <button onClick={() => handleQuickStatus(item, "Completed")}>Complete</button>
                      <button className="danger" onClick={() => handleDelete(item)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        title={editingAppointment ? "Edit Appointment" : "New Appointment"}
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
                <option key={doctor.id} value={doctor.id}>{doctor.fullName} - {doctor.specialization}</option>
              ))}
            </select>
          </div>

          <Input label="Date" name="date" type="date" value={form.date} onChange={handleChange} />
          <Input label="Time" name="time" type="time" value={form.time} onChange={handleChange} />
          <Input label="Reason" name="reason" value={form.reason} onChange={handleChange} />

          <div className="form-group">
            <label>Status</label>
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
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

export default Appointments;
