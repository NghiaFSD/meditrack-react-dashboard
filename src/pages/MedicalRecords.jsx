import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import Button from "../components/common/Button";
import EmptyState from "../components/common/EmptyState";
import Input from "../components/common/Input";
import Loading from "../components/common/Loading";
import Modal from "../components/common/Modal";
import SearchBox from "../components/common/SearchBox";
import StatusBadge from "../components/common/StatusBadge";
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
 * Trang quản lý Hồ sơ bệnh án (CRUD + Xem chỉ số sức khỏe)
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

  const getPatientName = (id) => patients.find((p) => Number(p.id) === Number(id))?.fullName || "Unknown";
  const getDoctorName = (id) => doctors.find((d) => Number(d.id) === Number(id))?.fullName || "Unknown";

  const filteredRecords = useMemo(() => {
    const scoped = records.filter((r) => {
      if (currentRole === ROLES.PATIENT && linkedPatient) return Number(r.patientId) === Number(linkedPatient.id);
      if (currentRole === ROLES.DOCTOR && linkedDoctor) return Number(r.doctorId) === Number(linkedDoctor.id);
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
      patientId: linkedPatient ? String(linkedPatient.id) : (patients[0]?.id || ""),
      doctorId: linkedDoctor ? String(linkedDoctor.id) : (doctors[0]?.id || ""),
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
      Swal.fire("Lỗi", "Vui lòng điền đầy đủ bệnh nhân, bác sĩ, ngày khám và chẩn đoán.", "warning");
      return;
    }

    try {
      if (editingRecord) {
        await recordApi.update(editingRecord.id, form);
        Swal.fire("Thành công", "Cập nhật bệnh án thành công!", "success");
      } else {
        await recordApi.create(form);
        Swal.fire("Thành công", "Thêm bệnh án mới thành công!", "success");
      }
      setIsModalOpen(false);
      fetchRecords();
    } catch (err) {
      Swal.fire("Lỗi", "Không thể lưu hồ sơ bệnh án.", "error");
    }
  };

  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: "Xóa bệnh án?",
      text: "Hành động này không thể hoàn tác.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#e11d48",
    });

    if (res.isConfirmed) {
      await recordApi.remove(id);
      Swal.fire("Đã xóa", "Hồ sơ bệnh án đã được xóa.", "success");
      fetchRecords();
    }
  };

  if (loading) return <Loading text={t("common.loading")} />;

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>{t("nav.medicalRecords")}</h1>
          <p>{lang === "vi" ? "Theo dõi lịch sử khám bệnh, chỉ số sinh học và chẩn đoán lâm sàng." : "Track medical records and clinical history."}</p>
        </div>
        {canManage && <Button onClick={handleOpenAdd}>+ {lang === "vi" ? "Thêm bệnh án" : "Add Record"}</Button>}
      </div>

      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder={lang === "vi" ? "Tìm theo bệnh nhân, bác sĩ, chẩn đoán..." : "Search records..."} />
      </div>

      <div className="table-card">
        {filteredRecords.length === 0 ? (
          <EmptyState title="Không có bệnh án" message="Không tìm thấy hồ sơ bệnh án nào phù hợp." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>{t("patientDetail.date")}</th>
                <th>{t("appointments.tablePatient")}</th>
                <th>{t("appointments.tableDoctor")}</th>
                <th>{t("patientDetail.glucose")}</th>
                <th>{t("patientDetail.hba1c")}</th>
                <th>{t("patientDetail.bmi")}</th>
                <th>{t("patientDetail.bloodPressure")}</th>
                <th>{t("patientDetail.diagnosis")}</th>
                {canManage && <th>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((item) => (
                <tr key={item.id}>
                  <td>#{item.id}</td>
                  <td>{item.date}</td>
                  <td><strong>{getPatientName(item.patientId)}</strong></td>
                  <td>{getDoctorName(item.doctorId)}</td>
                  <td>{item.glucose ? `${item.glucose} mg/dL` : "-"}</td>
                  <td>{item.hba1c ? `${item.hba1c}%` : "-"}</td>
                  <td>{item.bmi || "-"}</td>
                  <td>{item.bloodPressure || "-"}</td>
                  <td>{translateDiagnosis(item.diagnosis, lang)}</td>
                  {canManage && (
                    <td style={{ textAlign: "center" }}>
                      <ActionMenu
                        items={[
                          {
                            label: lang === "vi" ? "Chỉnh sửa" : "Edit",
                            icon: "✏️",
                            tone: "primary",
                            onClick: () => handleOpenEdit(item),
                          },
                          ...(currentRole === ROLES.ADMIN
                            ? [
                                {
                                  label: lang === "vi" ? "Xóa bệnh án" : "Delete",
                                  icon: "🗑️",
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
          </table>
        )}
      </div>

      <Modal
        title={editingRecord ? "Chỉnh sửa Bệnh án" : "Thêm Hồ sơ Bệnh án mới"}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>{t("appointments.tablePatient")}</label>
            <select name="patientId" value={form.patientId} onChange={handleChange} disabled={!!linkedPatient} required>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.fullName} ({p.patientCode || `#${p.id}`})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>{t("appointments.tableDoctor")}</label>
            <select name="doctorId" value={form.doctorId} onChange={handleChange} disabled={!!linkedDoctor} required>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.fullName}</option>
              ))}
            </select>
          </div>

          <Input label={t("patientDetail.date")} name="date" type="date" value={form.date} onChange={handleChange} required />
          <Input label={t("patientDetail.glucose")} name="glucose" type="number" value={form.glucose} onChange={handleChange} placeholder="mg/dL" />
          <Input label={t("patientDetail.hba1c")} name="hba1c" type="number" step="0.1" value={form.hba1c} onChange={handleChange} placeholder="%" />
          <Input label={t("patientDetail.bmi")} name="bmi" type="number" step="0.1" value={form.bmi} onChange={handleChange} placeholder="BMI" />
          <Input label={t("patientDetail.bloodPressure")} name="bloodPressure" value={form.bloodPressure} onChange={handleChange} placeholder="120/80" />
          <Input label={t("patientDetail.diagnosis")} name="diagnosis" value={form.diagnosis} onChange={handleChange} placeholder="Chẩn đoán..." required />

          <div className="modal-actions" style={{ gridColumn: "1 / -1", marginTop: "1rem" }}>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit">Lưu bệnh án</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default MedicalRecords;
