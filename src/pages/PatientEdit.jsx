import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import Loading from "../components/common/Loading";
import { patientApi } from "../api/patientApi";
import { isValidEmail, isValidPhone } from "../utils/validation";
import { useLanguage } from "../context/LanguageContext";

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

// Trang chỉnh sửa bệnh nhân riêng theo tiêu chí Activity 3 (React Router + useParams + useNavigate + PUT API + i18n).
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
        navigate("/patients");
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
    if (!form.fullName.trim()) return "Full name is required.";
    if (!isValidEmail(form.email)) return "Email is invalid.";
    if (!isValidPhone(form.phone)) return "Phone must contain 9-11 digits.";
    if (Number(form.age) <= 0) return "Age must be greater than 0.";

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
        return "Email or phone already exists in another patient profile.";
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
      Swal.fire("Invalid data", validationMessage, "warning");
      return;
    }

    const payload = {
      ...form,
      age: Number(form.age),
    };

    try {
      setSubmitting(true);
      // PUT Request to update existing patient details
      await patientApi.update(id, payload);
      await Swal.fire("Updated", "Patient details updated successfully.", "success");
      // Redirect back to Patient Detail page using useNavigate
      navigate(`/patients/${id}`);
    } catch (err) {
      Swal.fire("Error", "Failed to update patient.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading text={t("common.loading")} />;

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>{lang === "vi" ? `Chỉnh sửa Bệnh nhân #${id}` : `Edit Patient #${id}`}</h1>
          <p>{lang === "vi" ? `Cập nhật hồ sơ bệnh án và thông tin cá nhân cho ${form.fullName || "bệnh nhân"}.` : `Update medical profile and personal details for ${form.fullName || "patient"}.`}</p>
        </div>
        <Link className="btn btn-secondary" to={`/patients/${id}`}>
          {t("patientEdit.btnCancelBack")}
        </Link>
      </div>

      <div className="table-card" style={{ maxWidth: "800px", margin: "0 auto" }}>
        <form onSubmit={handleSubmit} className="form-grid">
          <Input
            label={t("patientDetail.code")}
            name="patientCode"
            value={form.patientCode}
            onChange={handleChange}
            disabled
          />
          <Input
            label={t("patients.lblFullName")}
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            required
          />
          <div className="form-group">
            <label>{t("patients.lblGender")}</label>
            <select name="gender" value={form.gender} onChange={handleChange}>
              <option value="Male">{t("patients.male")}</option>
              <option value="Female">{t("patients.female")}</option>
            </select>
          </div>
          <Input
            label={t("patients.lblAge")}
            name="age"
            type="number"
            value={form.age}
            onChange={handleChange}
            required
          />
          <Input
            label={t("patients.lblPhone")}
            name="phone"
            value={form.phone}
            onChange={handleChange}
            required
          />
          <Input
            label={t("patients.lblEmail")}
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <Input
            label={t("patients.lblAddress")}
            name="address"
            value={form.address}
            onChange={handleChange}
          />
          <div className="form-group">
            <label>{t("patients.lblInsurance")}</label>
            <select name="insuranceType" value={form.insuranceType} onChange={handleChange}>
              <option value="Basic">{t("common.insuranceBasic")}</option>
              <option value="Standard">{t("common.insuranceStandard")}</option>
              <option value="Premium">{t("common.insurancePremium")}</option>
            </select>
          </div>
          <div className="form-group">
            <label>{t("patients.lblRisk")}</label>
            <select name="riskLevel" value={form.riskLevel} onChange={handleChange}>
              <option value="Low">{t("common.riskLow")}</option>
              <option value="Medium">{t("common.riskMedium")}</option>
              <option value="High">{t("common.riskHigh")}</option>
            </select>
          </div>
          <div className="form-group">
            <label>{t("patients.lblStatus")}</label>
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="Active">{t("common.statusActive")}</option>
              <option value="Inactive">{t("common.statusInactive")}</option>
            </select>
          </div>

          <div className="modal-actions" style={{ gridColumn: "1 / -1", marginTop: "1rem" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(`/patients/${id}`)}
            >
              {t("patientEdit.btnCancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t("patientEdit.btnSaving") : t("patientEdit.btnUpdate")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PatientEdit;
