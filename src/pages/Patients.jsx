import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { recordApi } from "../api/recordApi";
import { usePatients } from "../hooks/usePatients";
import { ROLES } from "../utils/auth";
import { isValidEmail, isValidPhone } from "../utils/validation";
import { ROUTES } from "../config/routes";
import { useAuth } from "../context/AuthContext";

const emptyPatient = {
  patientCode: "",
  fullName: "",
  gender: "Male",
  age: "",
  phone: "",
  email: "",
  address: "",
  insuranceType: "Standard",
  riskLevel: "Low",
  lastVisit: "",
  status: "Active",
};

/**
 * Trang quản lý bệnh nhân: CRUD + search/filter (Thuần Tiếng Việt)
 */
function Patients() {
  const navigate = useNavigate();
  const { patients, loading, error, fetchPatients } = usePatients();
  const { user } = useAuth();
  const currentRole = user?.role;
  const canManagePatients = currentRole === ROLES.ADMIN;
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [form, setForm] = useState(emptyPatient);

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const keyword = search.toLowerCase();
      const matchSearch =
        patient.fullName.toLowerCase().includes(keyword) ||
        patient.email.toLowerCase().includes(keyword) ||
        patient.phone.includes(keyword);

      const matchGender = genderFilter === "All" || patient.gender === genderFilter;

      return matchSearch && matchGender;
    });
  }, [patients, search, genderFilter]);

  const openAddModal = () => {
    if (!canManagePatients) return;
    setEditingPatient(null);
    setForm(emptyPatient);
    setIsModalOpen(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!form.fullName.trim()) return "Họ và tên không được để trống.";
    if (!isValidEmail(form.email)) return "Email không đúng định dạng.";
    if (!isValidPhone(form.phone)) return "Số điện thoại phải từ 9 - 11 chữ số.";
    if (Number(form.age) <= 0) return "Tuổi phải lớn hơn 0.";

    const normalizedEmail = form.email.trim().toLowerCase();
    const normalizedPhone = form.phone.trim();
    const duplicatePatient = patients.find((patient) => {
      const sameEmail = patient.email.trim().toLowerCase() === normalizedEmail;
      const samePhone = patient.phone.trim() === normalizedPhone;
      const sameId = editingPatient && Number(patient.id) === Number(editingPatient.id);

      return !sameId && (sameEmail || samePhone);
    });

    if (duplicatePatient) {
      return "Email hoặc Số điện thoại đã được đăng ký cho bệnh nhân khác.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationMessage = validateForm();
    if (validationMessage) {
      Swal.fire("Dữ liệu không hợp lệ", validationMessage, "warning");
      return;
    }

    const nextPatientNumber =
      patients.reduce((highest, patient) => {
        const numericId = Number(patient.id);
        return Number.isFinite(numericId) && numericId > highest ? numericId : highest;
      }, 0) + 1;
    const fallbackPatientCode = editingPatient
      ? editingPatient.patientCode || `PT-${String(editingPatient.id).padStart(3, "0")}`
      : `PT-${String(nextPatientNumber).padStart(3, "0")}`;

    const payload = {
      ...form,
      patientCode: form.patientCode?.trim() || fallbackPatientCode,
      age: Number(form.age),
    };

    try {
      if (editingPatient) {
        await patientApi.update(editingPatient.id, payload);
        Swal.fire("Thành công", "Cập nhật thông tin bệnh nhân thành công!", "success");
      } else {
        await patientApi.create(payload);
        Swal.fire("Thành công", "Thêm bệnh nhân mới thành công!", "success");
      }

      setIsModalOpen(false);
      fetchPatients();
    } catch (err) {
      Swal.fire("Lỗi", "Đã có lỗi xảy ra khi lưu dữ liệu.", "error");
    }
  };

  const handleDelete = async (patient) => {
    if (!canManagePatients) {
      Swal.fire("Không có quyền", "Chỉ quản trị viên mới có quyền xóa dữ liệu.", "warning");
      return;
    }

    const result = await Swal.fire({
      title: "Xác nhận xóa bệnh nhân?",
      text: `Hành động này sẽ xóa bệnh nhân ${patient.fullName}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#dc3545",
    });

    if (result.isConfirmed) {
      try {
        const [appointments, records] = await Promise.all([
          appointmentApi.getAll(),
          recordApi.getAll(),
        ]);

        const hasAppointments = appointments.some((item) => Number(item.patientId) === Number(patient.id));
        const hasRecords = records.some((item) => Number(item.patientId) === Number(patient.id));

        if (hasAppointments || hasRecords) {
          Swal.fire(
            "Không thể xóa",
            "Bệnh nhân này đã có lịch hẹn hoặc hồ sơ bệnh án liên quan.",
            "warning"
          );
          return;
        }

        await patientApi.remove(patient.id);
        Swal.fire("Đã xóa", "Xóa bệnh nhân thành công.", "success");
        fetchPatients();
      } catch (err) {
        Swal.fire(
          "Lỗi",
          "Không thể xóa bệnh nhân.",
          "error"
        );
      }
    }
  };

  if (loading) return <Loading text="Đang tải dữ liệu..." />;

  return (
    <Container fluid className="px-0">
      {/* Header & Nút thêm bệnh nhân */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">Quản lý Bệnh nhân</h2>
          <p className="text-muted mb-0">
            {canManagePatients
              ? "Quản lý hồ sơ bệnh án và danh sách bệnh nhân trong hệ thống."
              : "Xem danh sách và thông tin chi tiết bệnh nhân."}
          </p>
        </div>
        {canManagePatients && (
          <Button variant="primary" onClick={openAddModal} className="d-flex align-items-center gap-2 shadow-sm">
            <i className="bi bi-person-plus-fill"></i>
            <span>+ Thêm Bệnh nhân</span>
          </Button>
        )}
      </div>

      {/* Thanh công cụ: Tìm kiếm + Lọc */}
      <Card className="border-0 shadow-sm rounded-3 mb-4">
        <Card.Body className="p-3">
          <Row className="g-3">
            <Col xs={12} md={8}>
              <SearchBox
                value={search}
                onChange={setSearch}
                placeholder="Tìm kiếm theo tên, email hoặc số điện thoại..."
              />
            </Col>
            <Col xs={12} md={4}>
              <Form.Select
                value={genderFilter}
                onChange={(event) => setGenderFilter(event.target.value)}
                className="bg-light"
              >
                <option value="All">Tất cả giới tính</option>
                <option value="Male">Nam</option>
                <option value="Female">Nữ</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error && <p className="text-danger mb-3">{error}</p>}

      {/* Bảng danh sách bệnh nhân */}
      <Card className="border-0 shadow-sm rounded-3">
        <Card.Body className="p-0">
          {filteredPatients.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Không tìm thấy bệnh nhân"
                message="Không có bệnh nhân nào phù hợp với bộ lọc tìm kiếm."
                icon="bi-person-x"
              />
            </div>
          ) : (
            <Table responsive hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">ID</th>
                  <th>Mã BN</th>
                  <th>Họ và tên</th>
                  <th>Giới tính</th>
                  <th>Tuổi</th>
                  <th>Bảo hiểm</th>
                  <th>Mức nguy cơ</th>
                  <th>Lần khám gần nhất</th>
                  <th>Số điện thoại</th>
                  <th>Email</th>
                  <th>Trạng thái</th>
                  <th className="text-center pe-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient) => (
                  <tr key={patient.id}>
                    <td className="ps-3 text-muted">#{patient.id}</td>
                    <td className="fw-semibold text-primary">
                      {patient.patientCode || `PT-${String(patient.id).padStart(3, "0")}`}
                    </td>
                    <td className="fw-medium text-dark">{patient.fullName}</td>
                    <td>{patient.gender === "Male" ? "Nam" : "Nữ"}</td>
                    <td>{patient.age}</td>
                    <td>
                      <StatusBadge status={patient.insuranceType || "Standard"} />
                    </td>
                    <td>
                      <StatusBadge status={patient.riskLevel || "Low"} />
                    </td>
                    <td>{patient.lastVisit || "-"}</td>
                    <td>{patient.phone}</td>
                    <td>{patient.email}</td>
                    <td>
                      <StatusBadge status={patient.status || "Active"} />
                    </td>
                    <td className="text-center pe-3">
                      <ActionMenu
                        items={[
                          {
                            label: "Xem chi tiết",
                            icon: <i className="bi bi-eye text-primary"></i>,
                            onClick: () => navigate(ROUTES.PATIENT_DETAIL(patient.id)),
                          },
                          ...(canManagePatients
                            ? [
                                {
                                  label: "Chỉnh sửa",
                                  icon: <i className="bi bi-pencil-square text-success"></i>,
                                  onClick: () => navigate(ROUTES.PATIENT_EDIT(patient.id)),
                                },
                                {
                                  label: "Xóa",
                                  icon: <i className="bi bi-trash3 text-danger"></i>,
                                  tone: "danger",
                                  onClick: () => handleDelete(patient),
                                },
                              ]
                            : []),
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

      {/* Modal Thêm/Sửa Bệnh nhân */}
      <Modal
        title={editingPatient ? "Chỉnh sửa Bệnh nhân" : "Thêm Bệnh nhân mới"}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="lg"
      >
        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col xs={12} md={6}>
              <Input
                label="Họ và tên"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                required
              />
            </Col>
            <Col xs={12} md={6}>
              <Form.Group className="mb-3" controlId="patientGender">
                <Form.Label className="fw-semibold">Giới tính</Form.Label>
                <Form.Select name="gender" value={form.gender} onChange={handleChange}>
                  <option value="Male">Nam</option>
                  <option value="Female">Nữ</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col xs={12} md={4}>
              <Input
                label="Tuổi"
                name="age"
                type="number"
                value={form.age}
                onChange={handleChange}
                required
              />
            </Col>
            <Col xs={12} md={4}>
              <Input
                label="Số điện thoại"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
              />
            </Col>
            <Col xs={12} md={4}>
              <Input
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </Col>

            <Col xs={12} md={6}>
              <Input
                label="Địa chỉ"
                name="address"
                value={form.address}
                onChange={handleChange}
              />
            </Col>
            <Col xs={12} md={6}>
              <Form.Group className="mb-3" controlId="patientStatus">
                <Form.Label className="fw-semibold">Trạng thái</Form.Label>
                <Form.Select name="status" value={form.status} onChange={handleChange}>
                  <option value="Active">Đang hoạt động</option>
                  <option value="Inactive">Ngưng hoạt động</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Lưu thông tin
            </Button>
          </div>
        </Form>
      </Modal>
    </Container>
  );
}

export default Patients;
