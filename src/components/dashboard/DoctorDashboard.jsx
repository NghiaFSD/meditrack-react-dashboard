import React, { useMemo, useState } from "react";
import { Row, Col, Card, Table, Badge, Button } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import StatCard from "./StatCard";
import HealthChart from "./HealthChart";
import QuickViewModal from "./QuickViewModal";
import StatusBadge from "../common/StatusBadge";
import { ROUTES } from "../../config/routes";
import { translateReason } from "../../utils/translations";
import { getDoctorWeeklySchedule, getLocalDateStr } from "../../utils/dutySchedule";

/**
 * Sub-component: Chọn bệnh nhân để xem biểu đồ đường huyết
 */
function SelectedPatientGlucoseChart({ myPatients, records, defaultPatientId }) {
  const [selectedId, setSelectedId] = React.useState(String(defaultPatientId || myPatients[0]?.id || ""));

  React.useEffect(() => {
    if (defaultPatientId) {
      setSelectedId(String(defaultPatientId));
    } else if (myPatients.length > 0 && !selectedId) {
      setSelectedId(String(myPatients[0].id));
    }
  }, [defaultPatientId, myPatients]);

  const selectedPatient = myPatients.find((p) => String(p.id) === String(selectedId)) || myPatients[0];
  const activeId = selectedPatient ? String(selectedPatient.id) : String(selectedId);
  const filteredRecords = (records || [])
    .filter((r) => String(r.patientId) === activeId)
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  return (
    <div className="mb-4">
      <div className="d-flex align-items-center gap-3 mb-2 flex-wrap">
        <h6 className="fw-bold text-dark mb-0">
          <i className="bi bi-graph-up-arrow text-primary me-2"></i>
          Biểu đồ Đường huyết
        </h6>
        <select
          className="form-select form-select-sm w-auto"
          value={activeId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {myPatients.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.fullName} ({p.patientCode || `#${p.id}`})
            </option>
          ))}
        </select>
      </div>
      <HealthChart
        data={filteredRecords}
        patientName={selectedPatient?.fullName || null}
      />
    </div>
  );
}

/**
 * Giao diện Bàn làm việc Bác sĩ Lâm sàng (đã tối giản)
 */
