import React, { useMemo, useState } from "react";
import { Row, Col, Card, Table, Badge, Button } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import StatCard from "./StatCard";
import QuickViewModal from "./QuickViewModal";
import StatusBadge from "../common/StatusBadge";
import { ROUTES } from "../../config/routes";
import { getDoctorWeeklySchedule } from "../../utils/dutySchedule";
import { getLocalDateStr } from "../../utils/dutySchedule";

const RISK_COLORS = {
  High: "#dc3545",
  Medium: "#ffc107",
  Low: "#198754",
};

/**
 * Giao diện Dashboard chuyên biệt cho Quản trị viên (Admin Operations Center - Thuần Tiếng Việt)
 */
function AdminDashboard({
  patients = [],
  doctors = [],
  appointments = [],
  records = [],
  onUpdateAppointmentStatus,
}) {
  const navigate = useNavigate();
  const today = getLocalDateStr();

  // State quản lý QuickViewModal
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    subtitle: "",
    type: "patients",
    data: [],
  });

  const openQuickView = (type, title, subtitle, data) => {
    setModalConfig({
      isOpen: true,
      title,
      subtitle,
      type,
      data,
    });
  };

  const closeQuickView = () => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  };

  const todayAppointments = appointments.filter((a) => a.date === today);
  const recentPatients = [...patients].slice(-5).reverse();

  // Số bác sĩ đang trực hôm nay
  const doctorsOnDutyToday = useMemo(() => {
    return doctors.filter((doc) => {
      const schedule = getDoctorWeeklySchedule(doc, appointments);
      const todayItem = schedule.find((s) => s.isToday);
      return todayItem && todayItem.isWorking;
    });
  }, [doctors, appointments]);

  const getPatientName = (id) => patients.find((p) => Number(p.id) === Number(id))?.fullName || "Chưa xác định";
  const getDoctorName = (id) => doctors.find((d) => Number(d.id) === Number(id))?.fullName || "Chưa xác định";

  // Thống kê trạng thái lịch hẹn
  const appointmentStatusData = useMemo(() => {
    const statusMap = {
      Pending: "Chờ duyệt",
      Approved: "Đã duyệt",
      Completed: "Hoàn thành",
      Cancelled: "Đã hủy",
    };
    return ["Pending", "Approved", "Completed", "Cancelled"].map((k) => ({
      status: statusMap[k],
      total: appointments.filter((a) => a.status === k).length,
    }));
  }, [appointments]);

  // Thống kê phân loại rủi ro bệnh nhân
  const riskData = useMemo(() => {
    const counts = { High: 0, Medium: 0, Low: 0 };
    patients.forEach((p) => {
      const r = p.riskLevel || "Low";
      if (counts[r] !== undefined) counts[r]++;
      else counts.Low++;
    });
    return [
      { name: "Nguy cơ Cao", value: counts.High, color: RISK_COLORS.High },
      { name: "Trung bình", value: counts.Medium, color: RISK_COLORS.Medium },
      { name: "Thấp", value: counts.Low, color: RISK_COLORS.Low },
    ];
  }, [patients]);

  return (
    <div>
      {/* Tiêu đề & Action Center */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h2 className="fw-bold text-dark mb-0">Trung tâm Điều hành Phòng khám</h2>
            <Badge bg="danger" className="px-2 py-1 fs-6 rounded-pill">
              <i className="bi bi-shield-lock me-1"></i>ADMIN
            </Badge>
          </div>
          <p className="text-muted mb-0">Giám sát nguồn lực, bác sĩ, tiếp nhận bệnh nhân toàn viện</p>
        </div>

        {/* Thanh tác vụ nhanh của Admin — mở pop-up xem nhanh */}
        <div className="d-flex flex-wrap gap-2">
          <Button
            variant="danger"
            className="d-flex align-items-center gap-2 shadow-sm"
            onClick={() =>
              openQuickView(
                "doctors",
                "Danh sách Bác sĩ Phòng khám",
                "Quản lý thông tin chuyên khoa, phòng khám và ca trực của bác sĩ",
                doctors
              )
            }
          >
            <i className="bi bi-person-badge-fill"></i>
            <span>Quản lý Bác sĩ</span>
          </Button>
          <Button
            variant="primary"
            className="d-flex align-items-center gap-2 shadow-sm"
            onClick={() =>
              openQuickView(
                "patients",
                "Danh sách Bệnh nhân Toàn hệ thống",
                "Xem nhanh và tiếp nhận hồ sơ bệnh nhân trong phòng khám",
                patients
              )
            }
          >
            <i className="bi bi-person-plus-fill"></i>
            <span>Thêm Bệnh nhân</span>
          </Button>
          <Button
            variant="outline-primary"
            className="d-flex align-items-center gap-2 bg-white shadow-sm"
            title="Xem và phân ca trực cho đội ngũ Bác sĩ"
            onClick={() => {
              const allSchedules = doctors.flatMap((doc) =>
                getDoctorWeeklySchedule(doc, appointments).map((s) => ({
                  ...s,
                  doctorName: doc.fullName,
                }))
              );
              openQuickView(
                "dutySchedule",
                "Lịch Trực Toàn Viện Tuần Này",
                "Phân bổ ca trực theo từng bác sĩ trong tuần",
                allSchedules
              );
            }}
          >
            <i className="bi bi-calendar2-week-fill text-primary"></i>
            <span>Tạo Lịch trực</span>
          </Button>
        </div>
      </div>

      {/* 4 Thẻ KPI điều hành toàn viện */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Tổng bệnh nhân"
            value={patients.length}
            icon={<i className="bi bi-people-fill"></i>}
            note="Hồ sơ đang hoạt động"
            onClick={() =>
              openQuickView(
                "patients",
                "Danh sách Bệnh nhân Toàn hệ thống",
                "Xem nhanh danh sách tất cả hồ sơ bệnh nhân trong phòng khám",
                patients
              )
            }
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Tổng bác sĩ"
            value={doctors.length}
            icon={<i className="bi bi-person-badge-fill"></i>}
            note="Bác sĩ sẵn sàng trực"
            onClick={() =>
              openQuickView(
                "doctors",
                "Danh sách Bác sĩ Phòng khám",
                "Thông tin chuyên khoa, phòng khám và ca trực của bác sĩ",
                doctors
              )
            }
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Lịch trực hôm nay"
            value={doctorsOnDutyToday.length}
            icon={<i className="bi bi-calendar-week-fill"></i>}
            note="Bác sĩ đang trực"
            onClick={() => {
              const allSchedules = doctors.flatMap((doc) =>
                getDoctorWeeklySchedule(doc, appointments).map((s) => ({
                  ...s,
                  doctorName: doc.fullName,
                }))
              );
              openQuickView(
                "dutySchedule",
                "Lịch Trực Toàn Viện Hôm nay",
                `Phân bổ ca trực của toàn bộ bác sĩ ngày ${today}`,
                allSchedules.filter((s) => s.isToday)
              );
            }}
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Hồ sơ bệnh án"
            value={records.length}
            icon={<i className="bi bi-file-earmark-medical-fill"></i>}
            note="Bệnh án lưu trữ"
            onClick={() =>
              openQuickView(
                "records",
                "Hồ sơ Bệnh án Toàn viện",
                "Tổng hợp kết quả khám và chỉ số sinh học của tất cả bệnh nhân",
                records
              )
            }
          />
        </Col>
      </Row>

      {/* Biểu đồ phân bổ Lịch hẹn & Phân loại rủi ro bệnh nhân */}
      <Row className="g-4 mb-4">
        <Col xs={12} lg={7}>
          <Card className="border-0 shadow-sm rounded-3 h-100">
            <Card.Header className="bg-white border-0 pt-3 pb-0">
              <Card.Title as="h5" className="fw-bold mb-1">
                Trạng thái Lịch hẹn
              </Card.Title>
              <Card.Subtitle className="text-muted small">
                Phân bố trạng thái lịch hẹn toàn viện
              </Card.Subtitle>
            </Card.Header>
            <Card.Body>
              <div style={{ width: "100%", height: "260px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={appointmentStatusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="status" stroke="#94a3b8" fontSize={12} />
                    <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                      }}
                    />
                    <Bar dataKey="total" fill="#0d6efd" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} lg={5}>
          <Card className="border-0 shadow-sm rounded-3 h-100">
            <Card.Header className="bg-white border-0 pt-3 pb-0">
              <Card.Title as="h5" className="fw-bold mb-1">
                Phân loại Nguy cơ Bệnh nhân
              </Card.Title>
              <Card.Subtitle className="text-muted small">
                Tỷ lệ mức độ rủi ro tiểu đường toàn viện
              </Card.Subtitle>
            </Card.Header>
            <Card.Body className="d-flex flex-column justify-content-center">
              <div style={{ width: "100%", height: "180px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                      {riskData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="d-flex justify-content-center gap-3 mt-2 small">
                {riskData.map((item, idx) => (
                  <div key={idx} className="d-flex align-items-center gap-1">
                    <span style={{ width: "10px", height: "10px", backgroundColor: item.color, borderRadius: "50%", display: "inline-block" }}></span>
                    <span className="text-muted">{item.name}: <strong>{item.value}</strong></span>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Bệnh nhân mới tiếp nhận — Lịch hẹn do Bác sĩ tự quản lý */}
      <Row className="g-4">
        {/* Bệnh nhân mới tiếp nhận */}
        <Col xs={12}>
          <Card className="border-0 shadow-sm rounded-3 h-100">
            <Card.Header className="bg-white border-0 pt-3 pb-2 d-flex justify-content-between align-items-center">
              <div>
                <Card.Title as="h5" className="fw-bold mb-1 text-dark">
                  <i className="bi bi-person-plus text-primary me-2"></i>
                  Bệnh nhân mới tiếp nhận
                </Card.Title>
                <Card.Subtitle className="text-muted small">
                  Danh sách hồ sơ bệnh nhân đăng ký mới — Lịch hẹn do từng Bác sĩ tự quản lý
                </Card.Subtitle>
              </div>
              <Link to={ROUTES.PATIENTS} className="small fw-semibold text-primary">
                Xem tất cả →
              </Link>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">Mã BN</th>
                    <th>Họ và tên</th>
                    <th>Giới tính</th>
                    <th>Tuổi</th>
                    <th>Bảo hiểm</th>
                    <th>Mức nguy cơ</th>
                    <th className="pe-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPatients.map((p) => (
                    <tr key={p.id}>
                      <td className="ps-3 fw-semibold text-primary">
                        {p.patientCode || `PT-${String(p.id).padStart(3, "0")}`}
                      </td>
                      <td className="fw-medium">{p.fullName}</td>
                      <td>{p.gender === "Male" ? "Nam" : "Nữ"}</td>
                      <td>{p.age}</td>
                      <td>
                        <StatusBadge status={p.insuranceType || "Standard"} />
                      </td>
                      <td>
                        <StatusBadge status={p.riskLevel || "Low"} />
                      </td>
                      <td className="pe-3">
                        <StatusBadge status={p.status || "Active"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick View Modal */}
      <QuickViewModal
        isOpen={modalConfig.isOpen}
        onClose={closeQuickView}
        title={modalConfig.title}
        subtitle={modalConfig.subtitle}
        type={modalConfig.type}
        data={modalConfig.data}
        patients={patients}
        doctors={doctors}
      />
    </div>
  );
}

export default AdminDashboard;
