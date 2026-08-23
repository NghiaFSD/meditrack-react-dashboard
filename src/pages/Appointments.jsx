import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Card, Table, Form, Button } from "react-bootstrap";
import Swal from "sweetalert2";
import { appointmentApi } from "../api/appointmentApi";
import { patientApi } from "../api/patientApi";
import { doctorApi } from "../api/doctorApi";
import Loading from "../components/common/Loading";
import SearchBox from "../components/common/SearchBox";
import StatusBadge from "../components/common/StatusBadge";
import Modal from "../components/common/Modal";
import Input from "../components/common/Input";
import ActionMenu from "../components/common/ActionMenu";
import EmptyState from "../components/common/EmptyState";
import { ROLES, findLinkedDoctor, findLinkedPatient } from "../utils/auth";
import { useAuth } from "../context/AuthContext";
import { translateReason } from "../utils/translations";

const INITIAL_FORM = {
  patientId: "",
  doctorId: "",
  date: "",
  time: "",
  reason: "",
  status: "Pending",
};

/**
 * Trang Quản lý Lịch hẹn khám (Thuần Tiếng Việt)
 */
function Appointments() {
  const { user } = useAuth();
  const currentRole = user?.role;

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const [appts, pts, docs] = await Promise.all([
        appointmentApi.getAll(),
        patientApi.getAll(),
        doctorApi.getAll(),
      ]);
      setAppointments(appts || []);
      setPatients(pts || []);
      setDoctors(docs || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const linkedPatient = useMemo(() => findLinkedPatient(patients, user), [patients, user]);
  const linkedDoctor = useMemo(() => findLinkedDoctor(doctors, user), [doctors, user]);

  const canCreate = currentRole === ROLES.ADMIN || currentRole === ROLES.PATIENT;
  const canManage = currentRole === ROLES.ADMIN || currentRole === ROLES.DOCTOR;

  // Lọc dữ liệu theo Role
  const roleFilteredAppointments = useMemo(() => {
    if (currentRole === ROLES.PATIENT) {
      if (!linkedPatient) return [];
      return appointments.filter((a) => Number(a.patientId) === Number(linkedPatient.id));
    }
    if (currentRole === ROLES.DOCTOR) {
      if (!linkedDoctor) return [];
      return appointments.filter((a) => Number(a.doctorId) === Number(linkedDoctor.id));
    }
    return appointments;
  }, [appointments, currentRole, linkedPatient, linkedDoctor]);

  const getPatientName = (id) => patients.find((p) => Number(p.id) === Number(id))?.fullName || "Chưa xác định";
  const getDoctorName = (id) => doctors.find((d) => Number(d.id) === Number(d.id))?.fullName || "Chưa xác định";

  // Lọc theo tìm kiếm và trạng thái
  const filteredAppointments = useMemo(() => {
    return roleFilteredAppointments.filter((item) => {
      const pName = getPatientName(item.patientId).toLowerCase();
      const dName = getDoctorName(item.doctorId).toLowerCase();
      const reason = (item.reason || "").toLowerCase();
      const query = search.toLowerCase();

      const matchesSearch = pName.includes(query) || dName.includes(query) || reason.includes(query);
      const matchesStatus = statusFilter === "All" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [roleFilteredAppointments, search, statusFilter, patients, doctors]);

  const handleOpenAdd = () => {
    setEditingAppointment(null);
    setForm({
      ...INITIAL_FORM,
      patientId: linkedPatient ? String(linkedPatient.id) : patients[0]?.id || "",
      doctorId: linkedDoctor ? String(linkedDoctor.id) : doctors[0]?.id || "",
      date: new Date().toISOString().slice(0, 10),
      time: "09:00",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingAppointment(item);
    setForm({
      patientId: String(item.patientId),
      doctorId: String(item.doctorId),
      date: item.date,
      time: item.time,
      reason: item.reason,
      status: item.status,
    });
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
        "Thiếu thông tin",
        "Vui lòng nhập đầy đủ thông tin lịch hẹn.",
        "warning"
      );
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
    const confirmText =
      newStatus === "Cancelled"
        ? "Hủy lịch hẹn?"
        : newStatus === "Approved"
        ? "Duyệt lịch hẹn này?"
        : newStatus === "Completed"
        ? "Đánh dấu hoàn thành buổi khám?"
        : `Chuyển trạng thái sang ${newStatus}?`;

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
      confirmButtonColor: "#dc3545",
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
        label: "Duyệt lịch",
        icon: <i className="bi bi-check-circle text-success"></i>,
        onClick: () => handleUpdateStatus(item, "Approved"),
      });
    }

    if (canManage && item.status === "Approved") {
      actions.push({
        label: "Hoàn thành",
        icon: <i className="bi bi-check2-all text-primary"></i>,
        onClick: () => handleUpdateStatus(item, "Completed"),
      });
    }

    if (item.status !== "Cancelled" && item.status !== "Completed") {
      actions.push({
        label: "Hủy lịch",
        icon: <i className="bi bi-x-circle text-danger"></i>,
        tone: "danger",
        onClick: () => handleUpdateStatus(item, "Cancelled"),
      });
    }

    if (currentRole === ROLES.ADMIN) {
      actions.push({
        label: "Chỉnh sửa",
        icon: <i className="bi bi-pencil-square text-primary"></i>,
        onClick: () => handleOpenEdit(item),
      });
      actions.push({
        label: "Xóa",
        icon: <i className="bi bi-trash3 text-danger"></i>,
        tone: "danger",
        onClick: () => handleDelete(item.id),
      });
    }

    return actions;
  };

  if (loading) return <Loading text="Đang tải dữ liệu..." />;

  return (
    <Container fluid className="px-0">
      {/* Tiêu đề trang & Nút đặt lịch */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">Lịch hẹn khám</h2>
          <p className="text-muted mb-0">
            Quản lý lịch hẹn khám và theo dõi trạng thái tiếp nhận.
          </p>
        </div>
        {canCreate && (
          <Button variant="primary" onClick={handleOpenAdd} className="d-flex align-items-center gap-2 shadow-sm">
            <i className="bi bi-calendar-plus-fill"></i>
            <span>Đặt lịch hẹn</span>
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
                placeholder="Tìm theo bệnh nhân, bác sĩ, lý do..."
              />
            </Col>
            <Col xs={12} md={4}>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-light"
              >
                <option value="All">Tất cả trạng thái</option>
                <option value="Pending">Chờ duyệt (Pending)</option>
                <option value="Approved">Đã duyệt (Approved)</option>
                <option value="Completed">Hoàn thành (Completed)</option>
                <option value="Cancelled">Đã hủy (Cancelled)</option>
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
                title="Không có lịch hẹn"
                message="Không tìm thấy lịch hẹn nào phù hợp."
                icon="bi-calendar-x"
              />
            </div>
          ) : (
            <Table responsive hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">ID</th>
                  <th>Ngày khám</th>
                  <th>Giờ</th>
                  <th>Bệnh nhân</th>
                  <th>Bác sĩ</th>
                  <th>Lý do khám</th>
                  <th>Trạng thái</th>
                  <th className="text-center pe-3">Thao tác</th>
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
                    <td>{translateReason(item.reason)}</td>
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
        title={editingAppointment ? "Chỉnh sửa Lịch hẹn" : "Đặt Lịch hẹn mới"}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="lg"
      >
        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col xs={12} md={6}>
              <Form.Group className="mb-3" controlId="apptPatient">
                <Form.Label className="fw-semibold">Bệnh nhân</Form.Label>
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
                <Form.Label className="fw-semibold">Bác sĩ</Form.Label>
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
                label="Ngày khám"
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
                required
              />
            </Col>

            <Col xs={12} md={6}>
              <Input
                label="Giờ khám"
                name="time"
                type="time"
                value={form.time}
                onChange={handleChange}
                required
              />
            </Col>

            <Col xs={12}>
              <Input
                label="Lý do khám"
                name="reason"
                value={form.reason}
                onChange={handleChange}
                placeholder="Lý do khám bệnh..."
                required
              />
            </Col>
          </Row>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Lưu lịch hẹn
            </Button>
          </div>
        </Form>
      </Modal>
    </Container>
  );
}

export default Appointments;
