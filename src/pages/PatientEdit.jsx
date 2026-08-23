import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Container, Card, Form, Row, Col } from "react-bootstrap";
import Swal from "sweetalert2";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import Loading from "../components/common/Loading";
import { patientApi } from "../api/patientApi";
import { isValidEmail, isValidPhone } from "../utils/validation";
import { ROUTES } from "../config/routes";

const initialForm = {
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
 * Trang chỉnh sửa bệnh nhân (Route: /patients/:id/edit) sử dụng React-Bootstrap (Thuần Tiếng Việt)
 */
function PatientEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchPatientData() {
      try {
        setLoading(true);
        const data = await patientApi.getById(id);
        if (data) {
          setForm({
            patientCode: data.patientCode || "",
            fullName: data.fullName || "",
            gender: data.gender || "Male",
            age: data.age || "",
            phone: data.phone || "",
            email: data.email || "",
            address: data.address || "",
            insuranceType: data.insuranceType || "Standard",
            riskLevel: data.riskLevel || "Low",
            lastVisit: data.lastVisit || "",
            status: data.status || "Active",
          });
        }
      } catch (err) {
        Swal.fire("Lỗi", "Không thể tải thông tin bệnh nhân.", "error");
        navigate(ROUTES.PATIENTS);
      } finally {
        setLoading(false);
      }
    }

    fetchPatientData();
  }, [id, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = async () => {
    if (!form.fullName.trim()) return "Họ và tên không được để trống.";
    if (!isValidEmail(form.email)) return "Email không đúng định dạng.";
    if (!isValidPhone(form.phone)) return "Số điện thoại phải từ 9 - 11 chữ số.";
    if (Number(form.age) <= 0) return "Tuổi phải lớn hơn 0.";

    try {
      const allPatients = await patientApi.getAll();
      const normalizedEmail = form.email.trim().toLowerCase();
      const normalizedPhone = form.phone.trim();

      const duplicatePatient = allPatients.find((patient) => {
        const sameEmail = patient.email.trim().toLowerCase() === normalizedEmail;
        const samePhone = patient.phone.trim() === normalizedPhone;
        const sameId = Number(patient.id) === Number(id);

        return !sameId && (sameEmail || samePhone);
      });

      if (duplicatePatient) {
        return "Email hoặc Số điện thoại đã được đăng ký cho bệnh nhân khác.";
      }
    } catch (err) {
      // ignore fetch all error during validation
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationMessage = await validateForm();
    if (validationMessage) {
      Swal.fire("Dữ liệu không hợp lệ", validationMessage, "warning");
      return;
    }

    const payload = {
      ...form,
      age: Number(form.age),
    };

    try {
      setSubmitting(true);
      await patientApi.update(id, payload);
      await Swal.fire(
        "Thành công",
        "Cập nhật thông tin bệnh nhân thành công!",
        "success"
      );
      navigate(ROUTES.PATIENT_DETAIL(id));
    } catch (err) {
      Swal.fire("Lỗi", "Không thể cập nhật thông tin bệnh nhân.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading text="Đang tải dữ liệu..." />;

  return (
    <Container fluid className="px-0">
      {/* Tiêu đề trang */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">
            Chỉnh sửa Bệnh nhân #{id}
          </h2>
          <p className="text-muted mb-0">
            Cập nhật hồ sơ bệnh án và thông tin cá nhân cho {form.fullName || "bệnh nhân"}.
          </p>
        </div>
        <Link to={ROUTES.PATIENT_DETAIL(id)}>
          <Button variant="outline-secondary" className="d-flex align-items-center gap-1">
            <i className="bi bi-arrow-left"></i>
            <span>← Quay lại chi tiết</span>
          </Button>
        </Link>
      </div>

      {/* Form chỉnh sửa */}
      <Card className="border-0 shadow-sm rounded-3">
        <Card.Body className="p-4">
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
                <Form.Group className="mb-3" controlId="editGender">
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
                <Form.Group className="mb-3" controlId="editInsurance">
                  <Form.Label className="fw-semibold">Loại bảo hiểm</Form.Label>
                  <Form.Select
                    name="insuranceType"
                    value={form.insuranceType}
                    onChange={handleChange}
                  >
                    <option value="Basic">Cơ bản</option>
                    <option value="Standard">Tiêu chuẩn</option>
                    <option value="Premium">Cao cấp</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group className="mb-3" controlId="editRisk">
                  <Form.Label className="fw-semibold">Mức độ nguy cơ</Form.Label>
                  <Form.Select name="riskLevel" value={form.riskLevel} onChange={handleChange}>
                    <option value="Low">Thấp</option>
                    <option value="Medium">Trung bình</option>
                    <option value="High">Cao</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group className="mb-3" controlId="editStatus">
                  <Form.Label className="fw-semibold">Trạng thái</Form.Label>
                  <Form.Select name="status" value={form.status} onChange={handleChange}>
                    <option value="Active">Đang hoạt động</option>
                    <option value="Inactive">Ngưng hoạt động</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
              <Link to={ROUTES.PATIENT_DETAIL(id)}>
                <Button variant="secondary" type="button">
                  Hủy
                </Button>
              </Link>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default PatientEdit;
