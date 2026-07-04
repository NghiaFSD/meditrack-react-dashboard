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
import { ROLES, findLinkedPatient, findLinkedDoctor, getCurrentUser } from "../utils/auth";

const emptyAppointment = {
  patientId: "",
  doctorId: "",
  date: "",
  time: "",
  reason: "",
  channel: "Clinic",
  priority: "Normal",
  status: "Pending",
};

const LAST_APPOINTMENT_KEYS = {
  patientId: "meditrack:lastAppointmentPatientId",
  doctorId: "meditrack:lastAppointmentDoctorId",
  status: "meditrack:lastAppointmentStatus",
};

function readLastAppointmentDefaults() {
  try {
    return {
      patientId: sessionStorage.getItem(LAST_APPOINTMENT_KEYS.patientId) || "",
      doctorId: sessionStorage.getItem(LAST_APPOINTMENT_KEYS.doctorId) || "",
      status: sessionStorage.getItem(LAST_APPOINTMENT_KEYS.status) || "Pending",
    };
  } catch (error) {
    return { patientId: "", doctorId: "", status: "Pending" };
  }
}

function getNextAppointmentId(items) {
  const highestNumericId = items.reduce((highest, item) => {
    const numericId = Number(item.id);
    return Number.isFinite(numericId) && numericId > highest ? numericId : highest;
  }, 0);

  return String(highestNumericId + 1);
}

function hasAppointmentPassed(appointment) {
  if (!appointment?.date || !appointment?.time) return false;

  const visitAt = new Date(`${appointment.date}T${appointment.time}:00`);
  if (Number.isNaN(visitAt.getTime())) return false;

  return new Date() >= visitAt;
}

function getRowActions(appointment, currentRole) {
  const isPending = appointment.status === "Pending";
  const isApproved = appointment.status === "Approved";
  const isFinalState = appointment.status === "Completed" || appointment.status === "Cancelled";

  if (currentRole === ROLES.PATIENT) {
    return isPending ? [{ label: "Cancel", kind: "status", value: "Cancelled", tone: "danger" }] : [];
  }

  const statusActions = [];

  if (isPending) {
    statusActions.push(
      { label: "Approve", kind: "status", value: "Approved", tone: "primary" },
      { label: "Cancel", kind: "status", value: "Cancelled", tone: "danger" }
    );
  }

  if (isApproved) {
    const canCompleteNow = hasAppointmentPassed(appointment);
    statusActions.push(
      {
        label: "Complete",
        kind: "status",
        value: "Completed",
        tone: "primary",
        disabled: !canCompleteNow,
        disabledReason: "Can only complete after appointment time has passed.",
      },
      { label: "Cancel", kind: "status", value: "Cancelled", tone: "danger" }
    );
  }

  if (currentRole === ROLES.ADMIN && isFinalState) {
    statusActions.push({ label: "Edit", kind: "edit", tone: "primary" });
  }

  return statusActions;
}

