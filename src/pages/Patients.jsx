import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Table, Form, Button as BsButton } from "react-bootstrap";
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
import { useLanguage } from "../context/LanguageContext";
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
 * Trang quản lý bệnh nhân: CRUD + search/filter + i18n sử dụng React-Bootstrap
 */
function Patients() {
  const navigate = useNavigate();
  const { patients, loading, error, fetchPatients } = usePatients();
  const { lang, t } = useLanguage();
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
    if (!form.fullName.trim()) return "Full name is required.";
    if (!isValidEmail(form.email)) return "Email is invalid.";
    if (!isValidPhone(form.phone)) return "Phone must contain 9-11 digits.";
    if (Number(form.age) <= 0) return "Age must be greater than 0.";

    const normalizedEmail = form.email.trim().toLowerCase();
    const normalizedPhone = form.phone.trim();
    const duplicatePatient = patients.find((patient) => {
      const sameEmail = patient.email.trim().toLowerCase() === normalizedEmail;
      const samePhone = patient.phone.trim() === normalizedPhone;
      const sameId = editingPatient && Number(patient.id) === Number(editingPatient.id);

      return !sameId && (sameEmail || samePhone);
    });

    if (duplicatePatient) {
      return t("patients.valDuplicate");
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationMessage = validateForm();
    if (validationMessage) {
      Swal.fire(t("patients.valInvalidData"), validationMessage, "warning");
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
        Swal.fire(t("patientEdit.updateSuccessTitle"), t("patients.valUpdateSuccess"), "success");
      } else {
        await patientApi.create(payload);
        Swal.fire(lang === "vi" ? "Thành công" : "Created", t("patients.valCreateSuccess"), "success");
      }

      setIsModalOpen(false);
      fetchPatients();
    } catch (err) {
      Swal.fire(t("patientEdit.updateErrorTitle"), t("patients.valSaveError"), "error");
    }
  };

  const handleDelete = async (patient) => {
    if (!canManagePatients) {
      Swal.fire(t("common.forbidden"), t("common.onlyAdminsCanDelete"), "warning");
      return;
    }

    const result = await Swal.fire({
      title: t("patients.deleteConfirmTitle"),
      text:
        lang === "vi"
          ? `Hành động này sẽ xóa bệnh nhân ${patient.fullName}.`
          : `This will remove ${patient.fullName}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t("patients.btnDelete"),
      cancelButtonText: t("patients.btnCancel"),
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
          Swal.fire(t("patients.cannotDeleteTitle"), t("patients.cannotDeleteText"), "warning");
          return;
        }

        await patientApi.remove(patient.id);
        Swal.fire(t("patients.deleteSuccessTitle"), t("patients.deleteSuccessText"), "success");
        fetchPatients();
      } catch (err) {
        Swal.fire(
          t("patientEdit.updateErrorTitle"),
          lang === "vi" ? "Không thể xóa bệnh nhân." : "Cannot delete patient.",
          "error"
        );
      }
    }
  };

  if (loading) return <Loading text={t("common.loading")} />;

  return (
    <Container fluid className="px-0">
      {/* Header & Nút thêm bệnh nhân */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">{t("patients.title")}</h2>
          <p className="text-muted mb-0">
            {canManagePatients ? t("patients.subtitleAdmin") : t("patients.subtitleView")}
          </p>
        </div>
        {canManagePatients && (
          <Button variant="primary" onClick={openAddModal} className="d-flex align-items-center gap-2 shadow-sm">
            <i className="bi bi-person-plus-fill"></i>
            <span>{t("patients.addPatient")}</span>
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
                placeholder={t("patients.searchPlaceholder")}
              />
            </Col>
            <Col xs={12} md={4}>
              <Form.Select
                value={genderFilter}
                onChange={(event) => setGenderFilter(event.target.value)}
                className="bg-light"
              >
                <option value="All">{t("patients.allGenders")}</option>
                <option value="Male">{t("patients.male")}</option>
                <option value="Female">{t("patients.female")}</option>
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
                title={t("patients.noPatientsFound")}
                message={t("patients.noPatientsMsg")}
                icon="bi-person-x"
              />
            </div>
          ) : (
            <Table responsive hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">{t("patients.tableId")}</th>
                  <th>{t("patients.tableCode")}</th>
                  <th>{t("patients.tableName")}</th>
                  <th>{t("patients.tableGender")}</th>
                  <th>{t("patients.tableAge")}</th>
                  <th>{t("patients.tableInsurance")}</th>
                  <th>{t("patients.tableRisk")}</th>
                  <th>{t("patients.tableLastVisit")}</th>
                  <th>{t("patients.tablePhone")}</th>
                  <th>{t("patients.tableEmail")}</th>
                  <th>{t("patients.tableStatus")}</th>
                  <th className="text-center pe-3">{t("patients.tableAction")}</th>
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
                    <td>{patient.gender === "Male" ? t("patients.male") : t("patients.female")}</td>
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
                            label: t("patients.btnView"),
                            icon: <i className="bi bi-eye text-primary"></i>,
                            onClick: () => navigate(ROUTES.PATIENT_DETAIL(patient.id)),
                          },
                          ...(canManagePatients
                            ? [
                                {
                                  label: t("patients.btnEdit"),
                                  icon: <i className="bi bi-pencil-square text-success"></i>,
                                  onClick: () => navigate(ROUTES.PATIENT_EDIT(patient.id)),
                                },
                                {
                                  label: t("patients.btnDelete"),
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
        title={editingPatient ? t("patients.modalEditTitle") : t("patients.modalAddTitle")}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="lg"
      >
        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col xs={12} md={6}>
              <Input
                label={t("patients.lblFullName")}
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                required
              />
            </Col>
            <Col xs={12} md={6}>
              <Form.Group className="mb-3" controlId="patientGender">
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
            <Col xs={12} md={4}>
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
            <Col xs={12} md={6}>
              <Form.Group className="mb-3" controlId="patientStatus">
                <Form.Label className="fw-semibold">{t("patients.lblStatus")}</Form.Label>
                <Form.Select name="status" value={form.status} onChange={handleChange}>
                  <option value="Active">{t("common.statusActive")}</option>
                  <option value="Inactive">{t("common.statusInactive")}</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              {t("patients.btnCancel")}
            </Button>
            <Button variant="primary" type="submit">
              {t("patients.btnSave")}
            </Button>
          </div>
        </Form>
      </Modal>
    </Container>
  );
}

export default Patients;