function DoctorDashboard({
  doctor,
  patients = [],
  appointments = [],
  records = [],
  onUpdateAppointmentStatus,
}) {
  const navigate = useNavigate();
  const today = getLocalDateStr();

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    subtitle: "",
    type: "patients",
    data: [],
  });

  const openQuickView = (type, title, subtitle, data) => {
    setModalConfig({ isOpen: true, title, subtitle, type, data });
  };

  const closeQuickView = () => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  };

  const docId = Number(doctor?.id || 1);

  const myAppointments = useMemo(
    () => appointments.filter((a) => Number(a.doctorId) === docId),
    [appointments, docId]
  );
  const myRecords = useMemo(
    () => records.filter((r) => Number(r.doctorId) === docId),
    [records, docId]
  );

  const myAssignedPatientIds = useMemo(() => {
    return new Set([
      ...myAppointments.map((a) => Number(a.patientId)),
      ...myRecords.map((r) => Number(r.patientId)),
    ]);
  }, [myAppointments, myRecords]);

  const myPatients = useMemo(
    () => patients.filter((p) => myAssignedPatientIds.has(Number(p.id))),
    [patients, myAssignedPatientIds]
  );

  const myTodayAppointments = useMemo(
    () => myAppointments.filter((a) => a.date === today),
    [myAppointments, today]
  );

  const myPendingApprovals = useMemo(
    () => myAppointments.filter((a) => a.status === "Pending"),
    [myAppointments]
  );

  const weeklySchedule = useMemo(
    () => getDoctorWeeklySchedule(doctor, appointments),
    [doctor, appointments]
  );

  const todayScheduleItem = useMemo(
    () => weeklySchedule.find((item) => item.isToday) || weeklySchedule[0],
    [weeklySchedule]
  );

  // Số ca trực tuần này
  const weeklyWorkingCount = useMemo(
    () => weeklySchedule.filter((d) => d.isWorking).length,
    [weeklySchedule]
  );

  // Hàng đợi cần xử lý hôm nay
  const activeQueue = useMemo(() => {
    return myAppointments
      .filter((a) => a.status === "Pending" || a.date === today)
      .sort((a, b) => (a.status === "Pending" ? -1 : 1));
  }, [myAppointments, today]);

  // Bệnh nhân nguy cơ cao
  const highRiskPatients = useMemo(() => {
    return myPatients
      .map((p) => {
        const pRecords = (records || [])
          .filter((r) => Number(r.patientId) === Number(p.id))
          .sort((a, b) => a.date.localeCompare(b.date));
        const latestRec = pRecords[pRecords.length - 1];
        return {
          ...p,
          latestGlucose: latestRec?.glucose || "-",
          latestBP: latestRec?.bloodPressure || "-",
          latestRec,
        };
      })
      .filter((p) => p.riskLevel === "High" || (p.latestRec && Number(p.latestRec.glucose) >= 140));
  }, [myPatients, records]);

  const getPatientName = (id) =>
    patients.find((p) => Number(p.id) === Number(id))?.fullName || "Chưa xác định";

  return (
    <div>
      {/* Greeting row — gọn nhẹ */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            Xin chào, {doctor?.fullName || "Bác sĩ"} 👋
          </h4>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <small className="text-muted">
              <i className="bi bi-hospital me-1"></i>
              {doctor?.specialization || "Nội tiết"} · Phòng {doctor?.room || "A-201"}
            </small>
            <span className="text-muted">·</span>
            {todayScheduleItem?.isWorking ? (
              <Badge bg="success" className="fw-semibold rounded-pill">
                <i className="bi bi-clock me-1"></i>
                Hôm nay: {todayScheduleItem.shiftType} ({todayScheduleItem.shiftHours})
              </Badge>
            ) : (
              <Badge bg="secondary" className="fw-semibold rounded-pill">
                <i className="bi bi-moon me-1"></i>
                Hôm nay: Nghỉ trực
              </Badge>
            )}
          </div>
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="outline-primary"
            size="sm"
            className="d-flex align-items-center gap-1 rounded-pill px-3"
            onClick={() =>
              openQuickView(
                "schedule",
                "Lịch Trực Tuần Này",
                `Phân bổ ca trực của ${doctor?.fullName || "Bác sĩ"}`,
                weeklySchedule
              )
            }
          >
            <i className="bi bi-calendar3"></i>
            Xem lịch trực tuần
          </Button>
          <Link to={ROUTES.RECORDS}>
            <Button
              variant="primary"
              size="sm"
              className="d-flex align-items-center gap-1 rounded-pill px-3"
            >
              <i className="bi bi-file-earmark-plus"></i>
              Tạo bệnh án
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Thẻ KPI */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Bệnh nhân phụ trách"
            value={myPatients.length}
            icon={<i className="bi bi-people-fill text-primary"></i>}
            note="Đang theo dõi điều trị"
            onClick={() =>
              openQuickView(
                "patients",
                "Danh Sách Bệnh Nhân Phụ Trách",
                "Toàn bộ bệnh nhân có lịch hẹn hoặc hồ sơ với bạn",
                myPatients
              )
            }
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Lịch khám hôm nay"
            value={myTodayAppointments.length}
            icon={<i className="bi bi-calendar-check-fill text-info"></i>}
            note={`Ca: ${todayScheduleItem?.shiftHours || "07:30 - 11:30"}`}
            onClick={() =>
              openQuickView(
                "appointments",
                "Lịch Khám Hôm Nay",
                `Các cuộc hẹn trong ngày ${today}`,
                myTodayAppointments
              )
            }
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Ca trực tuần này"
            value={`${weeklyWorkingCount} ca`}
            icon={<i className="bi bi-calendar-week-fill text-warning"></i>}
            note={`Phòng ${doctor?.room || "A-201"}`}
            onClick={() =>
              openQuickView(
                "schedule",
                "Lịch Trực Tuần Này",
                `Chi tiết 7 ngày của ${doctor?.fullName || "Bác sĩ"}`,
                weeklySchedule
              )
            }
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <StatCard
            title="Yêu cầu chờ duyệt"
            value={myPendingApprovals.length}
            icon={<i className="bi bi-clock-history text-danger"></i>}
            note="Cần duyệt gấp"
            onClick={() =>
              openQuickView(
                "appointments",
                "Lịch Hẹn Chờ Duyệt",
                "Các lịch hẹn bệnh nhân cần bác sĩ xác nhận",
                myPendingApprovals
              )
            }
          />
        </Col>
      </Row>

      {/* Hàng đợi Khám & Cảnh báo nguy cơ cao */}
      <Row className="g-4 mb-4">
        <Col xs={12} lg={7}>
          <Card className="border-0 shadow-sm rounded-3 h-100">
            <Card.Header className="bg-white border-0 pt-3 pb-2 d-flex justify-content-between align-items-center">
              <div>
                <Card.Title as="h5" className="fw-bold mb-1 text-dark">
                  <i className="bi bi-list-check text-primary me-2"></i>
                  Hàng đợi khám hôm nay
                </Card.Title>
                <Card.Subtitle className="text-muted small">
                  Ca khám cần tiếp nhận và xử lý trong ngày
                </Card.Subtitle>
              </div>
              <Badge bg="primary" className="px-2 py-1 rounded-pill">
                {activeQueue.length} ca
              </Badge>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">Giờ khám</th>
                    <th>Bệnh nhân</th>
                    <th>Lý do khám</th>
                    <th>Trạng thái</th>
                    <th className="text-center pe-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {activeQueue.map((item) => (
                    <tr key={item.id}>
                      <td className="ps-3 fw-medium">
                        {item.time} <small className="text-muted d-block">{item.date}</small>
                      </td>
                      <td className="fw-semibold text-primary">
                        <Link to={ROUTES.PATIENT_DETAIL(item.patientId)} className="text-decoration-none">
                          {getPatientName(item.patientId)}
                        </Link>
                      </td>
                      <td>{translateReason(item.reason)}</td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="text-center pe-3">
                        <div className="d-flex justify-content-center gap-1">
                          {item.status === "Pending" && (
                            <Button
                              size="sm"
                              variant="success"
                              className="py-1 px-2 fw-medium rounded-pill"
                              onClick={() => onUpdateAppointmentStatus(item, "Approved")}
                            >
                              <i className="bi bi-check me-1"></i>Duyệt
                            </Button>
                          )}
                          {item.status === "Approved" && (
                            <Button
                              size="sm"
                              variant="primary"
                              className="py-1 px-2 fw-medium rounded-pill"
                              onClick={() => onUpdateAppointmentStatus(item, "Completed")}
                            >
                              <i className="bi bi-check2-all me-1"></i>Khám xong
                            </Button>
                          )}
                          {item.status === "Completed" && (
                            <span className="text-muted small">✓ Đã khám</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeQueue.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted">
                        <i className="bi bi-check-circle fs-3 text-success d-block mb-1"></i>
                        Không có ca khám nào trong hàng đợi hôm nay.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        {/* Cảnh báo nguy cơ cao */}
        <Col xs={12} lg={5}>
          <Card className="border-0 shadow-sm rounded-3 h-100 border-top border-danger border-3">
            <Card.Header className="bg-white border-0 pt-3 pb-2 d-flex justify-content-between align-items-center">
              <div>
                <Card.Title as="h5" className="fw-bold mb-1 text-danger">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  Cảnh báo Nguy cơ cao
                </Card.Title>
                <Card.Subtitle className="text-muted small">
                  Glucose &gt; 140 mg/dL hoặc huyết áp bất thường
                </Card.Subtitle>
              </div>
              <Badge bg="danger" className="px-2 py-1 rounded-pill">
                {highRiskPatients.length} cảnh báo
              </Badge>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">Bệnh nhân</th>
                    <th>Glucose</th>
                    <th>Huyết áp</th>
                    <th className="pe-3">Xem</th>
                  </tr>
                </thead>
                <tbody>
                  {highRiskPatients.map((p) => (
                    <tr key={p.id}>
                      <td className="ps-3">
                        <div className="fw-semibold text-dark">{p.fullName}</div>
                        <small className="text-muted">{p.patientCode || `#${p.id}`}</small>
                      </td>
                      <td>
                        <span className="badge bg-danger bg-opacity-10 text-danger fw-bold px-2 py-1">
                          {p.latestGlucose} mg/dL
                        </span>
                      </td>
                      <td className="small text-muted">{p.latestBP}</td>
                      <td className="pe-3">
                        <Link to={ROUTES.PATIENT_DETAIL(p.id)}>
                          <Button size="sm" variant="outline-danger" className="rounded-pill py-0 px-2">
                            <i className="bi bi-eye me-1"></i>Xem
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {highRiskPatients.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-muted">
                        <i className="bi bi-shield-check fs-3 text-success d-block mb-1"></i>
                        Không có bệnh nhân nào có nguy cơ cao.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Biểu đồ xu hướng đường huyết */}
      {myPatients.length > 0 && (() => {
        const defaultPatient = highRiskPatients[0] || myPatients[0];
        return (
          <SelectedPatientGlucoseChart
            myPatients={myPatients}
            records={records}
            defaultPatientId={defaultPatient?.id}
          />
        );
      })()}

      {/* Quick View Modal */}
      <QuickViewModal
        isOpen={modalConfig.isOpen}
        onClose={closeQuickView}
        title={modalConfig.title}
        subtitle={modalConfig.subtitle}
        type={modalConfig.type}
        data={modalConfig.data}
        patients={patients}
        doctors={[{ id: docId, fullName: doctor?.fullName }]}
        onApproveAppointment={onUpdateAppointmentStatus}
      />
    </div>
  );
}

export default DoctorDashboard;
