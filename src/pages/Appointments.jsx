import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Card, Table, Form, Button, Badge } from "react-bootstrap";
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
import StatCard from "../components/dashboard/StatCard";
import { ROLES, findLinkedDoctor, findLinkedPatient } from "../utils/auth";
import { useAuth } from "../context/AuthContext";
import { translateReason, translateSpecialty } from "../utils/translations";
import { getDoctorWeeklySchedule, getLocalDateStr } from "../utils/dutySchedule";

const QUICK_REASONS = [
  "Tái khám tiểu đường",
  "Kiểm tra chỉ số đường huyết",
  "Tư vấn dinh dưỡng",
  "Khám sức khỏe định kỳ",
  "Theo dõi huyết áp",
];

const INITIAL_FORM = {
  patientId: "",
  doctorId: "",
  date: "",
  time: "08:30",
  reason: "Tái khám tiểu đường",
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

  const canCreate = currentRole === ROLES.PATIENT;
  const canManage = currentRole === ROLES.DOCTOR;

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
  const getDoctorName = (id) => doctors.find((d) => Number(d.id) === Number(id))?.fullName || "Chưa xác định";

  const todayStr = getLocalDateStr();

  // Thống kê số lượng theo từng nhóm
  const stats = useMemo(() => {
    const todayCount = roleFilteredAppointments.filter((a) => a.date === todayStr && a.status !== "Cancelled").length;
    const pendingCount = roleFilteredAppointments.filter((a) => a.status === "Pending").length;
    const approvedCount = roleFilteredAppointments.filter((a) => a.status === "Approved").length;
    const completedCount = roleFilteredAppointments.filter((a) => a.status === "Completed").length;
    const totalCount = roleFilteredAppointments.length;
    return { todayCount, pendingCount, approvedCount, completedCount, totalCount };
  }, [roleFilteredAppointments, todayStr]);

  // Lọc và sắp xếp thông minh
  const filteredAppointments = useMemo(() => {
    let list = roleFilteredAppointments.filter((item) => {
      const pName = getPatientName(item.patientId).toLowerCase();
      const dName = getDoctorName(item.doctorId).toLowerCase();
      const reason = (item.reason || "").toLowerCase();
      const query = search.toLowerCase();

      const matchesSearch = pName.includes(query) || dName.includes(query) || reason.includes(query);

      let matchesStatus = true;
      if (statusFilter === "Today") {
        matchesStatus = item.date === todayStr && item.status !== "Cancelled";
      } else if (statusFilter !== "All") {
        matchesStatus = item.status === statusFilter;
      }

      return matchesSearch && matchesStatus;
    });

    // Sắp xếp: Ưu tiên Pending lên đầu -> Hôm nay/Tương lai -> Cuối cùng là Completed/Cancelled
    return list.sort((a, b) => {
      // 1. Pending luôn ưu tiên cao nhất
      if (a.status === "Pending" && b.status !== "Pending") return -1;
      if (b.status === "Pending" && a.status !== "Pending") return 1;

      // 2. Nếu là hôm nay
      const aIsToday = a.date === todayStr;
      const bIsToday = b.date === todayStr;
      if (aIsToday && !bIsToday) return -1;
      if (bIsToday && !aIsToday) return 1;

      // 3. Sắp xếp theo ngày giảm dần (mới nhất lên trên)
      return b.date.localeCompare(a.date) || a.time.localeCompare(b.time);
    });
  }, [roleFilteredAppointments, search, statusFilter, todayStr, patients, doctors]);

  const selectedDoctorObj = useMemo(() => {
    return doctors.find((d) => String(d.id) === String(form.doctorId)) || doctors[0] || null;
  }, [doctors, form.doctorId]);

  const selectedDoctorSchedule = useMemo(() => {
    if (!selectedDoctorObj) return [];
    return getDoctorWeeklySchedule(selectedDoctorObj, appointments);
  }, [selectedDoctorObj, appointments]);

  const shiftOnSelectedDate = useMemo(() => {
    if (!selectedDoctorSchedule.length || !form.date) return null;
    return selectedDoctorSchedule.find((s) => s.date === form.date) || null;
  }, [selectedDoctorSchedule, form.date]);

  const timeSlots = useMemo(() => {
    if (!shiftOnSelectedDate || !shiftOnSelectedDate.isWorking) return [];
    if (shiftOnSelectedDate.shiftType === "Ca sáng") {
      return ["07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00"];
    }
    if (shiftOnSelectedDate.shiftType === "Ca chiều") {
      return ["13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"];
    }
    if (shiftOnSelectedDate.shiftType === "Ca tối") {
      return ["17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30"];
    }
    return ["08:00", "08:30", "09:00", "09:30", "10:00", "14:00", "14:30", "15:00", "15:30", "16:00"];
  }, [shiftOnSelectedDate]);

  const bookedTimes = useMemo(() => {
    if (!form.date || !form.doctorId) return new Set();
    return new Set(
      appointments
        .filter(
          (a) =>
            a.date === form.date &&
            String(a.doctorId) === String(form.doctorId) &&
            a.status !== "Cancelled" &&
            (!editingAppointment || String(a.id) !== String(editingAppointment.id))
        )
        .map((a) => a.time)
    );
  }, [appointments, form.date, form.doctorId, editingAppointment]);

  const handleOpenAdd = () => {
    const today = getLocalDateStr();
    const docId = linkedDoctor ? String(linkedDoctor.id) : doctors[0]?.id ? String(doctors[0].id) : "";
    const doc = doctors.find((d) => String(d.id) === docId) || doctors[0];
    const sched = doc ? getDoctorWeeklySchedule(doc, appointments) : [];
    const firstWorkingDay = sched.find((s) => s.isToday && s.isWorking) || sched.find((s) => s.isWorking) || sched[0];
    const defaultDate = firstWorkingDay?.date || today;
    const defaultTime = firstWorkingDay?.shiftType === "Ca chiều" ? "13:30" : "08:30";

    setEditingAppointment(null);
    setForm({
      ...INITIAL_FORM,
      patientId: linkedPatient ? String(linkedPatient.id) : patients[0]?.id ? String(patients[0].id) : "",
      doctorId: docId,
      date: defaultDate,
      time: defaultTime,
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
    if (name === "doctorId") {
      // Khi đổi Bác sĩ: tự động tìm ngày trực phù hợp
      const doc = doctors.find((d) => String(d.id) === String(value));
      const sched = doc ? getDoctorWeeklySchedule(doc, appointments) : [];
      const daySchedule = sched.find((s) => s.date === form.date);
      let nextDate = form.date;
      let nextTime = form.time;

      if (!daySchedule || !daySchedule.isWorking) {
        const firstWorking = sched.find((s) => s.isToday && s.isWorking) || sched.find((s) => s.isWorking);
        if (firstWorking) {
          nextDate = firstWorking.date;
          nextTime = firstWorking.shiftType === "Ca chiều" ? "13:30" : "08:30";
        }
      }

      setForm((prev) => ({
        ...prev,
        doctorId: value,
        date: nextDate,
        time: nextTime,
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
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

    // Kiểm tra ca trực của bác sĩ
    if (shiftOnSelectedDate && !shiftOnSelectedDate.isWorking) {
      Swal.fire({
        title: "Bác sĩ nghỉ trực",
        text: `Bác sĩ ${selectedDoctorObj?.fullName || "được chọn"} không có ca trực vào ngày ${form.date}. Vui lòng chọn ngày khác trên lịch trực.`,
        icon: "warning",
      });
      return;
    }

    // Kiểm tra trùng giờ khám
    if (bookedTimes.has(form.time)) {
      Swal.fire({
        title: "Khung giờ đã kín",
        text: `Khung giờ ${form.time} ngày ${form.date} của bác sĩ đã có bệnh nhân đặt trước. Vui lòng chọn khung giờ khác.`,
        icon: "warning",
      });
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

  const canCreateAppointment = currentRole === ROLES.PATIENT || currentRole === ROLES.ADMIN;
  const isDoctorRole = currentRole === ROLES.DOCTOR;

  return (
    <Container fluid className="px-0">
      {/* Tiêu đề trang & Nút đặt lịch */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">
            {isDoctorRole ? "Quản lý Lịch hẹn Khám bệnh" : "Lịch hẹn khám của tôi"}
          </h2>
          <p className="text-muted mb-0">
            {isDoctorRole
              ? `Bác sĩ ${linkedDoctor?.fullName || "phụ trách"} quản lý hàng đợi, phê duyệt lịch và tiếp nhận bệnh nhân.`
              : "Theo dõi lịch hẹn khám bệnh, thời gian và trạng thái tiếp nhận của bác sĩ."}
          </p>
        </div>
        {canCreateAppointment && (
          <Button variant="primary" onClick={handleOpenAdd} className="d-flex align-items-center gap-2 shadow-sm rounded-pill px-3 py-2 fw-semibold">
            <i className="bi bi-calendar-plus-fill"></i>
            <span>+ Đặt lịch hẹn mới</span>
          </Button>
        )}
      </div>

      {/* 4 Thẻ KPI Thống kê Lịch hẹn */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Lịch khám Hôm nay"
            value={stats.todayCount}
            icon={<i className="bi bi-calendar-check-fill text-info"></i>}
            note={`Ngày ${todayStr}`}
            onClick={() => setStatusFilter("Today")}
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Yêu cầu Chờ duyệt"
            value={stats.pendingCount}
            icon={<i className="bi bi-clock-history text-danger"></i>}
            note="Cần bác sĩ duyệt gấp"
            onClick={() => setStatusFilter("Pending")}
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Lịch Đã xác nhận"
            value={stats.approvedCount}
            icon={<i className="bi bi-calendar-check text-success"></i>}
            note="Sắp tới"
            onClick={() => setStatusFilter("Approved")}
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Đã hoàn thành"
            value={stats.completedCount}
            icon={<i className="bi bi-check2-all text-primary"></i>}
            note="Lịch sử khám xong"
            onClick={() => setStatusFilter("Completed")}
          />
        </Col>
      </Row>

      {/* Thanh công cụ: Tìm kiếm + Tabs Lọc trạng thái */}
      <Card className="border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
        <Card.Body className="p-3">
          <Row className="g-3 align-items-center">
            <Col xs={12} lg={4}>
              <SearchBox
                value={search}
                onChange={setSearch}
                placeholder="Tìm theo tên bệnh nhân, bác sĩ, lý do khám..."
              />
            </Col>
            <Col xs={12} lg={8}>
              {/* Tabs chuyển trạng thái trực quan */}
              <div className="d-flex flex-wrap gap-2 justify-content-lg-end">
                <Button
                  size="sm"
                  variant={statusFilter === "All" ? "primary" : "light"}
                  className="rounded-pill px-3 py-1 fw-semibold d-flex align-items-center gap-1 border"
                  onClick={() => setStatusFilter("All")}
                >
                  <span>Tất cả</span>
                  <Badge bg={statusFilter === "All" ? "light" : "secondary"} text={statusFilter === "All" ? "primary" : "white"} pill>
                    {stats.totalCount}
                  </Badge>
                </Button>

                <Button
                  size="sm"
                  variant={statusFilter === "Pending" ? "danger" : "light"}
                  className="rounded-pill px-3 py-1 fw-semibold d-flex align-items-center gap-1 border"
                  onClick={() => setStatusFilter("Pending")}
                >
                  <i className="bi bi-clock-history"></i>
                  <span>Chờ duyệt</span>
                  {stats.pendingCount > 0 && (
                    <Badge bg={statusFilter === "Pending" ? "light" : "danger"} text={statusFilter === "Pending" ? "danger" : "white"} pill>
                      {stats.pendingCount}
                    </Badge>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant={statusFilter === "Today" ? "info" : "light"}
                  className={`rounded-pill px-3 py-1 fw-semibold d-flex align-items-center gap-1 border ${statusFilter === "Today" ? "text-white" : ""}`}
                  onClick={() => setStatusFilter("Today")}
                >
                  <i className="bi bi-calendar-event"></i>
                  <span>Hôm nay</span>
                  {stats.todayCount > 0 && (
                    <Badge bg={statusFilter === "Today" ? "light" : "info"} text={statusFilter === "Today" ? "dark" : "white"} pill>
                      {stats.todayCount}
                    </Badge>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant={statusFilter === "Approved" ? "success" : "light"}
                  className="rounded-pill px-3 py-1 fw-semibold d-flex align-items-center gap-1 border"
                  onClick={() => setStatusFilter("Approved")}
                >
                  <i className="bi bi-check-circle"></i>
                  <span>Đã duyệt</span>
                  <Badge bg={statusFilter === "Approved" ? "light" : "success"} text={statusFilter === "Approved" ? "success" : "white"} pill>
                    {stats.approvedCount}
                  </Badge>
                </Button>

                <Button
                  size="sm"
                  variant={statusFilter === "Completed" ? "secondary" : "light"}
                  className="rounded-pill px-3 py-1 fw-semibold d-flex align-items-center gap-1 border"
                  onClick={() => setStatusFilter("Completed")}
                >
                  <i className="bi bi-check2-all"></i>
                  <span>Hoàn thành</span>
                </Button>

                <Button
                  size="sm"
                  variant={statusFilter === "Cancelled" ? "dark" : "light"}
                  className="rounded-pill px-3 py-1 fw-semibold d-flex align-items-center gap-1 border"
                  onClick={() => setStatusFilter("Cancelled")}
                >
                  <span>Đã hủy</span>
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Bảng danh sách Lịch hẹn */}
      <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
        <Card.Body className="p-0">
          {filteredAppointments.length === 0 ? (
            <div className="p-5 text-center">
              <EmptyState
                title="Không có lịch hẹn"
                message={
                  statusFilter === "Pending"
                    ? "Hiện không có lịch hẹn nào đang chờ duyệt."
                    : statusFilter === "Today"
                    ? "Hôm nay không có ca khám nào được xếp lịch."
                    : "Không tìm thấy lịch hẹn nào phù hợp với bộ lọc."
                }
                icon="bi-calendar-x"
              />
            </div>
          ) : (
            <Table responsive hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3" style={{ width: "60px" }}>ID</th>
                  <th style={{ minWidth: "150px" }}>Thời gian khám</th>
                  <th style={{ minWidth: "180px" }}>Bệnh nhân</th>
                  {!isDoctorRole && <th style={{ minWidth: "160px" }}>Bác sĩ</th>}
                  <th style={{ minWidth: "200px" }}>Lý do khám</th>
                  <th style={{ minWidth: "120px" }}>Trạng thái</th>
                  <th className="text-center pe-3" style={{ minWidth: "130px" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((item) => {
                  const isToday = item.date === todayStr;
                  const patientObj = patients.find((p) => Number(p.id) === Number(item.patientId));
                  return (
                    <tr
                      key={item.id}
                      className={
                        item.status === "Pending"
                          ? "table-warning bg-opacity-25"
                          : isToday
                          ? "table-primary bg-opacity-10"
                          : ""
                      }
                    >
                      <td className="ps-3 text-muted fw-semibold">#{item.id}</td>
                      <td>
                        <div className="d-flex flex-column">
                          <div className="fw-bold text-dark d-flex align-items-center gap-1">
                            <i className="bi bi-clock text-primary"></i>
                            <span>{item.time}</span>
                            {isToday && (
                              <Badge bg="danger" className="ms-1 rounded-pill" style={{ fontSize: "0.65rem" }}>
                                Hôm nay
                              </Badge>
                            )}
                          </div>
                          <small className="text-muted">{item.date}</small>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold small shadow-sm flex-shrink-0"
                            style={{ width: "32px", height: "32px", fontSize: "0.8rem" }}
                          >
                            {getPatientName(item.patientId).charAt(0) || "P"}
                          </div>
                          <div>
                            <div className="fw-semibold text-primary">{getPatientName(item.patientId)}</div>
                            <small className="text-muted d-block" style={{ fontSize: "0.75rem" }}>
                              {patientObj?.patientCode || `PT-${String(item.patientId).padStart(3, "0")}`}
                              {patientObj?.phone ? ` • ${patientObj.phone}` : ""}
                            </small>
                          </div>
                        </div>
                      </td>
                      {!isDoctorRole && (
                        <td>
                          <div className="fw-semibold text-dark">{getDoctorName(item.doctorId)}</div>
                        </td>
                      )}
                      <td>
                        <span className="text-dark fw-medium">{translateReason(item.reason)}</span>
                      </td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="text-center pe-3">
                        <div className="d-flex align-items-center justify-content-center gap-1">
                          {canManage && item.status === "Pending" && (
                            <Button
                              size="sm"
                              variant="success"
                              className="py-1 px-2 rounded-pill fw-semibold d-inline-flex align-items-center gap-1 shadow-sm"
                              style={{ fontSize: "0.75rem" }}
                              onClick={() => handleUpdateStatus(item, "Approved")}
                              title="Duyệt lịch hẹn"
                            >
                              <i className="bi bi-check-lg"></i>
                              <span>Duyệt</span>
                            </Button>
                          )}
                          {canManage && item.status === "Approved" && (
                            <Button
                              size="sm"
                              variant="primary"
                              className="py-1 px-2 rounded-pill fw-semibold d-inline-flex align-items-center gap-1 shadow-sm"
                              style={{ fontSize: "0.75rem" }}
                              onClick={() => handleUpdateStatus(item, "Completed")}
                              title="Đánh dấu đã hoàn thành khám"
                            >
                              <i className="bi bi-check2-all"></i>
                              <span>Khám xong</span>
                            </Button>
                          )}
                          <ActionMenu items={getAppointmentActions(item)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                <Form.Label className="fw-semibold">
                  <i className="bi bi-person-badge-fill text-primary me-1"></i>
                  Bác sĩ khám
                </Form.Label>
                <Form.Select
                  name="doctorId"
                  value={form.doctorId}
                  onChange={handleChange}
                  disabled={!!linkedDoctor}
                  required
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} — {translateSpecialty(d.specialization || d.specialty)} ({d.room || "Phòng khám"})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Bảng Ca trực tuần này của Bác sĩ */}
            {selectedDoctorObj && (
              <Col xs={12}>
                <div className="p-3 bg-light rounded-3 border mb-1">
                  <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
                    <span className="fw-bold small text-dark d-flex align-items-center gap-1">
                      <i className="bi bi-calendar-week-fill text-primary"></i>
                      Lịch trực tuần này của {selectedDoctorObj.fullName}:
                    </span>
                    <small className="text-primary fw-medium">
                      <i className="bi bi-hand-index-thumb me-1"></i>Nhấn vào ngày để chọn ca
                    </small>
                  </div>

                  <div className="d-flex gap-2 overflow-auto pb-1">
                    {selectedDoctorSchedule.map((day) => {
                      const isSelected = form.date === day.date;
                      const isOff = !day.isWorking;
                      return (
                        <div
                          key={day.date}
                          onClick={() => {
                            if (!isOff) {
                              const defaultSlot = day.shiftType === "Ca chiều" ? "13:30" : "08:30";
                              setForm((prev) => ({
                                ...prev,
                                date: day.date,
                                time: defaultSlot,
                              }));
                            }
                          }}
                          className={`p-2 rounded-3 text-center transition-all ${
                            isSelected
                              ? "border border-2 border-primary bg-primary bg-opacity-10 shadow-sm"
                              : isOff
                              ? "bg-white text-muted border border-light opacity-50"
                              : "bg-white border"
                          }`}
                          style={{
                            minWidth: "96px",
                            cursor: isOff ? "not-allowed" : "pointer",
                          }}
                          title={isOff ? "Bác sĩ nghỉ trực ngày này" : `Nhấn để chọn ${day.dayName}`}
                        >
                          <div className="small fw-bold text-dark">{day.dayName}</div>
                          <div className="text-muted mb-1" style={{ fontSize: "0.75rem" }}>
                            {day.displayDate}
                          </div>
                          <Badge
                            bg={
                              day.shiftType === "Ca sáng"
                                ? "warning"
                                : day.shiftType === "Ca chiều"
                                ? "info"
                                : day.shiftType === "Ca tối"
                                ? "primary"
                                : "secondary"
                            }
                            text={day.shiftType === "Ca sáng" || day.shiftType === "Ca chiều" ? "dark" : "white"}
                            style={{ fontSize: "0.65rem" }}
                          >
                            {day.shiftType}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Col>
            )}

            {/* Ngày khám & Chi tiết ca trực */}
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
              <Form.Label className="fw-semibold">Thông tin ca trực ngày này</Form.Label>
              {shiftOnSelectedDate?.isWorking ? (
                <div className="p-2 rounded border bg-success bg-opacity-10 text-success small">
                  <div className="fw-bold d-flex align-items-center gap-1">
                    <i className="bi bi-clock-fill"></i>
                    <span>{shiftOnSelectedDate.shiftType} ({shiftOnSelectedDate.shiftHours})</span>
                  </div>
                  <div className="text-dark opacity-75 mt-1" style={{ fontSize: "0.78rem" }}>
                    Phòng khám: <strong>{shiftOnSelectedDate.room}</strong> • Điều dưỡng: {shiftOnSelectedDate.nurse}
                  </div>
                </div>
              ) : (
                <div className="p-2 rounded border bg-danger bg-opacity-10 text-danger small">
                  <i className="bi bi-exclamation-triangle-fill me-1"></i>
                  <strong>Bác sĩ nghỉ trực ngày này.</strong> Vui lòng chọn ngày khác ở trên.
                </div>
              )}
            </Col>

            {/* Khung giờ khám theo ca */}
            {shiftOnSelectedDate?.isWorking && (
              <Col xs={12}>
                <Form.Group className="mb-2">
                  <Form.Label className="fw-semibold d-flex align-items-center justify-content-between">
                    <span>
                      <i className="bi bi-clock text-primary me-1"></i>
                      Chọn giờ khám trong ca ({shiftOnSelectedDate.shiftType}):
                    </span>
                    <small className="text-muted">Giờ đã chọn: <strong className="text-primary">{form.time}</strong></small>
                  </Form.Label>
                  <div className="d-flex flex-wrap gap-2">
                    {timeSlots.map((slot) => {
                      const isBooked = bookedTimes.has(slot);
                      const isSelected = form.time === slot;
                      return (
                        <Button
                          key={slot}
                          type="button"
                          size="sm"
                          variant={isSelected ? "primary" : isBooked ? "outline-secondary" : "outline-primary"}
                          disabled={isBooked}
                          onClick={() => setForm((prev) => ({ ...prev, time: slot }))}
                          className="rounded-pill px-3 py-1 fw-medium"
                          style={{ fontSize: "0.82rem" }}
                        >
                          {slot} {isBooked && <span style={{ fontSize: "0.65rem" }}>(Đã đặt)</span>}
                        </Button>
                      );
                    })}
                  </div>
                </Form.Group>
              </Col>
            )}

            {/* Lý do khám */}
            <Col xs={12}>
              <Form.Group>
                <Form.Label className="fw-semibold">Lý do khám bệnh</Form.Label>
                <div className="d-flex flex-wrap gap-1 mb-2">
                  {QUICK_REASONS.map((r) => (
                    <Button
                      key={r}
                      type="button"
                      size="sm"
                      variant={form.reason === r ? "primary" : "outline-secondary"}
                      onClick={() => setForm((prev) => ({ ...prev, reason: r }))}
                      className="rounded-pill px-2 py-0"
                      style={{ fontSize: "0.75rem" }}
                    >
                      {r}
                    </Button>
                  ))}
                </div>
                <Input
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  placeholder="Nhập lý do hoặc triệu chứng khám bệnh..."
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={!shiftOnSelectedDate?.isWorking}>
              <i className="bi bi-calendar-check me-1"></i>
              Xác nhận Đặt lịch
            </Button>
          </div>
        </Form>
      </Modal>
    </Container>
  );
}

export default Appointments;
