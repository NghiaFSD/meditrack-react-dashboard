import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Card, Table, Form } from "react-bootstrap";
import Swal from "sweetalert2";
import Button from "../components/common/Button";
import EmptyState from "../components/common/EmptyState";
import Input from "../components/common/Input";
import Loading from "../components/common/Loading";
import Modal from "../components/common/Modal";
import SearchBox from "../components/common/SearchBox";
import ActionMenu from "../components/common/ActionMenu";
import StatCard from "../components/dashboard/StatCard";
import { doctorApi } from "../api/doctorApi";
import { appointmentApi } from "../api/appointmentApi";
import { recordApi } from "../api/recordApi";
import { isValidEmail, isValidPhone } from "../utils/validation";

const INITIAL_DOCTOR = {
  fullName: "",
  specialization: "Nội tiết",
  room: "A-201",
  shift: "Morning",
  phone: "",
  email: "",
};

const SPECIALTIES = [
  "Nội tiết",
  "Nội tổng quát",
  "Tim mạch",
  "Dinh dưỡng",
  "Thần kinh",
  "Cơ xương khớp",
  "Nhãn khoa",
];

/**
 * Trang Quản lý Đội ngũ Bác sĩ dành riêng cho Quản trị viên (Admin - Thuần Tiếng Việt)
 */
