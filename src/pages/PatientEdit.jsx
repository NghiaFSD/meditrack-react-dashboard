import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Container, Card, Form, Row, Col } from "react-bootstrap";
import Swal from "sweetalert2";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import Loading from "../components/common/Loading";
import { patientApi } from "../api/patientApi";
import { isValidEmail, isValidPhone } from "../utils/validation";
import { useLanguage } from "../context/LanguageContext";
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
 * Trang chỉnh sửa bệnh nhân (Route: /patients/:id/edit) sử dụng React-Bootstrap
 */
function PatientEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();

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
        Swal.fire("Error", "Cannot load patient data.", "error");
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
    if (!form.fullName.trim()) return t("patients.valFullNameReq");
    if (!isValidEmail(form.email)) return t("patients.valEmailInvalid");
    if (!isValidPhone(form.phone)) return t("patients.valPhoneInvalid");
    if (Number(form.age) <= 0) return t("patients.valAgeInvalid");

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
        return t("patients.valDuplicate");
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
      Swal.fire(t("patients.valInvalidData"), validationMessage, "warning");
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
        t("patientEdit.updateSuccessTitle"),
        t("patientEdit.updateSuccessText"),
        "success"
      );
      navigate(ROUTES.PATIENT_DETAIL(id));
    } catch (err) {
      Swal.fire(t("patientEdit.updateErrorTitle"), t("patientEdit.updateErrorText"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading text={t("common.loading")} />;

  return (
    <Container fluid className="px-0">
      {/* Tiêu đề trang */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">
            {lang === "vi" ? `Chỉnh sửa Bệnh nhân #${id}` : `Edit Patient #${id}`}
          </h2>
          <p className="text-muted mb-0">
            {lang === "vi"
              ? `Cập nhật hồ sơ bệnh án và thông tin cá nhân cho ${form.fullName || "bệnh nhân"}.`
              : `Update medical profile and personal details for ${form.fullName || "patient"}.`}
          </p>
        </div>
        <Link to={ROUTES.PATIENT_DETAIL(id)}>
          <Button variant="outline-secondary" className="d-flex align-items-center gap-1">
            <i className="bi bi-arrow-left"></i>
            <span>{t("patientEdit.btnCancelBack")}</span>
          </Button>
        </Link>
      </div>

      {/* Form chỉnh sửa thông tin */}
      <Row className="justify-content-center">
        <Col xs={12} lg={10}>
          <Card className="border-0 shadow-sm rounded-3">
            <Card.Body className="p-4">
              <Form onSubmit={handleSubmit}>
                <Row className="g-3">
                  <Col xs={12} md={6}>
                    <Input
                      label={t("patientDetail.code")}
                      name="patientCode"
                      value={form.patientCode}
                      onChange={handleChange}
                      disabled
                    />
                  </Col>
                  <Col xs={12} md={6}>
                    <Input
                      label={t("patients.lblFullName")}
                      name="fullName"
                      value={form.fullName}
                      onChange={handleChange}
                      required
                    />
                  </Col>

                  <Col xs={12} md={4}>
                    <Form.Group className="mb-3" controlId="editGender">
                      <Form.Label className="fw-semibold">{t("patients.lblGender")}</Form.Label>
                      <Form.Select name="gender" value={form.gender} onChange={handleChange}>
                        <option value="Male">{t("patients.male")}</option>
                        <option value="Female">{t("patients.female")}</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={4}>
                    <Input
                      label={t("patients.lblAge")}
                      name="age"
                      type="number"
                      value={form.age}
                      onChange={handleChange}
                      required
                    />
                  </Col>
                  <Col xs={12} md={4}>
                    <Input
                      label={t("patients.lblPhone")}
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      required
                    />
                  </Col>

                  <Col xs={12} md={6}>
                    <Input
                      label={t("patients.lblEmail")}
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </Col>
                  <Col xs={12} md={6}>
                    <Input
                      label={t("patients.lblAddress")}
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                    />
                  </Col>

                  <Col xs={12} md={4}>
                    <Form.Group className="mb-3" controlId="editInsurance">
                      <Form.Label className="fw-semibold">{t("patients.lblInsurance")}</Form.Label>
                      <Form.Select
                        name="insuranceType"
                        value={form.insuranceType}
                        onChange={handleChange}
                      >
                        <option value="Basic">{t("common.insuranceBasic")}</option>
                        <option value="Standard">{t("common.insuranceStandard")}</option>
                        <option value="Premium">{t("common.insurancePremium")}</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={4}>
                    <Form.Group className="mb-3" controlId="editRisk">
                      <Form.Label className="fw-semibold">{t("patients.lblRisk")}</Form.Label>
                      <Form.Select name="riskLevel" value={form.riskLevel} onChange={handleChange}>
                        <option value="Low">{t("common.riskLow")}</option>
                        <option value="Medium">{t("common.riskMedium")}</option>
                        <option value="High">{t("common.riskHigh")}</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={4}>
                    <Form.Group className="mb-3" controlId="editStatus">
                      <Form.Label className="fw-semibold">{t("patients.lblStatus")}</Form.Label>
                      <Form.Select name="status" value={form.status} onChange={handleChange}>
                        <option value="Active">{t("common.statusActive")}</option>
                        <option value="Inactive">{t("common.statusInactive")}</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate(ROUTES.PATIENT_DETAIL(id))}
                  >
                    {t("patientEdit.btnCancel")}
                  </Button>
                  <Button variant="primary" type="submit" disabled={submitting}>
                    {submitting ? t("patientEdit.btnSaving") : t("patientEdit.btnUpdate")}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default PatientEdit;
