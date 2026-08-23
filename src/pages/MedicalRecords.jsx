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
import { recordApi } from "../api/recordApi";
import { patientApi } from "../api/patientApi";
import { doctorApi } from "../api/doctorApi";
import { useRecords } from "../hooks/useRecords";
import { useAuth } from "../context/AuthContext";
import { ROLES, findLinkedDoctor, findLinkedPatient } from "../utils/auth";
import { useLanguage } from "../context/LanguageContext";
import { translateDiagnosis } from "../utils/translations";

const emptyRecord = {
  patientId: "",
  doctorId: "",
  date: "",
  glucose: "",
  hba1c: "",
  bmi: "",
  bloodPressure: "",
  riskLevel: "Low",
  followUpDate: "",
  diagnosis: "",
  note: "",
};

/**
 * Trang quản lý Hồ sơ bệnh án (CRUD + Xem chỉ số sức khỏe) sử dụng React-Bootstrap
 */
function MedicalRecords() {
  const { records, loading, fetchRecords } = useRecords();
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const currentRole = user?.role;

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState(emptyRecord);

  useEffect(() => {
    async function loadRefs() {
      const [p, d] = await Promise.all([patientApi.getAll(), doctorApi.getAll()]);
      setPatients(p);
      setDoctors(d);
    }
    loadRefs();
  }, []);

  const linkedPatient = useMemo(() => findLinkedPatient(patients, user), [patients, user]);
  const linkedDoctor = useMemo(() => findLinkedDoctor(doctors, user), [doctors, user]);

  const canManage = [ROLES.ADMIN, ROLES.DOCTOR].includes(currentRole);

  const getPatientName = (id) =>
    patients.find((p) => Number(p.id) === Number(id))?.fullName || "Unknown";
  const getDoctorName = (id) =>
    doctors.find((d) => Number(d.id) === Number(id))?.fullName || "Unknown";

  const filteredRecords = useMemo(() => {
    const scoped = records.filter((r) => {
      if (currentRole === ROLES.PATIENT && linkedPatient)
        return Number(r.patientId) === Number(linkedPatient.id);
      if (currentRole === ROLES.DOCTOR && linkedDoctor)
        return Number(r.doctorId) === Number(linkedDoctor.id);
      return true;
    });

    return scoped.filter((r) => {
      const q = search.toLowerCase();
      return (
        getPatientName(r.patientId).toLowerCase().includes(q) ||
        getDoctorName(r.doctorId).toLowerCase().includes(q) ||
        r.diagnosis.toLowerCase().includes(q)
      );
    });
  }, [records, patients, doctors, search, currentRole, linkedPatient, linkedDoctor]);

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setForm({
      ...emptyRecord,
      patientId: linkedPatient ? String(linkedPatient.id) : patients[0]?.id || "",
      doctorId: linkedDoctor ? String(linkedDoctor.id) : doctors[0]?.id || "",
      date: new Date().toISOString().slice(0, 10),
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec) => {
    setEditingRecord(rec);
    setForm(rec);
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patientId || !form.doctorId || !form.date || !form.diagnosis) {
      Swal.fire(
        lang === "vi" ? "Thiếu thông tin" : "Missing fields",
        lang === "vi"
          ? "Vui lòng điền đầy đủ bệnh nhân, bác sĩ, ngày khám và chẩn đoán."
          : "Please fill in patient, doctor, date and diagnosis.",
        "warning"
      );
      return;
    }

    try {
      if (editingRecord) {
        await recordApi.update(editingRecord.id, form);
        Swal.fire(
          lang === "vi" ? "Thành công" : "Success",
          lang === "vi" ? "Cập nhật bệnh án thành công!" : "Record updated successfully!",
          "success"
        );
      } else {
        await recordApi.create(form);
        Swal.fire(
          lang === "vi" ? "Thành công" : "Success",
          lang === "vi" ? "Thêm bệnh án mới thành công!" : "Record added successfully!",
          "success"
        );
      }
      setIsModalOpen(false);
      fetchRecords();
    } catch (err) {
      Swal.fire(
        lang === "vi" ? "Lỗi" : "Error",
        lang === "vi" ? "Không thể lưu hồ sơ bệnh án." : "Cannot save medical record.",
        "error"
      );
    }
  };

  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: lang === "vi" ? "Xóa bệnh án?" : "Delete record?",
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
      await recordApi.remove(id);
      Swal.fire(
        lang === "vi" ? "Đã xóa" : "Deleted",
        lang === "vi" ? "Hồ sơ bệnh án đã được xóa." : "Medical record deleted.",
        "success"
      );
      fetchRecords();
    }
  };

  if (loading) return <Loading text={t("common.loading")} />;

  return (
    <Container fluid className="px-0">
      {/* Tiêu đề trang & Nút thêm bệnh án */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">{t("nav.medicalRecords")}</h2>
          <p className="text-muted mb-0">
            {lang === "vi"
              ? "Theo dõi lịch sử khám bệnh, chỉ số sinh học và chẩn đoán lâm sàng."
              : "Track medical records and clinical history."}
          </p>
        </div>
        {canManage && (
          <Button variant="primary" onClick={handleOpenAdd} className="d-flex align-items-center gap-2 shadow-sm">
            <i className="bi bi-file-earmark-plus-fill"></i>
            <span>{lang === "vi" ? "Thêm bệnh án" : "Add Record"}</span>
          </Button>
        )}
      </div>

      {/* Thanh công cụ: Tìm kiếm */}
      <Card className="border-0 shadow-sm rounded-3 mb-4">
        <Card.Body className="p-3">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder={
              lang === "vi" ? "Tìm theo bệnh nhân, bác sĩ, chẩn đoán..." : "Search records..."
            }
          />
        </Card.Body>
      </Card>

      {/* Bảng danh sách Bệnh án */}
      <Card className="border-0 shadow-sm rounded-3">
        <Card.Body className="p-0">
          {filteredRecords.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title={lang === "vi" ? "Không có bệnh án" : "No Medical Records"}
                message={
                  lang === "vi"
                    ? "Không tìm thấy hồ sơ bệnh án nào phù hợp."
                    : "No matching medical records found."
                }
                icon="bi-file-earmark-x"
              />
            </div>
          ) : (
            <Table responsive hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">ID</th>
                  <th>{t("patientDetail.date")}</th>
                  <th>{t("appointments.tablePatient")}</th>
                  <th>{t("appointments.tableDoctor")}</th>
                  <th>{t("patientDetail.glucose")}</th>
                  <th>{t("patientDetail.hba1c")}</th>
                  <th>{t("patientDetail.bmi")}</th>
                  <th>{t("patientDetail.bloodPressure")}</th>
                  <th>{t("patientDetail.diagnosis")}</th>
                  {canManage && <th className="text-center pe-3">{t("patients.tableAction")}</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((item) => (
                  <tr key={item.id}>
                    <td className="ps-3 text-muted">#{item.id}</td>
                    <td className="fw-medium">{item.date}</td>
                    <td className="fw-semibold text-primary">{getPatientName(item.patientId)}</td>
                    <td>{getDoctorName(item.doctorId)}</td>
                    <td>{item.glucose ? `${item.glucose} mg/dL` : "-"}</td>
                    <td>{item.hba1c ? `${item.hba1c}%` : "-"}</td>
                    <td>{item.bmi || "-"}</td>
                    <td>{item.bloodPressure || "-"}</td>
                    <td>{translateDiagnosis(item.diagnosis, lang)}</td>
                    {canManage && (
                      <td className="text-center pe-3">
                        <ActionMenu
                          items={[
                            {
                              label: lang === "vi" ? "Chỉnh sửa" : "Edit",
                              icon: <i className="bi bi-pencil-square text-primary"></i>,
                              onClick: () => handleOpenEdit(item),
                            },
                            ...(currentRole === ROLES.ADMIN
                              ? [
                                  {
                                    label: lang === "vi" ? "Xóa bệnh án" : "Delete",
                                    icon: <i className="bi bi-trash3 text-danger"></i>,
                                    tone: "danger",
                                    onClick: () => handleDelete(item.id),
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Modal Thêm/Sửa Hồ sơ Bệnh án */}
      <Modal
        title={
          editingRecord
            ? lang === "vi"
              ? "Chỉnh sửa Bệnh án"
              : "Edit Medical Record"
            : lang === "vi"
            ? "Thêm Hồ sơ Bệnh án mới"
            : "Add Medical Record"
        }
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="lg"
      >
        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col xs={12} md={6}>
              <Form.Group className="mb-3" controlId="recPatient">
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
              <Form.Group className="mb-3" controlId="recDoctor">
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
                      {d.fullName}
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
                label={t("patientDetail.glucose")}
                name="glucose"
                type="number"
                value={form.glucose}
                onChange={handleChange}
                placeholder="mg/dL (e.g. 105)"
              />
            </Col>

            <Col xs={12} md={4}>
              <Input
                label={t("patientDetail.hba1c")}
                name="hba1c"
                type="number"
                step="0.1"
                value={form.hba1c}
                onChange={handleChange}
                placeholder="% (e.g. 5.7)"
              />
            </Col>

            <Col xs={12} md={4}>
              <Input
                label={t("patientDetail.bmi")}
                name="bmi"
                type="number"
                step="0.1"
                value={form.bmi}
                onChange={handleChange}
                placeholder="BMI (e.g. 22.4)"
              />
            </Col>

            <Col xs={12} md={4}>
              <Input
                label={t("patientDetail.bloodPressure")}
                name="bloodPressure"
                value={form.bloodPressure}
                onChange={handleChange}
                placeholder="e.g. 120/80"
              />
            </Col>

            <Col xs={12}>
              <Input
                label={t("patientDetail.diagnosis")}
                name="diagnosis"
                value={form.diagnosis}
                onChange={handleChange}
                placeholder={lang === "vi" ? "Chẩn đoán lâm sàng..." : "Clinical diagnosis..."}
                required
              />
            </Col>
          </Row>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              {t("patients.btnCancel")}
            </Button>
            <Button variant="primary" type="submit">
              {lang === "vi" ? "Lưu bệnh án" : "Save Record"}
            </Button>
          </div>
        </Form>
      </Modal>
    </Container>
  );
}

export default MedicalRecords;
