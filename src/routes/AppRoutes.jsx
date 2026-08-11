import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Patients from "../pages/Patients";
import PatientDetail from "../pages/PatientDetail";
import PatientEdit from "../pages/PatientEdit";
import Appointments from "../pages/Appointments";
import MedicalRecords from "../pages/MedicalRecords";
import AccessDenied from "../pages/AccessDenied";
import NotFound from "../pages/NotFound";
import { ROLES, getCurrentUser, hasRole } from "../utils/auth";

// Chặn người chưa đăng nhập vào dashboard.
function ProtectedRoute({ children, allowedRoles = [] }) {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(currentUser.role, allowedRoles)) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
}

// Tất cả route của ứng dụng được đặt tại đây.
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/access-denied" element={<AccessDenied />} />

      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT]}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
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
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR]}>
              <PatientEdit />
            </ProtectedRoute>
          }
        />
        <Route
          path="appointments"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT]}>
              <Appointments />
            </ProtectedRoute>
          }
        />
        <Route
          path="records"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT]}>
              <MedicalRecords />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
