/**
 * Cấu hình tập trung toàn bộ các URL đường dẫn (Routes) của ứng dụng MediTrack
 * Giúp quản lý navigation tập trung, dễ bảo trì và hạn chế lỗi sai chính tả
 */
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  ACCESS_DENIED: "/access-denied",
  DASHBOARD: "/dashboard",
  PATIENTS: "/patients",
  PATIENT_DETAIL: (id) => (id ? `/patients/${id}` : "/patients/:id"),
  PATIENT_EDIT: (id) => (id ? `/patients/${id}/edit` : "/patients/:id/edit"),
  APPOINTMENTS: "/appointments",
  RECORDS: "/records",
  NOT_FOUND: "*",
};

export default ROUTES;
