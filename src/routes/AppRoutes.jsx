import { Navigate, Route, Routes } from "react-router-dom";
import { ROUTES } from "../config/routes";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../utils/auth";
import MainLayout from "../components/layout/MainLayout";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Doctors from "../pages/Doctors";
import Patients from "../pages/Patients";
import PatientDetail from "../pages/PatientDetail";
import PatientEdit from "../pages/PatientEdit";
import Appointments from "../pages/Appointments";
import MedicalRecords from "../pages/MedicalRecords";
import AccessDenied from "../pages/AccessDenied";
import NotFound from "../pages/NotFound";

/**
 * Route Guard Component: Bảo vệ route yêu cầu đăng nhập và phân quyền role bằng useAuth hook
 */
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, hasRole } = useAuth();

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (!hasRole(allowedRoles)) {
    return <Navigate to={ROUTES.ACCESS_DENIED} replace />;
  }

  return children;
}

/**
 * Toàn bộ cấu hình Route của MediTrack tập trung tại đây
 */
function AppRoutes() {
  return (
    <Routes>
      {/* Route Công khai: Đăng nhập & Báo lỗi quyền truy cập */}
      <Route path={ROUTES.LOGIN} element={<Login />} />
      <Route path={ROUTES.ACCESS_DENIED} element={<AccessDenied />} />

      {/* Route Yêu cầu Đăng nhập (bọc trong MainLayout) */}
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
        <Route path={ROUTES.DASHBOARD.replace(/^\//, "")} element={<Dashboard />} />

        {/* Quản lý Bác sĩ (Dành riêng cho Admin) */}
        <Route
          path={ROUTES.DOCTORS.replace(/^\//, "")}
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <Doctors />
            </ProtectedRoute>
          }
        />

        {/* Quản lý Bệnh nhân (Admin: Toàn viện, Doctor: Bệnh nhân của tôi) */}
        <Route
          path={ROUTES.PATIENTS.replace(/^\//, "")}
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR]}>
              <Patients />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.PATIENT_DETAIL().replace(/^\//, "")}
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR]}>
              <PatientDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.PATIENT_EDIT().replace(/^\//, "")}
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR]}>
              <PatientEdit />
            </ProtectedRoute>
          }
        />

        {/* Quản lý Lịch hẹn (Bác sĩ & Bệnh nhân — Admin không quản lý lịch hẹn) */}
        <Route
          path={ROUTES.APPOINTMENTS.replace(/^\//, "")}
          element={
            <ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.PATIENT]}>
              <Appointments />
            </ProtectedRoute>
          }
        />

        {/* Hồ sơ Y tế / Bệnh án */}
        <Route
          path={ROUTES.RECORDS.replace(/^\//, "")}
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT]}>
              <MedicalRecords />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Trang 404 Not Found */}
      <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