// Trang quản lý lịch hẹn.
function Appointments() {
  const { appointments, loading, fetchAppointments } = useAppointments();
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const currentUser = getCurrentUser();
  const currentRole = currentUser?.role;
  const linkedPatient = useMemo(() => findLinkedPatient(patients, currentUser), [patients, currentUser]);
  const linkedDoctor = useMemo(() => findLinkedDoctor(doctors, currentUser), [doctors, currentUser]);
  const canCreate = [ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT].includes(currentRole);
  const canEdit = currentRole === ROLES.ADMIN;
  const canDelete = currentRole === ROLES.ADMIN;
  const canQuickStatus = [ROLES.ADMIN, ROLES.DOCTOR].includes(currentRole);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [form, setForm] = useState(emptyAppointment);

  const patientDoctorOptions = useMemo(() => {
    if (currentRole !== ROLES.PATIENT || !linkedPatient) {
      return doctors;
    }

    const doctorIds = new Set(
      appointments
        .filter((item) => Number(item.patientId) === Number(linkedPatient.id))
        .map((item) => Number(item.doctorId))
    );

    const matchedDoctors = doctors.filter((doctor) => doctorIds.has(Number(doctor.id)));

    return matchedDoctors.length > 0 ? matchedDoctors : doctors;
  }, [appointments, doctors, currentRole, linkedPatient]);

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
    const scopedAppointments = appointments.filter((item) => {
      if (currentRole === ROLES.PATIENT && linkedPatient) {
        return Number(item.patientId) === Number(linkedPatient.id);
      }

      if (currentRole === ROLES.DOCTOR && linkedDoctor) {
        return Number(item.doctorId) === Number(linkedDoctor.id);
      }

      return true;
    });

    return scopedAppointments.filter((item) => {
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
  }, [appointments, patients, doctors, search, statusFilter, currentRole, linkedPatient, linkedDoctor]);

  const openAddModal = () => {
    if (!canCreate) return;
    setEditingAppointment(null);
    if (currentRole === ROLES.PATIENT && linkedPatient) {
      setForm({
        ...emptyAppointment,
        patientId: linkedPatient.id,
        doctorId: patientDoctorOptions[0]?.id || "",
        status: "Pending",
      });
      setIsModalOpen(true);
      return;
    }

    if (currentRole === ROLES.ADMIN) {
      const lastDefaults = readLastAppointmentDefaults();
      const selectedPatientId = patients.some((patient) => String(patient.id) === String(lastDefaults.patientId))
        ? lastDefaults.patientId
        : patients[0]?.id || "";
      const selectedDoctorId = doctors.some((doctor) => String(doctor.id) === String(lastDefaults.doctorId))
        ? lastDefaults.doctorId
        : doctors[0]?.id || "";

      setForm({
        ...emptyAppointment,
        patientId: selectedPatientId,
        doctorId: selectedDoctorId,
        status: lastDefaults.status === "Approved" || lastDefaults.status === "Completed" || lastDefaults.status === "Cancelled"
          ? lastDefaults.status
          : "Pending",
      });
      setIsModalOpen(true);
      return;
    }

    setForm(emptyAppointment);
    setIsModalOpen(true);
  };

  const openEditModal = (appointment) => {
    if (!canEdit) return;
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

    const selectedPatientId = currentRole === ROLES.PATIENT ? linkedPatient?.id : Number(form.patientId);
    const validPatient = patients.some((patient) => Number(patient.id) === Number(form.patientId));
    const allowedDoctorList = currentRole === ROLES.PATIENT ? patientDoctorOptions : doctors;
    const validDoctor = allowedDoctorList.some((doctor) => Number(doctor.id) === Number(form.doctorId));

    if (currentRole === ROLES.PATIENT && !selectedPatientId) {
      Swal.fire("Invalid data", "Unable to determine your patient profile.", "warning");
      return;
    }

    if (!validPatient || !validDoctor) {
      Swal.fire("Invalid data", "Selected patient or doctor does not exist.", "warning");
      return;
    }

    const payload = {
      ...form,
      id: editingAppointment ? editingAppointment.id : getNextAppointmentId(appointments),
      patientId: Number(selectedPatientId),
      doctorId: Number(form.doctorId),
      status: currentRole === ROLES.PATIENT ? "Pending" : form.status,
    };

    try {
      if (editingAppointment) {
        await appointmentApi.update(editingAppointment.id, payload);
        Swal.fire("Updated", "Appointment updated successfully.", "success");
      } else {
        await appointmentApi.create(payload);
        Swal.fire("Created", "Appointment created successfully.", "success");
      }

      if (currentRole === ROLES.ADMIN) {
        sessionStorage.setItem(LAST_APPOINTMENT_KEYS.patientId, String(payload.patientId));
        sessionStorage.setItem(LAST_APPOINTMENT_KEYS.doctorId, String(payload.doctorId));
        sessionStorage.setItem(LAST_APPOINTMENT_KEYS.status, String(payload.status));
      }

      setIsModalOpen(false);
      fetchAppointments();
    } catch (err) {
      Swal.fire("Error", "Cannot save appointment.", "error");
    }
  };

  const handleDelete = async (appointment) => {
    if (!canDelete) {
      Swal.fire("Forbidden", "Only admins can delete appointments.", "warning");
      return;
    }

    const result = await Swal.fire({
      title: "Delete appointment?",
      text: "This appointment will be removed.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#e11d48",
    });

    if (result.isConfirmed) {
      try {
        await appointmentApi.remove(appointment.id);
        Swal.fire("Deleted", "Appointment deleted successfully.", "success");
        fetchAppointments();
      } catch (err) {
        Swal.fire("Error", "Cannot delete appointment.", "error");
      }
    }
  };

  const handleQuickStatus = async (appointment, status) => {
    if (!canQuickStatus) {
      Swal.fire("Forbidden", "Only admins and doctors can change appointment status.", "warning");
      return;
    }

    if (status === "Completed" && !hasAppointmentPassed(appointment)) {
      Swal.fire("Not allowed", "You can only complete an appointment after its scheduled time has passed.", "warning");
      return;
    }

    try {
      await appointmentApi.patchStatus(appointment.id, status);
      fetchAppointments();
    } catch (err) {
      Swal.fire("Error", "Cannot update appointment status.", "error");
    }
  };

  if (loading) return <Loading text="Loading appointments..." />;

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>{currentRole === ROLES.PATIENT ? "My Appointments" : "Appointments"}</h1>
          <p>
            {currentRole === ROLES.PATIENT
              ? "Submit appointment requests. Every request stays Pending until approved."
              : "Manage appointment booking and status."}
          </p>
        </div>
        {canCreate && (
          <Button onClick={openAddModal}>
            {currentRole === ROLES.PATIENT ? "+ Request Appointment" : "+ New Appointment"}
          </Button>
        )}
      </div>

      {currentRole === ROLES.PATIENT && (
        <div className="workflow-note">
          <strong>Patient booking mode:</strong>
          <span>
            You can only book with doctors from your previous care history. New requests are always created as Pending and must be approved by staff.
          </span>
        </div>
      )}

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
                <th>No.</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Date</th>
                <th>Time</th>
                <th>Reason</th>
                <th>Channel</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((item, index) => {
                const rowActions = getRowActions(item, currentRole);

                return (
                <tr key={item.id}>
                  <td>#{index + 1}</td>
                  <td>{getPatientName(item.patientId)}</td>
                  <td>{getDoctorName(item.doctorId)}</td>
                  <td>{item.date}</td>
                  <td>{item.time}</td>
                  <td>{item.reason}</td>
                  <td>{item.channel || "Clinic"}</td>
                  <td>{item.priority || "Normal"}</td>
                  <td><StatusBadge status={item.status} /></td>
                  <td>
                    <div className="action-group appointment-actions">
                      {rowActions.length > 0 ? (
                        rowActions.map((action) =>
                          action.kind === "edit" ? (
                            <button key={action.label} onClick={() => openEditModal(item)}>{action.label}</button>
                          ) : (
                            <button
                              key={action.label}
                              className={action.tone === "danger" ? "danger" : ""}
                              disabled={Boolean(action.disabled)}
                              title={action.disabled ? action.disabledReason : ""}
                              onClick={() => handleQuickStatus(item, action.value)}
                            >
                              {action.label}
                            </button>
                          )
                        )
                      ) : (
                        <span className="text-muted">View only</span>
                      )}
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
        title={editingAppointment ? "Edit Appointment" : "New Appointment"}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label htmlFor="appointment-patient">Patient</label>
            {currentRole === ROLES.PATIENT ? (
              <>
                <input id="appointment-patient" value={linkedPatient?.fullName || "Current patient"} disabled />
                <input type="hidden" name="patientId" value={linkedPatient?.id || ""} />
              </>
            ) : (
              <select id="appointment-patient" name="patientId" value={form.patientId} onChange={handleChange}>
                <option value="">Select patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>{patient.fullName}</option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="appointment-doctor">Doctor</label>
            {currentRole === ROLES.DOCTOR ? (
              <>
                <input id="appointment-doctor" value={linkedDoctor?.fullName || "Current doctor"} disabled />
                <input type="hidden" name="doctorId" value={linkedDoctor?.id || ""} />
              </>
            ) : currentRole === ROLES.PATIENT ? (
              <select id="appointment-doctor" name="doctorId" value={form.doctorId} onChange={handleChange}>
                <option value="">Select doctor</option>
                {patientDoctorOptions.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>{doctor.fullName} - {doctor.specialization}</option>
                ))}
              </select>
            ) : (
              <select id="appointment-doctor" name="doctorId" value={form.doctorId} onChange={handleChange}>
                <option value="">Select doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>{doctor.fullName} - {doctor.specialization}</option>
                ))}
              </select>
            )}
            {currentRole === ROLES.ADMIN && (
              <small className="form-hint">Admin can choose any active patient and doctor.</small>
            )}
            {currentRole === ROLES.PATIENT && (
              <small className="form-hint">Only doctors from your previous care history are shown here.</small>
            )}
          </div>

          <Input label="Date" name="date" type="date" value={form.date} onChange={handleChange} />
          <Input label="Time" name="time" type="time" value={form.time} onChange={handleChange} />
          <Input label="Reason" name="reason" value={form.reason} onChange={handleChange} />

          <div className="form-group">
            <label htmlFor="appointment-channel">Channel</label>
            <select id="appointment-channel" name="channel" value={form.channel} onChange={handleChange}>
              <option value="Clinic">Clinic</option>
              <option value="Online">Online</option>
              <option value="Walk-in">Walk-in</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="appointment-priority">Priority</label>
            <select id="appointment-priority" name="priority" value={form.priority} onChange={handleChange}>
              <option value="Low">Low</option>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="appointment-status">Status</label>
            {currentRole === ROLES.PATIENT ? (
              <input id="appointment-status" value="Pending" disabled />
            ) : (
              <select id="appointment-status" name="status" value={form.status} onChange={handleChange}>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            )}
            {currentRole === ROLES.PATIENT && <small className="form-hint">New patient requests are always created as Pending.</small>}
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
