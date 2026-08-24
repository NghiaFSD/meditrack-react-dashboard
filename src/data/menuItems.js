import { ROLES } from "../utils/auth";
import { ROUTES } from "../config/routes";

/**
 * Danh sách menu cho Sidebar phân quyền theo User Role (Thuần Tiếng Việt)
 */
export const menuItems = [
  {
    path: ROUTES.DASHBOARD,
    label: "Bảng điều khiển",
    icon: "bi-speedometer2",
    allowedRoles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT],
  },
  {
    path: ROUTES.DOCTORS,
    label: "Quản lý Bác sĩ",
    icon: "bi-person-badge-fill",
    allowedRoles: [ROLES.ADMIN],
  },
  {
    path: ROUTES.DUTY_SCHEDULE,
    label: "Lịch trực Bác sĩ",
    icon: "bi-calendar-week-fill",
    allowedRoles: [ROLES.ADMIN],
  },
  {
    path: ROUTES.PATIENTS,
    label: "Bệnh nhân",
    doctorLabel: "Bệnh nhân của tôi",
    icon: "bi-people-fill",
    allowedRoles: [ROLES.ADMIN, ROLES.DOCTOR],
  },
  {
    path: ROUTES.APPOINTMENTS,
    label: "Lịch hẹn khám",
    icon: "bi-calendar2-check-fill",
    allowedRoles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT],
  },
  {
    path: ROUTES.RECORDS,
    label: "Hồ sơ bệnh án",
    icon: "bi-file-earmark-medical-fill",
    allowedRoles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT],
  },
];

export function getMenuItemsForRole(role) {
  return menuItems
    .filter((item) => item.allowedRoles.includes(role))
    .map((item) => ({
      ...item,
      label: role === ROLES.DOCTOR && item.doctorLabel ? item.doctorLabel : item.label,
    }));
}
