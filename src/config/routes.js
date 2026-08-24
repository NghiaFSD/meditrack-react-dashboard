/**
 * Cấu hình tập trung toàn bộ các URL đường dẫn (Routes) của ứng dụng MediTrack
 * Thiết kế theo chuẩn RESTful — resource-based + query params cho bộ lọc
 */
export const ROUTES = {
  HOME:          "/",
  LOGIN:         "/login",
  ACCESS_DENIED: "/access-denied",
  NOT_FOUND:     "*",

  // Dashboard
  DASHBOARD: "/dashboard",

  // Quản lý Bác sĩ (Admin)
  DOCTORS: "/doctors",

  // Lịch trực Bác sĩ (Admin)
  DUTY_SCHEDULE: "/duty-schedule",

  // Bệnh nhân
  PATIENTS:           "/patients",
  PATIENT_DETAIL:     (id) => (id ? `/patients/${id}`             : "/patients/:id"),
  PATIENT_EDIT:       (id) => (id ? `/patients/${id}/edit`        : "/patients/:id/edit"),
  // Nested resources của Bệnh nhân
  PATIENT_APPOINTMENTS: (id) => (id ? `/patients/${id}/appointments` : "/patients/:id/appointments"),
  PATIENT_RECORDS:      (id) => (id ? `/patients/${id}/records`      : "/patients/:id/records"),

  // Lịch hẹn khám
  APPOINTMENTS:     "/appointments",
  APPOINTMENT_NEW:  "/appointments/new",
  APPOINTMENT_DETAIL: (id) => (id ? `/appointments/${id}` : "/appointments/:id"),

  // Hồ sơ bệnh án
  RECORDS:        "/records",
  RECORD_NEW:     "/records/new",
  RECORD_DETAIL:  (id) => (id ? `/records/${id}` : "/records/:id"),
};

export default ROUTES;
