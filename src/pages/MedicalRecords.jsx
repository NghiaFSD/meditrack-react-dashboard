import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Card, Table, Form, Button, Badge, Nav } from "react-bootstrap";
import Swal from "sweetalert2";
import { recordApi } from "../api/recordApi";
import { patientApi } from "../api/patientApi";
import { doctorApi } from "../api/doctorApi";
import Loading from "../components/common/Loading";
import SearchBox from "../components/common/SearchBox";
import Modal from "../components/common/Modal";
import Input from "../components/common/Input";
import EmptyState from "../components/common/EmptyState";
import { ROLES, findLinkedDoctor, findLinkedPatient } from "../utils/auth";
import { useAuth } from "../context/AuthContext";
import { translateDiagnosis, translateSpecialty } from "../utils/translations";

const INITIAL_FORM = {
  patientId: "",
  doctorId: "",
  date: "",
  glucose: "",
  hba1c: "",
  bmi: "",
  bloodPressure: "",
  diagnosis: "",
  note: "",
};

// Helper phân loại mức độ rủi ro sức khỏe
function getRecordRiskLevel(rec) {
  const glucose = parseFloat(rec.glucose) || 0;
  const hba1c = parseFloat(rec.hba1c) || 0;
  const diag = (rec.diagnosis || "").toLowerCase();

  if (glucose >= 140 || hba1c >= 7.0 || diag.includes("đường huyết cao") || diag.includes("cần tái khám")) {
    return { level: "high", label: "Đường huyết cao", color: "danger", icon: "bi-exclamation-octagon-fill" };
  }
  if ((glucose >= 100 && glucose < 140) || (hba1c >= 5.7 && hba1c < 7.0) || diag.includes("tiền tiểu đường") || diag.includes("nguy cơ")) {
    return { level: "warning", label: "Tiền tiểu đường / Theo dõi", color: "warning", icon: "bi-exclamation-triangle-fill" };
  }
  return { level: "normal", label: "Bình thường", color: "success", icon: "bi-check-circle-fill" };
}

/**
 * Trang Quản lý Hồ sơ Bệnh án Y tế — Tối ưu hóa UI/UX
 */
