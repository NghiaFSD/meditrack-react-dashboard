import { ROLES } from "../utils/auth";
import { ROUTES } from "../config/routes";

/**
 * Danh sách menu cho Sidebar phân quyền theo User Role
 */
export const menuItems = [
  {
    path: ROUTES.DASHBOARD,
    label: "Dashboard",
    icon: "📊",
    allowedRoles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT],
  },
  {
    path: ROUTES.PATIENTS,
    label: "Patients",
    icon: "🧑‍⚕️",
    allowedRoles: [ROLES.ADMIN, ROLES.DOCTOR],
  },
  {
    path: ROUTES.APPOINTMENTS,
    label: "Appointments",
    icon: "📅",
    allowedRoles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT],
  },
  {
    path: ROUTES.RECORDS,
    label: "Medical Records",
    icon: "📋",
    allowedRoles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT],
  },
];

export function getMenuItemsForRole(role) {
  return menuItems.filter((item) => item.allowedRoles.includes(role));
}