function Doctors() {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [shiftFilter, setShiftFilter] = useState("All");
  const [specialtyFilter, setSpecialtyFilter] = useState("All");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [form, setForm] = useState(INITIAL_DOCTOR);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const [docs, appts, recs] = await Promise.all([
        doctorApi.getAll(),
        appointmentApi.getAll(),
        recordApi.getAll(),
      ]);
      setDoctors(docs || []);
      setAppointments(appts || []);
      setRecords(recs || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  // Tính số lượng bệnh nhân do từng bác sĩ phụ trách
  const doctorPatientCountMap = useMemo(() => {
    const map = {};
    doctors.forEach((d) => {
      const dId = Number(d.id);
      const patientIds = new Set([
        ...appointments.filter((a) => Number(a.doctorId) === dId).map((a) => Number(a.patientId)),
        ...records.filter((r) => Number(r.doctorId) === dId).map((r) => Number(r.patientId)),
      ]);
      map[d.id] = patientIds.size;
    });
    return map;
  }, [doctors, appointments, records]);

  // Bộ lọc tìm kiếm
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const q = search.toLowerCase();
      const matchSearch =
        (doc.fullName || "").toLowerCase().includes(q) ||
        (doc.email || "").toLowerCase().includes(q) ||
        (doc.phone || "").includes(q) ||
        (doc.specialization || doc.specialty || "").toLowerCase().includes(q) ||
        (doc.room || "").toLowerCase().includes(q);

      const matchShift = shiftFilter === "All" || doc.shift === shiftFilter;
      const matchSpecialty =
        specialtyFilter === "All" ||
        (doc.specialization || doc.specialty) === specialtyFilter;

      return matchSearch && matchShift && matchSpecialty;
    });
  }, [doctors, search, shiftFilter, specialtyFilter]);

  // KPI Thống kê
  const morningShifts = doctors.filter((d) => d.shift === "Morning").length;
  const afternoonShifts = doctors.filter((d) => d.shift === "Afternoon").length;
  const uniqueSpecialties = new Set(
    doctors.map((d) => d.specialization || d.specialty).filter(Boolean)
  ).size;

  const handleOpenAdd = () => {
    setEditingDoctor(null);
    setForm(INITIAL_DOCTOR);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (doc) => {
    setEditingDoctor(doc);
    setForm({
      fullName: doc.fullName || "",
      specialization: doc.specialization || doc.specialty || "Nội tiết",
      room: doc.room || "A-201",
      shift: doc.shift || "Morning",
      phone: doc.phone || "",
      email: doc.email || "",
    });
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!form.fullName.trim()) return "Họ và tên bác sĩ không được để trống.";
    if (!isValidEmail(form.email)) return "Email không đúng định dạng.";
    if (!isValidPhone(form.phone)) return "Số điện thoại phải từ 9 - 11 chữ số.";
    if (!form.room.trim()) return "Vui lòng nhập phòng khám làm việc.";

    const normEmail = form.email.trim().toLowerCase();
    const normPhone = form.phone.trim();
    const duplicate = doctors.find((d) => {
      const sameEmail = (d.email || "").trim().toLowerCase() === normEmail;
      const samePhone = (d.phone || "").trim() === normPhone;
      const sameId = editingDoctor && Number(d.id) === Number(editingDoctor.id);
      return !sameId && (sameEmail || samePhone);
    });

    if (duplicate) {
      return "Email hoặc Số điện thoại đã được sử dụng bởi bác sĩ khác.";
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const valMsg = validateForm();
    if (valMsg) {
      Swal.fire("Dữ liệu không hợp lệ", valMsg, "warning");
      return;
    }

    const payload = {
      ...form,
      specialty: form.specialization, // hỗ trợ cả 2 tên field
    };

    try {
      if (editingDoctor) {
        await doctorApi.update(editingDoctor.id, payload);
        Swal.fire("Thành công", "Cập nhật thông tin bác sĩ thành công!", "success");
      } else {
        await doctorApi.create(payload);
        Swal.fire("Thành công", "Thêm bác sĩ mới vào hệ thống thành công!", "success");
      }
      setIsModalOpen(false);
      fetchDoctors();
    } catch (err) {
      Swal.fire("Lỗi", "Không thể lưu thông tin bác sĩ.", "error");
    }
  };

  const handleDelete = async (doc) => {
    const result = await Swal.fire({
      title: "Xác nhận xóa bác sĩ?",
      text: `Hành động này sẽ xóa bác sĩ ${doc.fullName} khỏi hệ thống.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#dc3545",
    });

    if (result.isConfirmed) {
      try {
        const hasAppointments = appointments.some((a) => Number(a.doctorId) === Number(doc.id));
        const hasRecords = records.some((r) => Number(r.doctorId) === Number(doc.id));

        if (hasAppointments || hasRecords) {
          Swal.fire(
            "Không thể xóa",
            "Bác sĩ này đang phụ trách lịch hẹn hoặc hồ sơ bệnh án của bệnh nhân.",
            "warning"
          );
          return;
        }

        await doctorApi.remove(doc.id);
        Swal.fire("Đã xóa", "Xóa bác sĩ thành công.", "success");
        fetchDoctors();
      } catch (err) {
        Swal.fire("Lỗi", "Không thể xóa bác sĩ.", "error");
      }
    }
  };

  if (loading) return <Loading text="Đang tải dữ liệu bác sĩ..." />;

  return (
    <Container fluid className="px-0">
      {/* Tiêu đề & Nút Thêm */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">Quản lý Đội ngũ Bác sĩ</h2>
          <p className="text-muted mb-0">
            Quản trị viên quản lý danh sách, chuyên khoa, phòng khám và phân bổ ca trực của bác sĩ.
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenAdd} className="d-flex align-items-center gap-2 shadow-sm">
          <i className="bi bi-person-plus-fill"></i>
          <span>+ Thêm Bác sĩ mới</span>
        </Button>
      </div>

      {/* 4 Thẻ KPI Đội ngũ Bác sĩ */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Tổng số Bác sĩ"
            value={doctors.length}
            icon={<i className="bi bi-person-badge-fill"></i>}
            note="Bác sĩ trong viện"
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Trực Ca Sáng"
            value={morningShifts}
            icon={<i className="bi bi-sun-fill text-warning"></i>}
            note="07:30 - 11:30"
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Trực Ca Chiều"
            value={afternoonShifts}
            icon={<i className="bi bi-moon-stars-fill text-info"></i>}
            note="13:30 - 17:30"
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Chuyên khoa"
            value={uniqueSpecialties}
            icon={<i className="bi bi-hospital-fill text-danger"></i>}
            note="Khoa phòng điều trị"
          />
        </Col>
      </Row>

      {/* Thanh công cụ: Tìm kiếm + Lọc */}
      <Card className="border-0 shadow-sm rounded-3 mb-4">
        <Card.Body className="p-3">
          <Row className="g-3">
            <Col xs={12} md={6}>
              <SearchBox
                value={search}
                onChange={setSearch}
                placeholder="Tìm theo tên bác sĩ, email, SĐT, chuyên khoa, phòng khám..."
              />
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Form.Select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="bg-light"
              >
                <option value="All">Tất cả chuyên khoa</option>
                {SPECIALTIES.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Form.Select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className="bg-light"
              >
                <option value="All">Tất cả ca trực</option>
                <option value="Morning">Ca sáng (Morning)</option>
                <option value="Afternoon">Ca chiều (Afternoon)</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Bảng danh sách Bác sĩ */}
      <Card className="border-0 shadow-sm rounded-3">
        <Card.Body className="p-0">
          {filteredDoctors.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Không tìm thấy bác sĩ"
                message="Không có bác sĩ nào phù hợp với bộ lọc tìm kiếm."
                icon="bi-person-x"
              />
            </div>
          ) : (
            <Table responsive hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">ID</th>
                  <th>Bác sĩ</th>
                  <th>Chuyên khoa</th>
                  <th>Phòng khám</th>
                  <th>Ca trực</th>
                  <th>Số điện thoại</th>
                  <th>Email</th>
                  <th className="text-center">Bệnh nhân phụ trách</th>
                  <th className="text-center pe-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.map((doc) => (
                  <tr key={doc.id}>
                    <td className="ps-3 text-muted">#{doc.id}</td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold small shadow-sm"
                          style={{ width: "34px", height: "34px" }}
                        >
                          {doc.fullName?.charAt(0) || "D"}
                        </div>
                        <span className="fw-semibold text-dark">{doc.fullName}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border fw-medium px-2 py-1">
                        {doc.specialization || doc.specialty || "Nội tổng quát"}
                      </span>
                    </td>
                    <td className="fw-medium text-primary">{doc.room || "A-201"}</td>
                    <td>
                      <span
                        className={`badge ${
                          doc.shift === "Morning"
                            ? "bg-warning bg-opacity-10 text-warning border border-warning"
                            : "bg-info bg-opacity-10 text-info border border-info"
                        } px-2 py-1 fw-semibold`}
                      >
                        {doc.shift === "Morning" ? "☀️ Ca sáng" : "🌙 Ca chiều"}
                      </span>
                    </td>
                    <td>{doc.phone}</td>
                    <td>{doc.email}</td>
                    <td className="text-center">
                      <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-1 fw-bold rounded-pill">
                        {doctorPatientCountMap[doc.id] || 0} bệnh nhân
                      </span>
                    </td>
                    <td className="text-center pe-3">
                      <ActionMenu
                        items={[
                          {
                            label: "Chỉnh sửa",
                            icon: <i className="bi bi-pencil-square text-success"></i>,
                            onClick: () => handleOpenEdit(doc),
                          },
                          {
                            label: "Xóa",
                            icon: <i className="bi bi-trash3 text-danger"></i>,
                            tone: "danger",
                            onClick: () => handleDelete(doc),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Modal Thêm / Chỉnh sửa Bác sĩ */}
      <Modal
        title={editingDoctor ? "Chỉnh sửa Thông tin Bác sĩ" : "Thêm Bác sĩ mới"}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="lg"
      >
        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col xs={12} md={6}>
              <Input
                label="Họ và tên Bác sĩ"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Ví dụ: Dr. Nguyễn Văn An"
                required
              />
            </Col>

            <Col xs={12} md={6}>
              <Form.Group className="mb-3" controlId="docSpecialty">
                <Form.Label className="fw-semibold">Chuyên khoa</Form.Label>
                <Form.Select
                  name="specialization"
                  value={form.specialization}
                  onChange={handleChange}
                >
                  {SPECIALTIES.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col xs={12} md={6}>
              <Input
                label="Phòng khám"
                name="room"
                value={form.room}
                onChange={handleChange}
                placeholder="Ví dụ: A-201, B-102..."
                required
              />
            </Col>

            <Col xs={12} md={6}>
              <Form.Group className="mb-3" controlId="docShift">
                <Form.Label className="fw-semibold">Ca trực</Form.Label>
                <Form.Select name="shift" value={form.shift} onChange={handleChange}>
                  <option value="Morning">Ca sáng (07:30 - 11:30)</option>
                  <option value="Afternoon">Ca chiều (13:30 - 17:30)</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col xs={12} md={6}>
              <Input
                label="Số điện thoại"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="0981234567"
                required
              />
            </Col>

            <Col xs={12} md={6}>
              <Input
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="doctor@gmail.com"
                required
              />
            </Col>
          </Row>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              {editingDoctor ? "Lưu thay đổi" : "Thêm Bác sĩ"}
            </Button>
          </div>
        </Form>
      </Modal>
    </Container>
  );
}

export default Doctors;
