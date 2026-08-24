import { Navigate, Route, Routes } from "react-router-dom";
import { ROUTES } from "../config/routes";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../utils/auth";
import MainLayout from "../components/layout/MainLayout";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Doctors from "../pages/Doctors";
import DutySchedule from "../pages/DutySchedule";
import Patients from "../pages/Patients";
import PatientDetail from "../pages/PatientDetail";
import PatientEdit from "../pages/PatientEdit";
import Appointments from "../pages/Appointments";
import MedicalRecords from "../pages/MedicalRecords";
import AccessDenied from "../pages/AccessDenied";
import NotFound from "../pages/NotFound";

/**
 * Route Guard: bảo vệ route theo đăng nhập và phân quyền role
 */
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, hasRole } = useAuth();
  if (!user) return <Navigate to={ROUTES.LOGIN} replace />;
  if (!hasRole(allowedRoles)) return <Navigate to={ROUTES.ACCESS_DENIED} replace />;
  return children;
}

/**
 * Toàn bộ cấu hình Route RESTful của MediTrack tập trung tại đây
 *
 * Cấu trúc URL theo nghiệp vụ:
 *   /dashboard                          → Bảng điều khiển
 *   /doctors                            → Quản lý bác sĩ (Admin)
 *   /duty-schedule                      → Lịch trực (Admin)
 *   /patients                           → Danh sách bệnh nhân
 *   /patients/:id                       → Chi tiết bệnh nhân
 *   /patients/:id/edit                  → Chỉnh sửa bệnh nhân
 *   /patients/:id/appointments          → Lịch hẹn của bệnh nhân đó
 *   /patients/:id/records               → Hồ sơ bệnh án của bệnh nhân đó
 *   /appointments                       → Tất cả lịch hẹn (filter bằng query params)
 *   /appointments?status=Pending        → Lọc lịch hẹn theo trạng thái
 *   /records                            → Tất cả hồ sơ bệnh án (filter bằng query params)
 *   /records?patientId=3                → Lọc hồ sơ theo bệnh nhân
 */
function AppRoutes() {
  return (
    <Routes>
      {/* Route Công khai */}
      <Route path={ROUTES.LOGIN} element={<Login />} />
      <Route path={ROUTES.ACCESS_DENIED} element={<AccessDenied />} />

      {/* Route Yêu cầu Đăng nhập — bọc trong MainLayout */}
      <Route
        path={ROUTES.HOME}
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT]}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to={ROUTES.DASHBOARD} replace />} />

        {/* Dashboard */}
        <Route path="dashboard" element={<Dashboard />} />

        {/* Quản lý Bác sĩ (Admin only) */}
        <Route
          path="doctors"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <Doctors />
            </ProtectedRoute>
          }
        />

        {/* Lịch trực Bác sĩ (Admin only) */}
        <Route
          path="duty-schedule"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <DutySchedule />
            </ProtectedRoute>
          }
        />

        {/* =============================================
            Bệnh nhân — Nested RESTful routes
            /patients                   Danh sách
            /patients/:id               Chi tiết
            /patients/:id/edit          Chỉnh sửa
            /patients/:id/appointments  Lịch hẹn của BN này
            /patients/:id/records       Hồ sơ bệnh án của BN này
        ============================================= */}
        <Route
          path="patients"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR]}>
              <Patients />
            </ProtectedRoute>
          }
        />
        <Route
          path="patients/:id"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR]}>
              <PatientDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="patients/:id/edit"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <PatientEdit />
            </ProtectedRoute>
          }
        />
        {/* Nested: Lịch hẹn của 1 bệnh nhân cụ thể */}
        <Route
          path="patients/:id/appointments"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR]}>
              <Appointments />
            </ProtectedRoute>
          }
        />
        {/* Nested: Hồ sơ bệnh án của 1 bệnh nhân cụ thể */}
        <Route
          path="patients/:id/records"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR]}>
              <MedicalRecords />
            </ProtectedRoute>
          }
        />

        {/* =============================================
            Lịch hẹn khám (Admin, Doctor, Patient)
            /appointments               Danh sách — filter bằng query params
            /appointments?status=...    Lọc theo trạng thái
            /appointments?doctorId=...  Lọc theo bác sĩ
        ============================================= */}
        <Route
          path="appointments"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT]}>
              <Appointments />
            </ProtectedRoute>
          }
        />

        {/* =============================================
            Hồ sơ bệnh án
            /records                    Danh sách — filter bằng query params
            /records?patientId=...      Lọc theo bệnh nhân
        ============================================= */}
        <Route
          path="records"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT]}>
              <MedicalRecords />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* 404 Not Found */}
      <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
