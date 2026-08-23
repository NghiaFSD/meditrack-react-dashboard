import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Card, Table, Form } from "react-bootstrap";
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
 * Trang quản lý Lịch hẹn khám (CRUD + Menu 3 chấm thao tác) sử dụng React-Bootstrap
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

  const getPatientName = (id) =>
    patients.find((p) => Number(p.id) === Number(id))?.fullName || "Unknown";
  const getDoctorName = (id) =>
    doctors.find((d) => Number(d.id) === Number(id))?.fullName || "Unknown";

  // Lọc lịch hẹn theo Role và Từ khóa
  const filteredAppointments = useMemo(() => {
    const scoped = appointments.filter((item) => {
      if (currentRole === ROLES.PATIENT && linkedPatient)
        return Number(item.patientId) === Number(linkedPatient.id);
      if (currentRole === ROLES.DOCTOR && linkedDoctor)
        return Number(item.doctorId) === Number(linkedDoctor.id);
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
  }, [
    appointments,
    patients,
    doctors,
    search,
    statusFilter,
    currentRole,
    linkedPatient,
    linkedDoctor,
  ]);

  const handleOpenAdd = () => {
    setEditingAppointment(null);
    setForm({
      ...emptyAppointment,
      patientId: linkedPatient ? String(linkedPatient.id) : patients[0]?.id || "",
      doctorId: linkedDoctor ? String(linkedDoctor.id) : doctors[0]?.id || "",
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
      Swal.fire(
        lang === "vi" ? "Thiếu thông tin" : "Missing fields",
        lang === "vi" ? "Vui lòng nhập đầy đủ thông tin lịch hẹn." : "Please fill in all required appointment fields.",
        "warning"
      );
      return;
    }

    try {
      if (editingAppointment) {
        await appointmentApi.update(editingAppointment.id, form);
        Swal.fire(
          lang === "vi" ? "Thành công" : "Success",
          lang === "vi" ? "Cập nhật lịch hẹn thành công!" : "Appointment updated successfully!",
          "success"
        );
      } else {
        await appointmentApi.create(form);
        Swal.fire(
          lang === "vi" ? "Thành công" : "Success",
          lang === "vi" ? "Tạo lịch hẹn mới thành công!" : "Appointment created successfully!",
          "success"
        );
      }
      setIsModalOpen(false);
      fetchAppointments();
    } catch (err) {
      Swal.fire(
        lang === "vi" ? "Lỗi" : "Error",
        lang === "vi" ? "Không thể lưu lịch hẹn." : "Cannot save appointment.",
        "error"
      );
    }
  };

  const handleUpdateStatus = async (item, newStatus) => {
    const confirmText =
      newStatus === "Cancelled"
        ? lang === "vi"
          ? "Hủy lịch hẹn?"
          : "Cancel this appointment?"
        : lang === "vi"
        ? `Chuyển trạng thái sang ${newStatus}?`
        : `Change status to ${newStatus}?`;

    const res = await Swal.fire({
      title: confirmText,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: lang === "vi" ? "Đồng ý" : "Confirm",
      cancelButtonText: lang === "vi" ? "Hủy" : "Cancel",
    });

    if (res.isConfirmed) {
      await appointmentApi.update(item.id, { ...item, status: newStatus });
      Swal.fire(
        lang === "vi" ? "Thành công" : "Success",
        lang === "vi" ? "Trạng thái đã được cập nhật." : "Status updated successfully.",
        "success"
      );
      fetchAppointments();
    }
  };

  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: lang === "vi" ? "Xóa lịch hẹn?" : "Delete appointment?",
      text:
        lang === "vi"
          ? "Hành động này không thể hoàn tác."
          : "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: lang === "vi" ? "Xóa" : "Delete",
      cancelButtonText: lang === "vi" ? "Hủy" : "Cancel",
      confirmButtonColor: "#dc3545",
    });

    if (res.isConfirmed) {
      await appointmentApi.remove(id);
      Swal.fire(
        lang === "vi" ? "Đã xóa" : "Deleted",
        lang === "vi" ? "Lịch hẹn đã được xóa." : "Appointment deleted.",
        "success"
      );
      fetchAppointments();
    }
  };

  // Tạo danh sách tác vụ cho Menu 3 chấm dọc
  const getAppointmentActions = (item) => {
    const actions = [];

    if (canManage && item.status === "Pending") {
      actions.push({
        label: lang === "vi" ? "Duyệt lịch" : "Approve",
        icon: <i className="bi bi-check-circle text-success"></i>,
        onClick: () => handleUpdateStatus(item, "Approved"),
      });
    }

    if (canManage && item.status === "Approved") {
      actions.push({
        label: lang === "vi" ? "Hoàn thành" : "Complete",
        icon: <i className="bi bi-check2-all text-primary"></i>,
        onClick: () => handleUpdateStatus(item, "Completed"),
      });
    }

    if (item.status !== "Cancelled" && item.status !== "Completed") {
      actions.push({
        label: lang === "vi" ? "Hủy lịch" : "Cancel",
        icon: <i className="bi bi-x-circle text-danger"></i>,
        tone: "danger",
        onClick: () => handleUpdateStatus(item, "Cancelled"),
      });
    }

    if (currentRole === ROLES.ADMIN) {
      actions.push({
        label: lang === "vi" ? "Chỉnh sửa" : "Edit",
        icon: <i className="bi bi-pencil-square text-primary"></i>,
        onClick: () => handleOpenEdit(item),
      });
      actions.push({
        label: lang === "vi" ? "Xóa" : "Delete",
        icon: <i className="bi bi-trash3 text-danger"></i>,
        tone: "danger",
        onClick: () => handleDelete(item.id),
      });
    }

    return actions;
  };

  if (loading) return <Loading text={t("common.loading")} />;

  return (
    <Container fluid className="px-0">
      {/* Tiêu đề trang & Nút đặt lịch */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">{t("nav.appointments")}</h2>
          <p className="text-muted mb-0">
            {lang === "vi"
              ? "Quản lý lịch hẹn khám và theo dõi trạng thái tiếp nhận."
              : "Manage and track clinical appointments."}
          </p>
        </div>
        {canCreate && (
          <Button variant="primary" onClick={handleOpenAdd} className="d-flex align-items-center gap-2 shadow-sm">
            <i className="bi bi-calendar-plus-fill"></i>
            <span>{lang === "vi" ? "Đặt lịch hẹn" : "Book Appointment"}</span>
          </Button>
        )}
      </div>

      {/* Thanh công cụ: Tìm kiếm + Lọc trạng thái */}
      <Card className="border-0 shadow-sm rounded-3 mb-4">
        <Card.Body className="p-3">
          <Row className="g-3">
            <Col xs={12} md={8}>
              <SearchBox
                value={search}
                onChange={setSearch}
                placeholder={
                  lang === "vi" ? "Tìm theo bệnh nhân, bác sĩ, lý do..." : "Search appointments..."
                }
              />
            </Col>
            <Col xs={12} md={4}>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-light"
              >
                <option value="All">{lang === "vi" ? "Tất cả trạng thái" : "All Status"}</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Bảng danh sách Lịch hẹn */}
      <Card className="border-0 shadow-sm rounded-3">
        <Card.Body className="p-0">
          {filteredAppointments.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title={lang === "vi" ? "Không có lịch hẹn" : "No Appointments"}
                message={
                  lang === "vi"
                    ? "Không tìm thấy lịch hẹn nào phù hợp."
                    : "No matching appointments found."
                }
                icon="bi-calendar-x"
              />
            </div>
          ) : (
            <Table responsive hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">ID</th>
                  <th>{t("patientDetail.date")}</th>
                  <th>{t("patientDetail.time")}</th>
                  <th>{t("appointments.tablePatient")}</th>
                  <th>{t("appointments.tableDoctor")}</th>
                  <th>{t("patientDetail.reason")}</th>
                  <th>{t("patientDetail.status")}</th>
                  <th className="text-center pe-3">{t("patients.tableAction")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((item) => (
                  <tr key={item.id}>
                    <td className="ps-3 text-muted">#{item.id}</td>
                    <td className="fw-medium">{item.date}</td>
                    <td>{item.time}</td>
                    <td className="fw-semibold text-primary">{getPatientName(item.patientId)}</td>
                    <td>{getDoctorName(item.doctorId)}</td>
                    <td>{translateReason(item.reason, lang)}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="text-center pe-3">
                      <ActionMenu items={getAppointmentActions(item)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Modal Đặt/Sửa Lịch hẹn */}
      <Modal
        title={
          editingAppointment
            ? lang === "vi"
              ? "Chỉnh sửa Lịch hẹn"
              : "Edit Appointment"
            : lang === "vi"
            ? "Đặt Lịch hẹn mới"
            : "Book New Appointment"
        }
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="lg"
      >
        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col xs={12} md={6}>
              <Form.Group className="mb-3" controlId="apptPatient">
                <Form.Label className="fw-semibold">{t("appointments.tablePatient")}</Form.Label>
                <Form.Select
                  name="patientId"
                  value={form.patientId}
                  onChange={handleChange}
                  disabled={!!linkedPatient}
                  required
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.patientCode || `#${p.id}`})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col xs={12} md={6}>
              <Form.Group className="mb-3" controlId="apptDoctor">
                <Form.Label className="fw-semibold">{t("appointments.tableDoctor")}</Form.Label>
                <Form.Select
                  name="doctorId"
                  value={form.doctorId}
                  onChange={handleChange}
                  disabled={!!linkedDoctor}
                  required
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.specialty || "Bác sĩ"})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col xs={12} md={6}>
              <Input
                label={t("patientDetail.date")}
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
                required
              />
            </Col>

            <Col xs={12} md={6}>
              <Input
                label={t("patientDetail.time")}
                name="time"
                type="time"
                value={form.time}
                onChange={handleChange}
                required
              />
            </Col>

            <Col xs={12}>
              <Input
                label={t("patientDetail.reason")}
                name="reason"
                value={form.reason}
                onChange={handleChange}
                placeholder={lang === "vi" ? "Lý do khám bệnh..." : "Reason for visit..."}
                required
              />
            </Col>
          </Row>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              {t("patients.btnCancel")}
            </Button>
            <Button variant="primary" type="submit">
              {lang === "vi" ? "Lưu lịch hẹn" : "Save Appointment"}
            </Button>
          </div>
        </Form>
      </Modal>
    </Container>
  );
}

export default Appointments;