function MedicalRecords() {
  const { user } = useAuth();
  const currentRole = user?.role;

  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bộ lọc & Tìm kiếm
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");

  // Modal Thêm/Sửa & Modal Xem Chi Tiết
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const [recs, pts, docs] = await Promise.all([
        recordApi.getAll(),
        patientApi.getAll(),
        doctorApi.getAll(),
      ]);
      setRecords(recs || []);
      setPatients(pts || []);
      setDoctors(docs || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const linkedPatient = useMemo(() => findLinkedPatient(patients, user), [patients, user]);
  const linkedDoctor = useMemo(() => findLinkedDoctor(doctors, user), [doctors, user]);
  const canManage = currentRole === ROLES.ADMIN || currentRole === ROLES.DOCTOR;

  // Lọc theo Role
  const roleFilteredRecords = useMemo(() => {
    if (currentRole === ROLES.PATIENT) {
      if (!linkedPatient) return [];
      return records.filter((r) => Number(r.patientId) === Number(linkedPatient.id));
    }
    if (currentRole === ROLES.DOCTOR) {
      if (!linkedDoctor) return [];
      return records.filter((r) => Number(r.doctorId) === Number(linkedDoctor.id));
    }
    return records;
  }, [records, currentRole, linkedPatient, linkedDoctor]);

  const getPatientObj = (id) => patients.find((p) => Number(p.id) === Number(id)) || null;
  const getDoctorObj = (id) => doctors.find((d) => Number(d.id) === Number(id)) || null;
  const getPatientName = (id) => getPatientObj(id)?.fullName || "Chưa xác định";
  const getDoctorName = (id) => getDoctorObj(id)?.fullName || "Chưa xác định";

  // Thống kê 4 Thẻ KPI
  const stats = useMemo(() => {
    const total = roleFilteredRecords.length;
    const highRisk = roleFilteredRecords.filter((r) => getRecordRiskLevel(r).level === "high");
    const warning = roleFilteredRecords.filter((r) => getRecordRiskLevel(r).level === "warning");
    const normal = roleFilteredRecords.filter((r) => getRecordRiskLevel(r).level === "normal");

    return {
      total,
      highRiskCount: highRisk.length,
      warningCount: warning.length,
      normalCount: normal.length,
    };
  }, [roleFilteredRecords]);

  // Lọc & Tìm kiếm & Sắp xếp danh sách
  const processedRecords = useMemo(() => {
    return roleFilteredRecords
      .filter((item) => {
        // Tab lọc
        const risk = getRecordRiskLevel(item);
        if (statusTab !== "all" && risk.level !== statusTab) {
          return false;
        }

        // Lọc theo bác sĩ
        if (doctorFilter !== "all" && String(item.doctorId) !== String(doctorFilter)) {
          return false;
        }

        // Tìm kiếm
        const q = search.trim().toLowerCase();
        if (!q) return true;

        const pName = getPatientName(item.patientId).toLowerCase();
        const dName = getDoctorName(item.doctorId).toLowerCase();
        const diag = (item.diagnosis || "").toLowerCase();
        const diagVi = translateDiagnosis(item.diagnosis || "").toLowerCase();
        const bp = (item.bloodPressure || "").toLowerCase();
        const idStr = `#${item.id}`;

        return (
          pName.includes(q) ||
          dName.includes(q) ||
          diag.includes(q) ||
          diagVi.includes(q) ||
          bp.includes(q) ||
          idStr.includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === "date-desc") return (b.date || "").localeCompare(a.date || "");
        if (sortBy === "date-asc") return (a.date || "").localeCompare(b.date || "");
        if (sortBy === "glucose-desc") return (parseFloat(b.glucose) || 0) - (parseFloat(a.glucose) || 0);
        if (sortBy === "hba1c-desc") return (parseFloat(b.hba1c) || 0) - (parseFloat(a.hba1c) || 0);
        return 0;
      });
  }, [roleFilteredRecords, statusTab, doctorFilter, search, sortBy, patients, doctors]);

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setForm({
      ...INITIAL_FORM,
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

  const handleOpenView = (rec) => {
    setViewingRecord(rec);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patientId || !form.doctorId || !form.date || !form.diagnosis) {
      Swal.fire(
        "Thiếu thông tin",
        "Vui lòng điền đầy đủ bệnh nhân, bác sĩ, ngày khám và chẩn đoán.",
        "warning"
      );
      return;
    }

    try {
      if (editingRecord) {
        await recordApi.update(editingRecord.id, form);
        Swal.fire("Thành công", "Cập nhật hồ sơ bệnh án thành công!", "success");
      } else {
        await recordApi.create(form);
        Swal.fire("Thành công", "Thêm hồ sơ bệnh án mới thành công!", "success");
      }
      setIsModalOpen(false);
      fetchRecords();
    } catch (err) {
      Swal.fire("Lỗi", "Không thể lưu hồ sơ bệnh án.", "error");
    }
  };

  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: "Xóa hồ sơ bệnh án?",
      text: "Hành động này sẽ xóa vĩnh viễn hồ sơ và không thể hoàn tác.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xác nhận xóa",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#dc3545",
    });

    if (res.isConfirmed) {
      await recordApi.remove(id);
      Swal.fire("Đã xóa", "Hồ sơ bệnh án đã được xóa.", "success");
      fetchRecords();
    }
  };

  if (loading) return <Loading text="Đang tải dữ liệu hồ sơ bệnh án..." />;

  return (
    <Container fluid className="px-0 py-2">
      {/* Tiêu đề trang & Nút Thêm mới */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <i className="bi bi-journal-medical text-primary"></i>
            Hồ sơ bệnh án
          </h3>
          <p className="text-muted mb-0">
            Theo dõi chi tiết lịch sử khám bệnh, chỉ số sinh học và chẩn đoán lâm sàng của bệnh nhân.
          </p>
        </div>
        {canManage && (
          <Button
            variant="primary"
            onClick={handleOpenAdd}
            className="d-flex align-items-center gap-2 shadow-sm px-3 py-2 rounded-3 fw-semibold"
          >
            <i className="bi bi-plus-circle-fill"></i>
            <span>Thêm bệnh án mới</span>
          </Button>
        )}
      </div>

      {/* 4 Thẻ KPI Thống kê Chỉ số Sức khỏe */}
      <Row className="g-3 mb-4">
        {[
          {
            label: "Tổng hồ sơ bệnh án",
            value: stats.total,
            icon: "bi-folder2-open",
            color: "primary",
            note: "Toàn bộ lịch sử",
            tabKey: "all",
          },
          {
            label: "Đường huyết cao / Cần khám lại",
            value: stats.highRiskCount,
            icon: "bi-exclamation-octagon-fill",
            color: "danger",
            note: "Glucose ≥ 140 hoặc HbA1c ≥ 7%",
            tabKey: "high",
          },
          {
            label: "Tiền tiểu đường / Theo dõi",
            value: stats.warningCount,
            icon: "bi-exclamation-triangle-fill",
            color: "warning",
            note: "Glucose 100–139 hoặc HbA1c 5.7–6.9%",
            tabKey: "warning",
          },
          {
            label: "Chỉ số ổn định / Bình thường",
            value: stats.normalCount,
            icon: "bi-check-circle-fill",
            color: "success",
            note: "Glucose < 100 và HbA1c < 5.7%",
            tabKey: "normal",
          },
        ].map((item, idx) => (
          <Col xs={12} sm={6} lg={3} key={idx}>
            <Card
              className={`border-0 shadow-sm rounded-3 h-100 transition-all cursor-pointer ${
                statusTab === item.tabKey ? `border-start border-4 border-${item.color}` : ""
              }`}
              style={{ cursor: "pointer" }}
              onClick={() => setStatusTab(item.tabKey)}
              title={`Nhấp để lọc hồ sơ: ${item.label}`}
            >
              <Card.Body className="d-flex align-items-center gap-3 p-3">
                <div
                  className={`bg-${item.color} bg-opacity-10 text-${item.color} rounded-3 d-flex align-items-center justify-content-center shadow-sm`}
                  style={{ width: "52px", height: "52px", fontSize: "1.4rem", flexShrink: 0 }}
                >
                  <i className={`bi ${item.icon}`}></i>
                </div>
                <div>
                  <div className="fw-bold fs-4 lh-1 text-dark">{item.value}</div>
                  <div className="small fw-semibold text-dark mt-1">{item.label}</div>
                  <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                    {item.note}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Thanh công cụ: Tabs Phân Loại & Bộ Lọc Nâng Cao */}
      <Card className="border-0 shadow-sm rounded-3 mb-4">
        <Card.Body className="p-3">
          {/* Tabs nhanh */}
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 pb-3 mb-3 border-bottom">
            <Nav variant="pills" activeKey={statusTab} onSelect={(k) => setStatusTab(k || "all")} className="gap-2">
              <Nav.Item>
                <Nav.Link eventKey="all" className="rounded-pill px-3 py-1 fw-semibold small">
                  Tất cả hồ sơ
                  <Badge bg="secondary" className="ms-2 rounded-pill bg-opacity-50 text-white">{stats.total}</Badge>
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="high" className="rounded-pill px-3 py-1 fw-semibold small text-danger">
                  🚨 Đường huyết cao
                  <Badge bg="danger" className="ms-2 rounded-pill">{stats.highRiskCount}</Badge>
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="warning" className="rounded-pill px-3 py-1 fw-semibold small text-warning">
                  ⚠️ Tiền tiểu đường / Theo dõi
                  <Badge bg="warning" text="dark" className="ms-2 rounded-pill">{stats.warningCount}</Badge>
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="normal" className="rounded-pill px-3 py-1 fw-semibold small text-success">
                  🟢 Bình thường
                  <Badge bg="success" className="ms-2 rounded-pill">{stats.normalCount}</Badge>
                </Nav.Link>
              </Nav.Item>
            </Nav>

            <div className="text-muted small fw-medium">
              Hiển thị <strong className="text-primary">{processedRecords.length}</strong> / {roleFilteredRecords.length} hồ sơ
            </div>
          </div>

          {/* Ô Tìm kiếm + Select Bác sĩ + Sắp xếp */}
          <Row className="g-2 align-items-center">
            <Col xs={12} md={5}>
              <SearchBox
                value={search}
                onChange={setSearch}
                placeholder="Tìm theo tên bệnh nhân, bác sĩ, chẩn đoán, mã hồ sơ..."
              />
            </Col>

            {currentRole === ROLES.ADMIN && (
              <Col xs={6} md={4}>
                <Form.Select
                  value={doctorFilter}
                  onChange={(e) => setDoctorFilter(e.target.value)}
                  className="rounded-3"
                >
                  <option value="all">Tất cả bác sĩ phụ trách</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} — {translateSpecialty(d.specialization || d.specialty || "Nội tổng quát")}
                    </option>
                  ))}
                </Form.Select>
              </Col>
            )}

            <Col xs={6} md={currentRole === ROLES.ADMIN ? 3 : 7}>
              <Form.Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-3"
              >
                <option value="date-desc">📅 Ngày khám mới nhất</option>
                <option value="date-asc">📅 Ngày khám cũ nhất</option>
                <option value="glucose-desc">🩸 Đường huyết cao nhất</option>
                <option value="hba1c-desc">📊 HbA1c cao nhất</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Bảng Danh Sách Hồ Sơ Bệnh Án */}
      <Card className="border-0 shadow-sm rounded-3">
        <Card.Body className="p-0">
          {processedRecords.length === 0 ? (
            <div className="p-5 text-center">
              <EmptyState
                title="Không tìm thấy hồ sơ bệnh án"
                message="Không có hồ sơ nào phù hợp với điều kiện tìm kiếm hoặc bộ lọc hiện tại."
                icon="bi-journal-x"
              />
              <Button
                variant="outline-primary"
                size="sm"
                className="mt-3 rounded-pill px-3"
                onClick={() => {
                  setSearch("");
                  setStatusTab("all");
                  setDoctorFilter("all");
                }}
              >
                <i className="bi bi-arrow-counterclockwise me-1"></i>
                Đặt lại bộ lọc
              </Button>
            </div>
          ) : (
            <Table responsive hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3 py-3" style={{ width: "70px" }}>ID</th>
                  <th style={{ minWidth: "120px" }}>Ngày khám</th>
                  <th style={{ minWidth: "170px" }}>Bệnh nhân</th>
                  <th style={{ minWidth: "160px" }}>Bác sĩ phụ trách</th>
                  <th style={{ minWidth: "125px" }}>Đường huyết</th>
                  <th style={{ minWidth: "90px" }}>HbA1c</th>
                  <th style={{ minWidth: "80px" }}>BMI</th>
                  <th style={{ minWidth: "95px" }}>Huyết áp</th>
                  <th style={{ minWidth: "220px" }}>Chẩn đoán lâm sàng</th>
                  <th className="text-center pe-3" style={{ minWidth: "130px" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {processedRecords.map((item) => {
                  const risk = getRecordRiskLevel(item);
                  const glucoseVal = parseFloat(item.glucose) || 0;
                  const hba1cVal = parseFloat(item.hba1c) || 0;
                  const pObj = getPatientObj(item.patientId);
                  const dObj = getDoctorObj(item.doctorId);

                  return (
                    <tr key={item.id} className="transition-all">
                      <td className="ps-3">
                        <span className="badge bg-light text-secondary border fw-medium">
                          #{item.id}
                        </span>
                      </td>

                      <td>
                        <div className="d-flex align-items-center gap-1 text-dark fw-medium">
                          <i className="bi bi-calendar-event text-muted small"></i>
                          <span>{item.date}</span>
                        </div>
                      </td>

                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold"
                            style={{ width: "32px", height: "32px", fontSize: "0.85rem", flexShrink: 0 }}
                          >
                            {pObj?.fullName?.charAt(0) || "B"}
                          </div>
                          <div>
                            <div className="fw-semibold text-primary">{pObj?.fullName || "—"}</div>
                            <div className="text-muted small" style={{ fontSize: "0.75rem" }}>
                              {pObj?.patientCode || `BN-${item.patientId}`} • {pObj?.gender || "Nam"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div>
                          <div className="fw-medium text-dark">{dObj?.fullName || "—"}</div>
                          <div className="text-muted small" style={{ fontSize: "0.75rem" }}>
                            {translateSpecialty(dObj?.specialization || dObj?.specialty || "Nội tổng quát")}
                          </div>
                        </div>
                      </td>

                      {/* Đường huyết: color-coded badge */}
                      <td>
                        {glucoseVal > 0 ? (
                          <span
                            className={`badge px-2 py-1 ${
                              glucoseVal >= 140
                                ? "bg-danger bg-opacity-15 text-danger border border-danger border-opacity-25"
                                : glucoseVal >= 100
                                ? "bg-warning bg-opacity-25 text-dark border border-warning"
                                : "bg-success bg-opacity-15 text-success border border-success border-opacity-25"
                            } fw-bold`}
                          >
                            {glucoseVal >= 140 ? "🔴 " : glucoseVal >= 100 ? "🟡 " : "🟢 "}
                            {item.glucose} mg/dL
                          </span>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>

                      {/* HbA1c */}
                      <td>
                        {hba1cVal > 0 ? (
                          <span
                            className={`badge px-2 py-1 ${
                              hba1cVal >= 6.5
                                ? "bg-danger text-white"
                                : hba1cVal >= 5.7
                                ? "bg-warning text-dark"
                                : "bg-success text-white"
                            } fw-bold`}
                          >
                            {item.hba1c}%
                          </span>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>

                      {/* BMI */}
                      <td>
                        <span className="fw-medium text-dark">{item.bmi || "—"}</span>
                      </td>

                      {/* Huyết áp */}
                      <td>
                        <span className="fw-medium text-dark">{item.bloodPressure || "—"}</span>
                      </td>

                      {/* Chẩn đoán */}
                      <td>
                        <Badge
                          bg={risk.color}
                          text={risk.color === "warning" ? "dark" : "white"}
                          className="px-2 py-1 fw-semibold text-wrap text-start"
                          style={{ maxWidth: "230px" }}
                        >
                          <i className={`bi ${risk.icon} me-1`}></i>
                          {translateDiagnosis(item.diagnosis)}
                        </Badge>
                      </td>

                      {/* Thao tác 1 chạm */}
                      <td className="text-center pe-3">
                        <div className="d-inline-flex align-items-center gap-1">
                          <Button
                            variant="outline-info"
                            size="sm"
                            className="p-1 px-2 rounded-2"
                            onClick={() => handleOpenView(item)}
                            title="Xem chi tiết bệnh án"
                          >
                            <i className="bi bi-eye-fill"></i>
                          </Button>

                          {canManage && (
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="p-1 px-2 rounded-2"
                              onClick={() => handleOpenEdit(item)}
                              title="Chỉnh sửa bệnh án"
                            >
                              <i className="bi bi-pencil-square"></i>
                            </Button>
                          )}

                          {currentRole === ROLES.ADMIN && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="p-1 px-2 rounded-2"
                              onClick={() => handleDelete(item.id)}
                              title="Xóa bệnh án"
                            >
                              <i className="bi bi-trash3-fill"></i>
                            </Button>
                          )}
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

      {/* MODAL 1: XEM CHI TIẾT HỒ SƠ BỆNH ÁN (Medical Chart Pop-up) */}
      {viewingRecord && (
        <Modal
          title={`Chi tiết Hồ sơ Bệnh án #${viewingRecord.id}`}
          isOpen={!!viewingRecord}
          onClose={() => setViewingRecord(null)}
          size="lg"
        >
          <div>
            {/* Header tóm tắt */}
            <div className="p-3 bg-light rounded-3 border mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div>
                <span className="text-muted small">Ngày khám:</span>
                <strong className="text-dark fs-6 ms-2">
                  <i className="bi bi-calendar3 text-primary me-1"></i>
                  {viewingRecord.date}
                </strong>
              </div>
              <div>
                {(() => {
                  const r = getRecordRiskLevel(viewingRecord);
                  return (
                    <Badge bg={r.color} text={r.color === "warning" ? "dark" : "white"} className="px-3 py-2 fs-6">
                      <i className={`bi ${r.icon} me-1`}></i>
                      {r.label}
                    </Badge>
                  );
                })()}
              </div>
            </div>

            {/* Thông tin Bệnh nhân & Bác sĩ */}
            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Card className="border shadow-none h-100">
                  <Card.Body className="p-3">
                    <h6 className="fw-bold text-primary mb-2 d-flex align-items-center gap-2">
                      <i className="bi bi-person-circle"></i>
                      Thông tin Bệnh nhân
                    </h6>
                    {(() => {
                      const p = getPatientObj(viewingRecord.patientId);
                      return (
                        <div className="small">
                          <div className="mb-1"><strong>Họ và tên:</strong> {p?.fullName || "—"}</div>
                          <div className="mb-1"><strong>Mã hồ sơ:</strong> {p?.patientCode || `#BN-${viewingRecord.patientId}`}</div>
                          <div className="mb-1"><strong>Giới tính:</strong> {p?.gender || "Nam"} • <strong>Tuổi:</strong> {p?.age || "—"}</div>
                          <div><strong>Số điện thoại:</strong> {p?.phone || "Chưa có"}</div>
                        </div>
                      );
                    })()}
                  </Card.Body>
                </Card>
              </Col>

              <Col xs={12} md={6}>
                <Card className="border shadow-none h-100">
                  <Card.Body className="p-3">
                    <h6 className="fw-bold text-primary mb-2 d-flex align-items-center gap-2">
                      <i className="bi bi-hospital"></i>
                      Bác sĩ Phụ trách
                    </h6>
                    {(() => {
                      const d = getDoctorObj(viewingRecord.doctorId);
                      return (
                        <div className="small">
                          <div className="mb-1"><strong>Bác sĩ:</strong> {d?.fullName || "—"}</div>
                          <div className="mb-1"><strong>Chuyên khoa:</strong> {translateSpecialty(d?.specialization || d?.specialty || "Nội tổng quát")}</div>
                          <div className="mb-1"><strong>Phòng khám:</strong> {d?.room || "A-201"}</div>
                          <div><strong>Email:</strong> {d?.email || "—"}</div>
                        </div>
                      );
                    })()}
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* 4 Thẻ Chỉ Số Sinh Học Lâm Sàng */}
            <h6 className="fw-bold text-dark mb-2">
              <i className="bi bi-activity text-danger me-1"></i>
              Chỉ số Sinh học Lâm sàng
            </h6>
            <Row className="g-2 mb-3">
              <Col xs={6} md={3}>
                <div className="p-3 border rounded-3 text-center bg-light">
                  <div className="text-muted small">Đường huyết</div>
                  <div className="fs-5 fw-bold text-danger my-1">
                    {viewingRecord.glucose ? `${viewingRecord.glucose} mg/dL` : "—"}
                  </div>
                  <div className="text-muted" style={{ fontSize: "0.7rem" }}>Chuẩn: 70–99 mg/dL</div>
                </div>
              </Col>

              <Col xs={6} md={3}>
                <div className="p-3 border rounded-3 text-center bg-light">
                  <div className="text-muted small">HbA1c</div>
                  <div className="fs-5 fw-bold text-warning my-1">
                    {viewingRecord.hba1c ? `${viewingRecord.hba1c}%` : "—"}
                  </div>
                  <div className="text-muted" style={{ fontSize: "0.7rem" }}>Chuẩn: &lt; 5.7%</div>
                </div>
              </Col>

              <Col xs={6} md={3}>
                <div className="p-3 border rounded-3 text-center bg-light">
                  <div className="text-muted small">Chỉ số BMI</div>
                  <div className="fs-5 fw-bold text-primary my-1">
                    {viewingRecord.bmi || "—"}
                  </div>
                  <div className="text-muted" style={{ fontSize: "0.7rem" }}>Chuẩn: 18.5–22.9</div>
                </div>
              </Col>

              <Col xs={6} md={3}>
                <div className="p-3 border rounded-3 text-center bg-light">
                  <div className="text-muted small">Huyết áp</div>
                  <div className="fs-5 fw-bold text-info my-1">
                    {viewingRecord.bloodPressure || "—"}
                  </div>
                  <div className="text-muted" style={{ fontSize: "0.7rem" }}>Chuẩn: 120/80 mmHg</div>
                </div>
              </Col>
            </Row>

            {/* Chẩn đoán & Lời khuyên */}
            <div className="p-3 border rounded-3 bg-white mb-3">
              <div className="fw-bold text-dark mb-1">
                <i className="bi bi-clipboard-pulse text-primary me-1"></i>
                Chẩn đoán lâm sàng:
              </div>
              <p className="text-dark mb-2 fs-6 fw-semibold">
                {translateDiagnosis(viewingRecord.diagnosis)}
              </p>
              {viewingRecord.note && (
                <div className="mt-2 pt-2 border-top small text-muted">
                  <strong>Ghi chú bác sĩ:</strong> {viewingRecord.note}
                </div>
              )}
            </div>

            {/* Nút thao tác dưới cùng */}
            <div className="d-flex justify-content-end gap-2 pt-2">
              {canManage && (
                <Button
                  variant="primary"
                  onClick={() => {
                    const rec = viewingRecord;
                    setViewingRecord(null);
                    handleOpenEdit(rec);
                  }}
                >
                  <i className="bi bi-pencil-square me-1"></i>
                  Chỉnh sửa bệnh án
                </Button>
              )}
              <Button variant="secondary" onClick={() => setViewingRecord(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: THÊM / SỬA HỒ SƠ BỆNH ÁN */}
      <Modal
        title={editingRecord ? `Chỉnh sửa Bệnh án #${editingRecord.id}` : "Thêm Hồ sơ Bệnh án mới"}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="lg"
      >
        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col xs={12} md={6}>
              <Form.Group className="mb-2" controlId="recPatient">
                <Form.Label className="fw-semibold d-flex align-items-center gap-2">
                  Bệnh nhân
                  {editingRecord && (
                    <span className="badge bg-secondary fw-normal" style={{ fontSize: "0.65rem" }}>Không thể thay đổi</span>
                  )}
                </Form.Label>
                <Form.Select
                  name="patientId"
                  value={form.patientId}
                  onChange={handleChange}
                  disabled={!!linkedPatient || !!editingRecord}
                  required
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.patientCode || `#BN-${p.id}`})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col xs={12} md={6}>
              <Form.Group className="mb-2" controlId="recDoctor">
                <Form.Label className="fw-semibold d-flex align-items-center gap-2">
                  Bác sĩ phụ trách
                  {editingRecord && (
                    <span className="badge bg-secondary fw-normal" style={{ fontSize: "0.65rem" }}>Không thể thay đổi</span>
                  )}
                </Form.Label>
                <Form.Select
                  name="doctorId"
                  value={form.doctorId}
                  onChange={handleChange}
                  disabled={!!linkedDoctor || !!editingRecord}
                  required
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({translateSpecialty(d.specialization || d.specialty || "Nội tổng quát")})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col xs={12} md={6}>
              <Input
                label={
                  <span className="d-flex align-items-center gap-2">
                    Ngày khám
                    {editingRecord && (
                      <span className="badge bg-secondary fw-normal" style={{ fontSize: "0.65rem" }}>Không thể thay đổi</span>
                    )}
                  </span>
                }
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
                disabled={!!editingRecord}
                required
              />
            </Col>

            <Col xs={12} md={6}>
              <Input
                label="Đường huyết (Fasting Blood Glucose)"
                name="glucose"
                type="number"
                value={form.glucose}
                onChange={handleChange}
                placeholder="mg/dL (ví dụ: 105)"
              />
            </Col>

            <Col xs={12} md={4}>
              <Input
                label="Chỉ số HbA1c"
                name="hba1c"
                type="number"
                step="0.1"
                value={form.hba1c}
                onChange={handleChange}
                placeholder="% (ví dụ: 5.7)"
              />
            </Col>

            <Col xs={12} md={4}>
              <Input
                label="Chỉ số BMI"
                name="bmi"
                type="number"
                step="0.1"
                value={form.bmi}
                onChange={handleChange}
                placeholder="BMI (ví dụ: 22.4)"
              />
            </Col>

            <Col xs={12} md={4}>
              <Input
                label="Huyết áp (Blood Pressure)"
                name="bloodPressure"
                value={form.bloodPressure}
                onChange={handleChange}
                placeholder="ví dụ: 120/80"
              />
            </Col>

            <Col xs={12}>
              <Input
                label="Chẩn đoán lâm sàng"
                name="diagnosis"
                value={form.diagnosis}
                onChange={handleChange}
                placeholder="Nhập chẩn đoán (ví dụ: Theo dõi tiền tiểu đường, Đường huyết ổn định...)"
                required
              />
            </Col>

            <Col xs={12}>
              <Form.Group controlId="recNote">
                <Form.Label className="fw-semibold">Ghi chú / Lời dặn dò bác sĩ</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="note"
                  value={form.note || ""}
                  onChange={handleChange}
                  placeholder="Ghi chú chế độ ăn uống, dùng thuốc, hẹn ngày tái khám..."
                />
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              {editingRecord ? "Lưu thay đổi" : "Tạo bệnh án"}
            </Button>
          </div>
        </Form>
      </Modal>
    </Container>
  );
}

export default MedicalRecords;
