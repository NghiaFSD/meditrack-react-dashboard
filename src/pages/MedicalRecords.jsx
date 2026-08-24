import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Card, Table, Form, Button, Badge } from "react-bootstrap";
import { useSearchParams, useParams } from "react-router-dom";
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

/**
 * Trang Quản lý Hồ sơ Bệnh án — Giao diện tinh gọn, tối ưu
 */
function MedicalRecords() {
  const { user } = useAuth();
  const currentRole = user?.role;

  // Đọc patientId từ nested route /patients/:id/records
  const { id: routePatientId } = useParams();

  // Đồng bộ bộ lọc với URL query params
  // Ví dụ: /records?patientId=3&doctorId=2&sortBy=date-desc
  const [searchParams, setSearchParams] = useSearchParams();

  const search        = searchParams.get("q")          || "";
  const patientFilter = routePatientId || searchParams.get("patientId") || "all";
  const doctorFilter  = searchParams.get("doctorId")   || "all";
  const sortBy        = searchParams.get("sortBy")     || "date-desc";

  const setFilter = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!value || value === "all" || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      return next;
    });
  };

  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
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

  // Lọc theo Role người dùng
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

  // Lọc theo Bệnh nhân + Bác sĩ + Từ khóa tìm kiếm + Sắp xếp
  const filteredRecords = useMemo(() => {
    return roleFilteredRecords
      .filter((item) => {
        // Lọc theo Bệnh nhân
        if (patientFilter !== "all" && String(item.patientId) !== String(patientFilter)) {
          return false;
        }

        // Lọc theo Bác sĩ
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
        const note = (item.note || "").toLowerCase();
        const idStr = `#${item.id}`;

        return (
          pName.includes(q) ||
          dName.includes(q) ||
          diag.includes(q) ||
          diagVi.includes(q) ||
          note.includes(q) ||
          idStr.includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === "date-desc") return (b.date || "").localeCompare(a.date || "");
        if (sortBy === "date-asc") return (a.date || "").localeCompare(b.date || "");
        if (sortBy === "glucose-desc") return (parseFloat(b.glucose) || 0) - (parseFloat(a.glucose) || 0);
        return 0;
      });
  }, [roleFilteredRecords, patientFilter, doctorFilter, search, sortBy, patients, doctors]);

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
      {/* Tiêu đề trang & Nút Thêm */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1">
            <i className="bi bi-journal-medical text-primary me-2"></i>
            Hồ sơ bệnh án
          </h3>
          <p className="text-muted mb-0">
            Theo dõi lịch sử khám bệnh, chỉ số sinh học và chẩn đoán lâm sàng.
          </p>
        </div>
        {canManage && (
          <Button
            variant="primary"
            onClick={handleOpenAdd}
            className="d-flex align-items-center gap-2 shadow-sm px-3 py-2 rounded-3 fw-semibold"
          >
            <i className="bi bi-plus-lg"></i>
            <span>Thêm bệnh án</span>
          </Button>
        )}
      </div>

      {/* Thanh công cụ lọc: Tìm kiếm + Lọc theo Bệnh nhân + Lọc theo Bác sĩ + Sắp xếp */}
      <Card className="border-0 shadow-sm rounded-3 mb-4">
        <Card.Body className="p-3">
          <Row className="g-2 align-items-center">
            {/* 1. Ô Tìm kiếm */}
            <Col xs={12} md={4}>
              <SearchBox
                value={search}
                onChange={(v) => setFilter("q", v)}
                placeholder="Tìm theo từ khóa, chẩn đoán, mã hồ sơ..."
              />
            </Col>

            {/* 2. Lọc theo Bệnh nhân */}
            {currentRole !== ROLES.PATIENT && (
              <Col xs={6} md={3}>
                <Form.Select
                  value={patientFilter}
                  onChange={(e) => setFilter("patientId", e.target.value)}
                  disabled={!!routePatientId}
                  className="rounded-3"
                >
                  <option value="all">Tất cả bệnh nhân ({patients.length})</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.patientCode || `#${p.id}`})
                    </option>
                  ))}
                </Form.Select>
              </Col>
            )}

            {/* 3. Lọc theo Bác sĩ đảm nhiệm */}
            {currentRole === ROLES.ADMIN && (
              <Col xs={6} md={3}>
                <Form.Select
                  value={doctorFilter}
                  onChange={(e) => setFilter("doctorId", e.target.value)}
                  className="rounded-3"
                >
                  <option value="all">Tất cả bác sĩ đảm nhiệm ({doctors.length})</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName}
                    </option>
                  ))}
                </Form.Select>
              </Col>
            )}

            {/* 4. Sắp xếp */}
            <Col xs={12} md={currentRole === ROLES.ADMIN ? 2 : currentRole === ROLES.DOCTOR ? 5 : 8}>
              <Form.Select
                value={sortBy}
                onChange={(e) => setFilter("sortBy", e.target.value)}
                className="rounded-3"
              >
                <option value="date-desc">Ngày khám mới nhất</option>
                <option value="date-asc">Ngày khám cũ nhất</option>
                <option value="glucose-desc">Đường huyết cao nhất</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Bảng Danh Sách Hồ Sơ Bệnh Án */}
      <Card className="border-0 shadow-sm rounded-3">
        <Card.Header className="bg-white border-0 py-3 px-4 d-flex align-items-center justify-content-between">
          <span className="fw-bold text-dark">Danh sách bệnh án</span>
          <Badge bg="light" text="dark" className="border fw-semibold">
            {filteredRecords.length} hồ sơ
          </Badge>
        </Card.Header>
        <Card.Body className="p-0">
          {filteredRecords.length === 0 ? (
            <div className="p-5 text-center">
              <EmptyState
                title="Không có bệnh án"
                message="Không tìm thấy hồ sơ bệnh án nào phù hợp với điều kiện lọc."
                icon="bi-journal-x"
              />
              {(search || patientFilter !== "all" || doctorFilter !== "all") && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="mt-3 rounded-pill px-3"
                  onClick={() => setSearchParams({})}
                >
                  <i className="bi bi-arrow-counterclockwise me-1"></i>
                  Đặt lại bộ lọc
                </Button>
              )}
            </div>
          ) : (
            <Table responsive hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4">ID</th>
                  <th>Ngày khám</th>
                  <th>Bệnh nhân</th>
                  <th>Bác sĩ đảm nhiệm</th>
                  <th>Đường huyết</th>
                  <th>HbA1c</th>
                  <th>BMI</th>
                  <th>Huyết áp</th>
                  <th>Chẩn đoán</th>
                  <th className="text-center pe-4">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((item) => {
                  const glucoseVal = parseFloat(item.glucose) || 0;
                  const hba1cVal = parseFloat(item.hba1c) || 0;
                  const pObj = getPatientObj(item.patientId);
                  const dObj = getDoctorObj(item.doctorId);

                  return (
                    <tr key={item.id}>
                      <td className="ps-4 text-muted small">#{item.id}</td>
                      <td className="fw-medium text-dark">{item.date}</td>
                      <td className="fw-semibold text-primary">{pObj?.fullName || "—"}</td>
                      <td className="text-dark">{dObj?.fullName || "—"}</td>

                      {/* Đường huyết: chữ rõ ràng, badge nhẹ nhàng */}
                      <td>
                        {glucoseVal > 0 ? (
                          <span
                            className={`badge ${
                              glucoseVal >= 140
                                ? "bg-danger bg-opacity-25 text-danger border border-danger"
                                : glucoseVal >= 100
                                ? "bg-warning bg-opacity-25 text-dark border border-warning"
                                : "bg-success bg-opacity-25 text-success border border-success"
                            } px-2 py-1 fw-semibold`}
                          >
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
                            className={`badge ${
                              hba1cVal >= 6.5
                                ? "bg-danger bg-opacity-25 text-danger border border-danger"
                                : hba1cVal >= 5.7
                                ? "bg-warning bg-opacity-25 text-dark border border-warning"
                                : "bg-success bg-opacity-25 text-success border border-success"
                            } px-2 py-1 fw-semibold`}
                          >
                            {item.hba1c}%
                          </span>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>

                      <td>{item.bmi || "—"}</td>
                      <td>{item.bloodPressure || "—"}</td>
                      <td className="fw-medium text-dark">{translateDiagnosis(item.diagnosis)}</td>

                      {/* Thao tác */}
                      <td className="text-center pe-4">
                        <div className="d-inline-flex align-items-center gap-1">
                          <Button
                            variant="light"
                            size="sm"
                            className="border p-1 px-2 rounded-2 text-primary"
                            onClick={() => handleOpenView(item)}
                            title="Xem chi tiết bệnh án"
                          >
                            <i className="bi bi-eye"></i>
                          </Button>

                          {canManage && (
                            <Button
                              variant="light"
                              size="sm"
                              className="border p-1 px-2 rounded-2 text-dark"
                              onClick={() => handleOpenEdit(item)}
                              title="Chỉnh sửa bệnh án"
                            >
                              <i className="bi bi-pencil"></i>
                            </Button>
                          )}

                          {currentRole === ROLES.ADMIN && (
                            <Button
                              variant="light"
                              size="sm"
                              className="border p-1 px-2 rounded-2 text-danger"
                              onClick={() => handleDelete(item.id)}
                              title="Xóa bệnh án"
                            >
                              <i className="bi bi-trash3"></i>
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

      {/* MODAL 1: XEM CHI TIẾT HỒ SƠ BỆNH ÁN */}
      {viewingRecord && (
        <Modal
          title={`Chi tiết Bệnh án #${viewingRecord.id}`}
          isOpen={!!viewingRecord}
          onClose={() => setViewingRecord(null)}
          size="lg"
        >
          <div>
            <div className="p-3 bg-light rounded-3 border mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div>
                <span className="text-muted small">Ngày khám:</span>
                <strong className="text-dark fs-6 ms-2">
                  <i className="bi bi-calendar3 text-primary me-1"></i>
                  {viewingRecord.date}
                </strong>
              </div>
              <Badge bg="primary" className="px-3 py-2">
                Hồ sơ bệnh án #{viewingRecord.id}
              </Badge>
            </div>

            {/* Thông tin Bệnh nhân & Bác sĩ */}
            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Card className="border shadow-none h-100">
                  <Card.Body className="p-3">
                    <h6 className="fw-bold text-primary mb-2">Thông tin Bệnh nhân</h6>
                    {(() => {
                      const p = getPatientObj(viewingRecord.patientId);
                      return (
                        <div className="small">
                          <div className="mb-1"><strong>Họ và tên:</strong> {p?.fullName || "—"}</div>
                          <div className="mb-1"><strong>Mã hồ sơ:</strong> {p?.patientCode || `#${viewingRecord.patientId}`}</div>
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
                    <h6 className="fw-bold text-primary mb-2">Bác sĩ Đảm nhiệm</h6>
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

            {/* 4 Chỉ Số Sinh Học */}
            <h6 className="fw-bold text-dark mb-2">Chỉ số Sinh học</h6>
            <Row className="g-2 mb-3">
              <Col xs={6} md={3}>
                <div className="p-3 border rounded-3 text-center bg-light">
                  <div className="text-muted small">Đường huyết</div>
                  <div className="fs-5 fw-bold text-danger my-1">
                    {viewingRecord.glucose ? `${viewingRecord.glucose} mg/dL` : "—"}
                  </div>
                </div>
              </Col>

              <Col xs={6} md={3}>
                <div className="p-3 border rounded-3 text-center bg-light">
                  <div className="text-muted small">HbA1c</div>
                  <div className="fs-5 fw-bold text-warning my-1">
                    {viewingRecord.hba1c ? `${viewingRecord.hba1c}%` : "—"}
                  </div>
                </div>
              </Col>

              <Col xs={6} md={3}>
                <div className="p-3 border rounded-3 text-center bg-light">
                  <div className="text-muted small">BMI</div>
                  <div className="fs-5 fw-bold text-primary my-1">
                    {viewingRecord.bmi || "—"}
                  </div>
                </div>
              </Col>

              <Col xs={6} md={3}>
                <div className="p-3 border rounded-3 text-center bg-light">
                  <div className="text-muted small">Huyết áp</div>
                  <div className="fs-5 fw-bold text-info my-1">
                    {viewingRecord.bloodPressure || "—"}
                  </div>
                </div>
              </Col>
            </Row>

            {/* Chẩn đoán & Ghi chú */}
            <div className="p-3 border rounded-3 bg-white mb-3">
              <div className="fw-bold text-dark mb-1">Chẩn đoán lâm sàng:</div>
              <p className="text-dark mb-2 fs-6 fw-semibold">
                {translateDiagnosis(viewingRecord.diagnosis)}
              </p>
              {viewingRecord.note && (
                <div className="mt-2 pt-2 border-top small text-muted">
                  <strong>Ghi chú bác sĩ:</strong> {viewingRecord.note}
                </div>
              )}
            </div>

            {/* Nút đóng & sửa */}
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
                  <i className="bi bi-pencil me-1"></i>
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
                      {p.fullName} ({p.patientCode || `#${p.id}`})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col xs={12} md={6}>
              <Form.Group className="mb-2" controlId="recDoctor">
                <Form.Label className="fw-semibold d-flex align-items-center gap-2">
                  Bác sĩ đảm nhiệm
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
                label="Đường huyết (mg/dL)"
                name="glucose"
                type="number"
                value={form.glucose}
                onChange={handleChange}
                placeholder="ví dụ: 105"
              />
            </Col>

            <Col xs={12} md={4}>
              <Input
                label="HbA1c (%)"
                name="hba1c"
                type="number"
                step="0.1"
                value={form.hba1c}
                onChange={handleChange}
                placeholder="ví dụ: 5.7"
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
                placeholder="ví dụ: 22.4"
              />
            </Col>

            <Col xs={12} md={4}>
              <Input
                label="Huyết áp"
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
                placeholder="Nhập chẩn đoán..."
                required
              />
            </Col>

            <Col xs={12}>
              <Form.Group controlId="recNote">
                <Form.Label className="fw-semibold">Ghi chú / Lời dặn dò</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="note"
                  value={form.note || ""}
                  onChange={handleChange}
                  placeholder="Ghi chú thêm..."
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
