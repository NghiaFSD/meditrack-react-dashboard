import { ROLES } from "../utils/auth";

// Danh sách menu cho sidebar theo quyền.
export const menuItems = [
  { path: "/dashboard", label: "Dashboard", icon: "📊", allowedRoles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT] },
  { path: "/patients", label: "Patients", icon: "🧑‍⚕️", allowedRoles: [ROLES.ADMIN, ROLES.DOCTOR] },
  { path: "/appointments", label: "Appointments", icon: "📅", allowedRoles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT] },
  { path: "/records", label: "Medical Records", icon: "📋", allowedRoles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT] },
];

export function getMenuItemsForRole(role) {
  return menuItems.filter((item) => item.allowedRoles.includes(role));
}
