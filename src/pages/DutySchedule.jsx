import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Card, Table, Badge, Form, Button } from "react-bootstrap";
import { doctorApi } from "../api/doctorApi";
import { appointmentApi } from "../api/appointmentApi";
import { patientApi } from "../api/patientApi";
import Loading from "../components/common/Loading";
import SearchBox from "../components/common/SearchBox";
import { getDoctorWeeklySchedule, getRealtimeShiftStatus, getLocalDateStr } from "../utils/dutySchedule";
import { translateSpecialty } from "../utils/translations";
import CreateDutyModal from "../components/duty/CreateDutyModal";
import QuickViewModal from "../components/dashboard/QuickViewModal";
import { ROUTES } from "../config/routes";

/**
 * Trang Quản lý Lịch trực Bác sĩ — Dành riêng cho Admin
 * Hiển thị lịch trực tuần của toàn bộ bác sĩ trong phòng khám
 */
function DutySchedule() {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [shiftFilter, setShiftFilter] = useState("All");
  const [dayFilter, setDayFilter] = useState("All");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [scheduleVersion, setScheduleVersion] = useState(0);

  // Pop-up xem nhanh
  const [quickViewModal, setQuickViewModal] = useState({
    isOpen: false,
    type: "",
    title: "",
    subtitle: "",
    data: [],
    targetPage: "",
  });

  const openQuickView = (type, title, subtitle, data, targetPage = "") => {
    setQuickViewModal({
      isOpen: true,
      type,
      title,
      subtitle,
      data,
      targetPage,
    });
  };

  const closeQuickView = () => {
    setQuickViewModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Timer cập nhật mỗi phút — để trạng thái tự chuyển theo giờ thực
  const [currentTime, setCurrentTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // today luôn là ngày local — tránh lệch UTC khi dùng toISOString()
  const today = getLocalDateStr(currentTime);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [docs, appts, pts] = await Promise.all([
          doctorApi.getAll(),
          appointmentApi.getAll(),
          patientApi.getAll(),
        ]);
        setDoctors(docs || []);
        setAppointments(appts || []);
        setPatients(pts || []);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Tạo danh sách lịch trực đã flatten: mỗi bác sĩ × mỗi ca trực trong tuần
  const allScheduleRows = useMemo(() => {
    return doctors.flatMap((doc) => {
      const schedule = getDoctorWeeklySchedule(doc, appointments);
      return schedule.flatMap((s) => {
        // Nếu ngày này bác sĩ có mảng ca trực (shifts)
        if (s.shifts && s.shifts.length > 0) {
          return s.shifts.map((shiftItem, sIdx) => {
            const shiftAppts = (s.appointments || []).filter((a) => {
              const isMorningAppt = a.time < "12:30";
              const isMorningShift = shiftItem.shiftType === "Ca sáng";
              return isMorningAppt === isMorningShift;
            });

            return {
              ...s,
              shiftType: shiftItem.shiftType,
              shiftHours: shiftItem.shiftHours,
              room: shiftItem.room,
              nurse: shiftItem.nurse,
              appointmentsCount: shiftAppts.length,
              appointments: shiftAppts,
              doctorId: doc.id,
              doctorName: doc.fullName,
              specialization: doc.specialization || doc.specialty || "Nội tổng quát",
              shiftIndex: sIdx,
            };
          });
        }

        return [
          {
            ...s,
            doctorId: doc.id,
            doctorName: doc.fullName,
            specialization: doc.specialization || doc.specialty || "Nội tổng quát",
          },
        ];
      });
    });
  }, [doctors, appointments, scheduleVersion]);

  // Thống kê tổng quan hôm nay — tính theo giờ thực
  const todayStats = useMemo(() => {
    const todayRows = allScheduleRows.filter((r) => r.isToday);
    const morningRows = todayRows.filter((r) => r.shiftType === "Ca sáng");
    const afternoonRows = todayRows.filter((r) => r.shiftType === "Ca chiều");
    // "Đang trực" = ca đang trong khung giờ theo thời gian thực
    const activeRows = todayRows.filter(
      (r) => getRealtimeShiftStatus(r, currentTime).key === "active"
    );
    return {
      morning: morningRows.length,
      morningRows,
      afternoon: afternoonRows.length,
      afternoonRows,
      working: activeRows.length,
      activeRows,
      total: doctors.length,
      todayRows,
    };
  }, [allScheduleRows, doctors.length, currentTime]);

  // Lấy danh sách ngày duy nhất để lọc
  const uniqueDays = useMemo(() => {
    const seen = new Set();
    return allScheduleRows
      .filter((r) => { if (seen.has(r.date)) return false; seen.add(r.date); return true; })
      .map((r) => ({ date: r.date, dayName: r.dayName }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [allScheduleRows]);

  // Lọc & tìm kiếm
  const filteredRows = useMemo(() => {
    return allScheduleRows.filter((r) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        q === "" ||
        (r.doctorName || "").toLowerCase().includes(q) ||
        (r.specialization || "").toLowerCase().includes(q) ||
        translateSpecialty(r.specialization || "").toLowerCase().includes(q) ||
        (r.room || "").toLowerCase().includes(q) ||
        (r.nurse || "").toLowerCase().includes(q);

      const matchShift = shiftFilter === "All" || r.shiftType === shiftFilter;
      const matchDay = dayFilter === "All" || r.date === dayFilter;
      return matchSearch && matchShift && matchDay;
    });
  }, [allScheduleRows, search, shiftFilter, dayFilter]);

  // Group theo ngày
  const rowsByDay = useMemo(() => {
    const map = {};
    filteredRows.forEach((r) => {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    });
    return map;
  }, [filteredRows]);

  const orderedDays = useMemo(() => Object.keys(rowsByDay).sort(), [rowsByDay]);

  if (loading) return <Loading />;

  return (
    <>
    <Container fluid className="py-2">
      {/* Tiêu đề + nút tạo */}
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1">
            <i className="bi bi-calendar-week-fill text-primary me-2"></i>
            Quản lý Lịch trực Bác sĩ
          </h3>
          <p className="text-muted mb-0">
            Theo dõi và phân bổ ca trực của toàn bộ bác sĩ trong phòng khám theo tuần
          </p>
        </div>
        <Button
          variant="primary"
          className="d-flex align-items-center gap-2 shadow-sm"
          onClick={() => setShowCreateModal(true)}
        >
          <i className="bi bi-calendar2-plus-fill"></i>
          Tạo Lịch trực
        </Button>
      </div>

      {/* 4 Thẻ thống kê (Có Pop-up xem nhanh khi click) */}
      <Row className="g-3 mb-4">
        {[
          {
            label: "Tổng bác sĩ",
            value: todayStats.total,
            icon: "bi-person-badge-fill",
            color: "primary",
            note: "Toàn bộ đội ngũ (Bấm xem)",
            onClick: () =>
              openQuickView(
                "doctors",
                "Danh Sách Toàn Bộ Bác Sĩ",
                `Tổng cộng ${doctors.length} bác sĩ trong hệ thống phòng khám`,
                doctors,
                ROUTES.DOCTORS
              ),
          },
          {
            label: "Đang trực hôm nay",
            value: todayStats.working,
            icon: "bi-broadcast",
            color: "success",
            note: `Ngày ${today} (Bấm xem)`,
            onClick: () =>
              openQuickView(
                "dutySchedule",
                "Bác Sĩ Đang Trực Hôm Nay",
                `Các ca trực đang trong khung giờ làm việc ngày ${today}`,
                todayStats.activeRows
              ),
          },
          {
            label: "Ca sáng hôm nay",
            value: todayStats.morning,
            icon: "bi-brightness-high-fill",
            color: "warning",
            note: "07:30 – 11:30 (Bấm xem)",
            onClick: () =>
              openQuickView(
                "dutySchedule",
                "Lịch Trực Ca Sáng Hôm Nay",
                `Danh sách bác sĩ trực ca sáng (07:30 – 11:30) ngày ${today}`,
                todayStats.morningRows
              ),
          },
          {
            label: "Ca chiều hôm nay",
            value: todayStats.afternoon,
            icon: "bi-moon-stars-fill",
            color: "info",
            note: "13:30 – 17:30 (Bấm xem)",
            onClick: () =>
              openQuickView(
                "dutySchedule",
                "Lịch Trực Ca Chiều Hôm Nay",
                `Danh sách bác sĩ trực ca chiều (13:30 – 17:30) ngày ${today}`,
                todayStats.afternoonRows
              ),
          },
        ].map((stat, i) => (
          <Col xs={12} sm={6} lg={3} key={i}>
            <Card
              className="border-0 shadow-sm rounded-3 h-100 transition-all cursor-pointer hover-shadow"
              style={{ cursor: "pointer" }}
              onClick={stat.onClick}
              title={`Nhấn để xem chi tiết ${stat.label}`}
            >
              <Card.Body className="d-flex align-items-center gap-3 p-3">
                <div
                  className={`bg-${stat.color} bg-opacity-10 text-${stat.color} rounded-3 d-flex align-items-center justify-content-center shadow-sm`}
                  style={{ width: "52px", height: "52px", fontSize: "1.4rem", flexShrink: 0 }}
                >
                  <i className={`bi ${stat.icon}`}></i>
                </div>
                <div>
                  <div className="fw-bold fs-4 lh-1 text-dark">{stat.value}</div>
                  <div className="small fw-semibold text-dark mt-1">{stat.label}</div>
                  <div className="text-muted small" style={{ fontSize: "0.75rem" }}>
                    <i className="bi bi-cursor-fill text-primary me-1" style={{ fontSize: "0.65rem" }}></i>
                    {stat.note}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Bộ lọc */}
      <Card className="border-0 shadow-sm rounded-3 mb-4">
        <Card.Body className="py-3">
          <Row className="g-2 align-items-center">
            <Col xs={12} md={5}>
              <SearchBox
                value={search}
                onChange={setSearch}
                placeholder="Tìm theo tên bác sĩ, chuyên khoa, phòng khám..."
              />
            </Col>
            <Col xs={6} md={3}>
              <Form.Select value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)} className="rounded-3">
                <option value="All">Tất cả ca trực</option>
                <option value="Ca sáng">☀️ Ca sáng (07:30–11:30)</option>
                <option value="Ca chiều">🌙 Ca chiều (13:30–17:30)</option>
                <option value="Ca tối">⭐ Ca tối (17:30–21:00)</option>
                <option value="Nghỉ trực">🏖️ Nghỉ trực</option>
              </Form.Select>
            </Col>
            <Col xs={6} md={4}>
              <Form.Select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)} className="rounded-3">
                <option value="All">Tất cả các ngày trong tuần</option>
                {uniqueDays.map((d) => (
                  <option key={d.date} value={d.date}>
                    {d.dayName} — {d.date}{d.date === today ? " (Hôm nay)" : ""}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Bảng lịch trực nhóm theo ngày */}
      {orderedDays.length === 0 ? (
        <Card className="border-0 shadow-sm rounded-3">
          <Card.Body className="text-center py-5 text-muted">
            <i className="bi bi-calendar-x fs-1 d-block mb-2 text-secondary"></i>
            <p className="mb-0">Không có dữ liệu lịch trực phù hợp.</p>
          </Card.Body>
        </Card>
      ) : (
        orderedDays.map((date) => {
          const rows = rowsByDay[date];
          const isToday = date === today;
          const dayLabel = rows[0]?.dayName || date;

          return (
            <Card
              key={date}
              className={`border-0 shadow-sm rounded-3 mb-3 ${isToday ? "border-start border-4 border-primary" : ""}`}
            >
              <Card.Header
                className={`border-0 py-2 px-4 d-flex align-items-center gap-2 cursor-pointer ${isToday ? "bg-primary bg-opacity-10" : "bg-white"}`}
                style={{ cursor: "pointer" }}
                onClick={() =>
                  openQuickView(
                    "dutySchedule",
                    `Lịch Trực ${dayLabel} (${date})`,
                    `Chi tiết phân bổ ${rows.length} ca trực của các bác sĩ ngày ${date}`,
                    rows
                  )
                }
                title={`Nhấn để xem chi tiết lịch trực ${dayLabel}`}
              >
                <i className={`bi bi-calendar-event${isToday ? "-fill text-primary" : " text-muted"} fs-5`}></i>
                <span className={`fw-bold ${isToday ? "text-primary" : "text-dark"}`}>
                  {dayLabel} — {date}
                </span>
                {isToday && <Badge bg="primary" className="rounded-pill ms-1">Hôm nay</Badge>}
                <Badge bg="light" text="dark" className="border ms-auto">{rows.length} ca trực</Badge>
              </Card.Header>
              <Card.Body className="p-0">
                <Table responsive hover className="align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4">Bác sĩ</th>
                      <th>Chuyên khoa</th>
                      <th>Ca trực</th>
                      <th>Khung giờ</th>
                      <th>Phòng khám</th>
                      <th>Điều dưỡng hỗ trợ</th>
                      <th>Lịch hẹn</th>
                      <th className="pe-4">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => (
                      <tr key={`${r.doctorId}-${idx}`}>
                        <td className="ps-4">
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold"
                              style={{ width: "34px", height: "34px", fontSize: "0.85rem", flexShrink: 0 }}
                            >
                              {r.doctorName?.charAt(0) || "D"}
                            </div>
                            <span className="fw-semibold text-dark small">{r.doctorName}</span>
                          </div>
                        </td>
                        <td>
                          <Badge bg="light" text="dark" className="border">{translateSpecialty(r.specialization)}</Badge>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              r.shiftType === "Ca sáng"
                                ? "bg-warning bg-opacity-25 text-dark border border-warning"
                                : r.shiftType === "Ca chiều"
                                ? "bg-info bg-opacity-25 text-dark border border-info"
                                : r.shiftType === "Ca tối"
                                ? "bg-primary bg-opacity-25 text-primary border border-primary"
                                : "bg-secondary bg-opacity-25 text-secondary"
                            } px-2 py-1 fw-semibold`}
                          >
                            {r.shiftType === "Ca sáng"
                              ? "☀️ Ca sáng"
                              : r.shiftType === "Ca chiều"
                              ? "🌙 Ca chiều"
                              : r.shiftType === "Ca tối"
                              ? "⭐ Ca tối"
                              : "🏖️ Nghỉ trực"}
                          </span>
                        </td>
                        <td className="small fw-medium">{r.shiftHours}</td>
                        <td className="fw-semibold text-primary">{r.room}</td>
                        <td className="small text-muted">{r.nurse}</td>
                        <td>
                          {r.appointmentsCount > 0 ? (
                            <Badge
                              bg="primary"
                              className="rounded-pill px-2 py-1 shadow-sm cursor-pointer hover-shadow"
                              style={{ cursor: "pointer" }}
                              onClick={() =>
                                openQuickView(
                                  "appointments",
                                  `Lịch Hẹn Khám — ${r.doctorName} (${r.shiftType})`,
                                  `Danh sách ${r.appointmentsCount} bệnh nhân đặt lịch ngày ${r.date} (${r.shiftHours}) • Phòng: ${r.room}`,
                                  r.appointments || [],
                                  ROUTES.APPOINTMENTS
                                )
                              }
                              title="Nhấn để xem chi tiết danh sách bệnh nhân đã đặt lịch trong ca trực này"
                            >
                              <i className="bi bi-calendar-check me-1"></i>
                              {r.appointmentsCount} ca hẹn
                            </Badge>
                          ) : (
                            <span className="text-muted small">Chưa có</span>
                          )}
                        </td>
                        <td className="pe-4">
                          {(() => {
                            const s = getRealtimeShiftStatus(r, currentTime);
                            const isOff = s.key === "off";
                            return (
                              <Badge
                                bg={s.variant}
                                text={isOff ? "dark" : undefined}
                                className={`px-2 py-1${isOff ? " border" : ""}`}
                              >
                                <i className={`bi ${s.icon} me-1`}></i>
                                {s.label}
                              </Badge>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          );
        })
      )}
    </Container>

    {/* Modal Tạo Lịch trực */}
    <CreateDutyModal
      show={showCreateModal}
      onHide={() => setShowCreateModal(false)}
      onSaved={() => {
        setShowCreateModal(false);
        setScheduleVersion((v) => v + 1);
        doctorApi.getAll().then((docs) => setDoctors(docs || []));
      }}
    />

    {/* Pop-up Xem Nhanh Chi Tiết */}
    <QuickViewModal
      isOpen={quickViewModal.isOpen}
      onClose={closeQuickView}
      type={quickViewModal.type}
      title={quickViewModal.title}
      subtitle={quickViewModal.subtitle}
      data={quickViewModal.data}
      patients={patients}
      doctors={doctors}
      targetPage={quickViewModal.targetPage}
    />
  </>
  );
}

export default DutySchedule;

