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
import { useLanguage } from "../context/LanguageContext";
import { translateReason } from "../utils/dataTranslations";

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
  const { lang, t } = useLanguage();
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
      Swal.fire(t("patients.valInvalidData"), lang === "vi" ? "Không thể xác định hồ sơ bệnh nhân của bạn." : "Unable to determine your patient profile.", "warning");
      return;
    }

    if (!validPatient || !validDoctor) {
      Swal.fire(t("patients.valInvalidData"), lang === "vi" ? "Bệnh nhân hoặc Bác sĩ được chọn không tồn tại." : "Selected patient or doctor does not exist.", "warning");
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
        Swal.fire(t("patientEdit.updateSuccessTitle"), t("appointments.valUpdated"), "success");
      } else {
        await appointmentApi.create(payload);
        Swal.fire(lang === "vi" ? "Thành công" : "Created", t("appointments.valCreated"), "success");
      }

      if (currentRole === ROLES.ADMIN) {
        sessionStorage.setItem(LAST_APPOINTMENT_KEYS.patientId, String(payload.patientId));
        sessionStorage.setItem(LAST_APPOINTMENT_KEYS.doctorId, String(payload.doctorId));
        sessionStorage.setItem(LAST_APPOINTMENT_KEYS.status, String(payload.status));
      }

      setIsModalOpen(false);
      fetchAppointments();
    } catch (err) {
      Swal.fire(t("patientEdit.updateErrorTitle"), t("appointments.valSaveError"), "error");
    }
  };

  const handleDelete = async (appointment) => {
    if (!canDelete) {
      Swal.fire(t("common.forbidden"), t("common.onlyAdminsCanDelete"), "warning");
      return;
    }

    const result = await Swal.fire({
      title: t("appointments.deleteConfirmTitle"),
      text: t("appointments.deleteConfirmText"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t("patients.btnDelete"),
      cancelButtonText: t("patients.btnCancel"),
      confirmButtonColor: "#e11d48",
    });

    if (result.isConfirmed) {
      try {
        await appointmentApi.remove(appointment.id);
        Swal.fire(t("patients.deleteSuccessTitle"), t("appointments.deleteSuccessText"), "success");
        fetchAppointments();
      } catch (err) {
        Swal.fire(t("patientEdit.updateErrorTitle"), t("appointments.cannotDeleteText"), "error");
      }
    }
  };

  const handleQuickStatus = async (appointment, status) => {
    if (!canQuickStatus) {
      Swal.fire(t("common.forbidden"), lang === "vi" ? "Chỉ Admin và Bác sĩ mới được phép thay đổi trạng thái." : "Only admins and doctors can change appointment status.", "warning");
      return;
    }

    if (status === "Completed" && !hasAppointmentPassed(appointment)) {
      Swal.fire(t("appointments.valNotAllowed"), t("appointments.valTimePassedMsg"), "warning");
      return;
    }

    try {
      await appointmentApi.patchStatus(appointment.id, status);
      fetchAppointments();
    } catch (err) {
      Swal.fire(t("patientEdit.updateErrorTitle"), lang === "vi" ? "Không thể cập nhật trạng thái lịch hẹn." : "Cannot update appointment status.", "error");
    }
  };

  if (loading) return <Loading text={t("common.loading")} />;

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>{currentRole === ROLES.PATIENT ? t("appointments.titleMy") : t("appointments.title")}</h1>
          <p>
            {currentRole === ROLES.PATIENT
              ? t("appointments.subtitlePatient")
              : t("appointments.subtitleAdmin")}
          </p>
        </div>
        {canCreate && (
          <Button onClick={openAddModal}>
            {currentRole === ROLES.PATIENT ? t("appointments.requestBtn") : t("appointments.addBtn")}
          </Button>
        )}
      </div>

      {currentRole === ROLES.PATIENT && (
        <div className="workflow-note">
          <strong>{t("appointments.workflowNoteTitle")}</strong>
          <span>
            {t("appointments.workflowNoteText")}
          </span>
        </div>
      )}

      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder={t("appointments.searchPlaceholder")} />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="All">{t("appointments.allStatuses")}</option>
          <option value="Pending">{t("common.statusPending")}</option>
          <option value="Approved">{t("common.statusApproved")}</option>
          <option value="Completed">{t("common.statusCompleted")}</option>
          <option value="Cancelled">{t("common.statusCancelled")}</option>
        </select>
      </div>

      <div className="table-card">
        {filteredAppointments.length === 0 ? (
          <EmptyState title={t("appointments.noAppointments")} message={t("appointments.noAppointmentsMsg")} />
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t("appointments.tableNo")}</th>
                <th>{t("appointments.tablePatient")}</th>
                <th>{t("appointments.tableDoctor")}</th>
                <th>{t("appointments.tableDate")}</th>
                <th>{t("appointments.tableTime")}</th>
                <th>{t("appointments.tableReason")}</th>
                <th>{t("appointments.tableChannel")}</th>
                <th>{t("appointments.tablePriority")}</th>
                <th>{t("appointments.tableStatus")}</th>
                <th>{t("appointments.tableAction")}</th>
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
                  <td>{translateReason(item.reason, lang)}</td>
                  <td>{item.channel === "Clinic" ? t("appointments.optClinic") : item.channel === "Online" ? t("appointments.optOnline") : item.channel === "Walk-in" ? t("appointments.optWalkIn") : item.channel}</td>
                  <td>{item.priority === "Normal" ? t("appointments.optNormal") : item.priority === "High" ? t("appointments.optHigh") : t("appointments.optLow")}</td>
                  <td><StatusBadge status={item.status} /></td>
                  <td>
                    <div className="action-group appointment-actions">
                      {rowActions.length > 0 ? (
                        rowActions.map((action) =>
                          action.kind === "edit" ? (
                            <button key={action.label} onClick={() => openEditModal(item)}>{t("appointments.btnEdit")}</button>
                          ) : (
                            <button
                              key={action.label}
                              className={action.tone === "danger" ? "danger" : ""}
                              disabled={Boolean(action.disabled)}
                              title={action.disabled ? action.disabledReason : ""}
                              onClick={() => handleQuickStatus(item, action.value)}
                            >
                              {action.value === "Approved" ? t("appointments.btnApprove") : action.value === "Completed" ? t("appointments.btnComplete") : t("appointments.btnCancel")}
                            </button>
                          )
                        )
                      ) : (
                        <span className="text-muted">{t("dashboard.viewOnly")}</span>
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
        title={editingAppointment ? t("appointments.modalEditTitle") : t("appointments.modalNewTitle")}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label htmlFor="appointment-patient">{t("appointments.lblPatient")}</label>
            {currentRole === ROLES.PATIENT ? (
              <>
                <input id="appointment-patient" value={linkedPatient?.fullName || (lang === "vi" ? "Bệnh nhân hiện tại" : "Current patient")} disabled />
                <input type="hidden" name="patientId" value={linkedPatient?.id || ""} />
              </>
            ) : (
              <select id="appointment-patient" name="patientId" value={form.patientId} onChange={handleChange}>
                <option value="">{lang === "vi" ? "-- Chọn bệnh nhân --" : "-- Select patient --"}</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>{patient.fullName}</option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="appointment-doctor">{t("appointments.lblDoctor")}</label>
            {currentRole === ROLES.DOCTOR ? (
              <>
                <input id="appointment-doctor" value={linkedDoctor?.fullName || (lang === "vi" ? "Bác sĩ hiện tại" : "Current doctor")} disabled />
                <input type="hidden" name="doctorId" value={linkedDoctor?.id || ""} />
              </>
            ) : currentRole === ROLES.PATIENT ? (
              <select id="appointment-doctor" name="doctorId" value={form.doctorId} onChange={handleChange}>
                <option value="">{lang === "vi" ? "-- Chọn bác sĩ --" : "-- Select doctor --"}</option>
                {patientDoctorOptions.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>{doctor.fullName} - {doctor.specialization}</option>
                ))}
              </select>
            ) : (
              <select id="appointment-doctor" name="doctorId" value={form.doctorId} onChange={handleChange}>
                <option value="">{lang === "vi" ? "-- Chọn bác sĩ --" : "-- Select doctor --"}</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>{doctor.fullName} - {doctor.specialization}</option>
                ))}
              </select>
            )}
            {currentRole === ROLES.ADMIN && (
              <small className="form-hint">{lang === "vi" ? "Quản trị viên có thể chọn bất kỳ bệnh nhân và bác sĩ nào." : "Admin can choose any active patient and doctor."}</small>
            )}
            {currentRole === ROLES.PATIENT && (
              <small className="form-hint">{lang === "vi" ? "Chỉ hiển thị các bác sĩ đã từng điều trị cho bạn." : "Only doctors from your previous care history are shown here."}</small>
            )}
          </div>

          <Input label={t("appointments.lblDate")} name="date" type="date" value={form.date} onChange={handleChange} />
          <Input label={t("appointments.lblTime")} name="time" type="time" value={form.time} onChange={handleChange} />
          <Input label={t("appointments.lblReason")} name="reason" value={form.reason} onChange={handleChange} />

          <div className="form-group">
            <label htmlFor="appointment-channel">{t("appointments.lblChannel")}</label>
            <select id="appointment-channel" name="channel" value={form.channel} onChange={handleChange}>
              <option value="Clinic">{t("appointments.optClinic")}</option>
              <option value="Online">{t("appointments.optOnline")}</option>
              <option value="Walk-in">{t("appointments.optWalkIn")}</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="appointment-priority">{t("appointments.lblPriority")}</label>
            <select id="appointment-priority" name="priority" value={form.priority} onChange={handleChange}>
              <option value="Low">{t("appointments.optLow")}</option>
              <option value="Normal">{t("appointments.optNormal")}</option>
              <option value="High">{t("appointments.optHigh")}</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="appointment-status">{t("appointments.lblStatus")}</label>
            {currentRole === ROLES.PATIENT ? (
              <input id="appointment-status" value={t("common.statusPending")} disabled />
            ) : (
              <select id="appointment-status" name="status" value={form.status} onChange={handleChange}>
                <option value="Pending">{t("common.statusPending")}</option>
                <option value="Approved">{t("common.statusApproved")}</option>
                <option value="Completed">{t("common.statusCompleted")}</option>
                <option value="Cancelled">{t("common.statusCancelled")}</option>
              </select>
            )}
            {currentRole === ROLES.PATIENT && <small className="form-hint">{lang === "vi" ? "Lịch hẹn mới của bệnh nhân mặc định ở trạng thái Chờ duyệt." : "New patient requests are always created as Pending."}</small>}
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

export default Appointments;
