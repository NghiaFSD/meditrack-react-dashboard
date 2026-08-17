import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import Button from "../components/common/Button";
import EmptyState from "../components/common/EmptyState";
import Input from "../components/common/Input";
import Loading from "../components/common/Loading";
import Modal from "../components/common/Modal";
import SearchBox from "../components/common/SearchBox";
import StatusBadge from "../components/common/StatusBadge";
import ActionMenu from "../components/common/ActionMenu";
import { appointmentApi } from "../api/appointmentApi";
import { patientApi } from "../api/patientApi";
import { doctorApi } from "../api/doctorApi";
import { useAppointments } from "../hooks/useAppointments";
import { useAuth } from "../context/AuthContext";
import { ROLES, findLinkedPatient, findLinkedDoctor } from "../utils/auth";
import { useLanguage } from "../context/LanguageContext";
import { translateReason } from "../utils/translations";

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

/**
 * Trang quản lý Lịch hẹn khám (CRUD + Menu 3 chấm thao tác)
 */
function Appointments() {
  const { appointments, loading, fetchAppointments } = useAppointments();
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const currentRole = user?.role;

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [form, setForm] = useState(emptyAppointment);

  useEffect(() => {
    async function loadRefs() {
      const [pData, dData] = await Promise.all([patientApi.getAll(), doctorApi.getAll()]);
      setPatients(pData);
      setDoctors(dData);
    }
    loadRefs();
  }, []);

  const linkedPatient = useMemo(() => findLinkedPatient(patients, user), [patients, user]);
  const linkedDoctor = useMemo(() => findLinkedDoctor(doctors, user), [doctors, user]);

  const canCreate = [ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT].includes(currentRole);
  const canManage = [ROLES.ADMIN, ROLES.DOCTOR].includes(currentRole);

  const getPatientName = (id) => patients.find((p) => Number(p.id) === Number(id))?.fullName || "Unknown";
  const getDoctorName = (id) => doctors.find((d) => Number(d.id) === Number(id))?.fullName || "Unknown";

  // Lọc lịch hẹn theo Role và Từ khóa
  const filteredAppointments = useMemo(() => {
    const scoped = appointments.filter((item) => {
      if (currentRole === ROLES.PATIENT && linkedPatient) return Number(item.patientId) === Number(linkedPatient.id);
      if (currentRole === ROLES.DOCTOR && linkedDoctor) return Number(item.doctorId) === Number(linkedDoctor.id);
      return true;
    });

    return scoped.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch =
        getPatientName(item.patientId).toLowerCase().includes(q) ||
        getDoctorName(item.doctorId).toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q);
      const matchStatus = statusFilter === "All" || item.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [appointments, patients, doctors, search, statusFilter, currentRole, linkedPatient, linkedDoctor]);

  const handleOpenAdd = () => {
    setEditingAppointment(null);
    setForm({
      ...emptyAppointment,
      patientId: linkedPatient ? String(linkedPatient.id) : (patients[0]?.id || ""),
      doctorId: linkedDoctor ? String(linkedDoctor.id) : (doctors[0]?.id || ""),
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingAppointment(item);
    setForm(item);
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patientId || !form.doctorId || !form.date || !form.time) {
      Swal.fire("Lỗi", "Vui lòng nhập đầy đủ thông tin lịch hẹn.", "warning");
      return;
    }

    try {
      if (editingAppointment) {
        await appointmentApi.update(editingAppointment.id, form);
        Swal.fire("Thành công", "Cập nhật lịch hẹn thành công!", "success");
      } else {
        await appointmentApi.create(form);
        Swal.fire("Thành công", "Tạo lịch hẹn mới thành công!", "success");
      }
      setIsModalOpen(false);
      fetchAppointments();
    } catch (err) {
      Swal.fire("Lỗi", "Không thể lưu lịch hẹn.", "error");
    }
  };

  const handleUpdateStatus = async (item, newStatus) => {
    const confirmText = newStatus === "Cancelled" ? "Hủy lịch hẹn?" : `Chuyển trạng thái sang ${newStatus}?`;
    const res = await Swal.fire({
      title: confirmText,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Đồng ý",
      cancelButtonText: "Hủy",
    });

    if (res.isConfirmed) {
      await appointmentApi.update(item.id, { ...item, status: newStatus });
      Swal.fire("Thành công", "Trạng thái đã được cập nhật.", "success");
      fetchAppointments();
    }
  };

  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: "Xóa lịch hẹn?",
      text: "Hành động này không thể hoàn tác.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#e11d48",
    });

    if (res.isConfirmed) {
      await appointmentApi.remove(id);
      Swal.fire("Đã xóa", "Lịch hẹn đã được xóa.", "success");
      fetchAppointments();
    }
  };

  // Tạo danh sách tác vụ cho Menu 3 chấm dọc
  const getAppointmentActions = (item) => {
    const actions = [];

    if (canManage && item.status === "Pending") {
      actions.push({
        label: lang === "vi" ? "Duyệt lịch" : "Approve",
        icon: "✅",
        tone: "success",
        onClick: () => handleUpdateStatus(item, "Approved"),
      });
    }

    if (canManage && item.status === "Approved") {
      actions.push({
        label: lang === "vi" ? "Hoàn thành" : "Complete",
        icon: "🎯",
        tone: "primary",
        onClick: () => handleUpdateStatus(item, "Completed"),
      });
    }

    if (item.status !== "Cancelled" && item.status !== "Completed") {
      actions.push({
        label: lang === "vi" ? "Hủy lịch" : "Cancel",
        icon: "❌",
        tone: "danger",
        onClick: () => handleUpdateStatus(item, "Cancelled"),
      });
    }

    if (currentRole === ROLES.ADMIN) {
      actions.push({
        label: lang === "vi" ? "Chỉnh sửa" : "Edit",
        icon: "✏️",
        tone: "primary",
        onClick: () => handleOpenEdit(item),
      });
      actions.push({
        label: lang === "vi" ? "Xóa" : "Delete",
        icon: "🗑️",
        tone: "danger",
        onClick: () => handleDelete(item.id),
      });
    }

    return actions;
  };

  if (loading) return <Loading text={t("common.loading")} />;

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>{t("nav.appointments")}</h1>
          <p>{lang === "vi" ? "Quản lý lịch hẹn khám và theo dõi trạng thái tiếp nhận." : "Manage and track clinical appointments."}</p>
        </div>
        {canCreate && <Button onClick={handleOpenAdd}>+ {lang === "vi" ? "Đặt lịch hẹn" : "Book Appointment"}</Button>}
      </div>

      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder={lang === "vi" ? "Tìm theo bệnh nhân, bác sĩ, lý do..." : "Search appointments..."} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="All">{lang === "vi" ? "Tất cả trạng thái" : "All Status"}</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      <div className="table-card">
        {filteredAppointments.length === 0 ? (
          <EmptyState title="Không có lịch hẹn" message="Không tìm thấy lịch hẹn nào phù hợp." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>{t("patientDetail.date")}</th>
                <th>{t("patientDetail.time")}</th>
                <th>{t("appointments.tablePatient")}</th>
                <th>{t("appointments.tableDoctor")}</th>
                <th>{t("patientDetail.reason")}</th>
                <th>{t("patientDetail.status")}</th>
                <th style={{ textAlign: "center", width: "70px" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((item) => (
                <tr key={item.id}>
                  <td>#{item.id}</td>
                  <td>{item.date}</td>
                  <td>{item.time}</td>
                  <td><strong>{getPatientName(item.patientId)}</strong></td>
                  <td>{getDoctorName(item.doctorId)}</td>
                  <td>{translateReason(item.reason, lang)}</td>
                  <td><StatusBadge status={item.status} /></td>
                  <td style={{ textAlign: "center" }}>
                    <ActionMenu items={getAppointmentActions(item)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        title={editingAppointment ? "Chỉnh sửa Lịch hẹn" : "Đặt Lịch hẹn mới"}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>{t("appointments.tablePatient")}</label>
            <select name="patientId" value={form.patientId} onChange={handleChange} disabled={!!linkedPatient} required>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.fullName} ({p.patientCode || `#${p.id}`})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>{t("appointments.tableDoctor")}</label>
            <select name="doctorId" value={form.doctorId} onChange={handleChange} disabled={!!linkedDoctor} required>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.fullName} ({d.specialty || "Bác sĩ"})</option>
              ))}
            </select>
          </div>

          <Input label={t("patientDetail.date")} name="date" type="date" value={form.date} onChange={handleChange} required />
          <Input label={t("patientDetail.time")} name="time" type="time" value={form.time} onChange={handleChange} required />
          <Input label={t("patientDetail.reason")} name="reason" value={form.reason} onChange={handleChange} placeholder="Lý do khám..." required />

          <div className="modal-actions" style={{ gridColumn: "1 / -1", marginTop: "1rem" }}>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit">Lưu lịch hẹn</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Appointments;
