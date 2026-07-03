export const ROLES = {
  ADMIN: "ADMIN",
  DOCTOR: "DOCTOR",
  PATIENT: "PATIENT",
};

export function getCurrentUser() {
  try {
    const rawUser = localStorage.getItem("currentUser");
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    return null;
  }
}

export function clearCurrentUser() {
  localStorage.removeItem("currentUser");
}

export function hasRole(role, allowedRoles = []) {
  if (!allowedRoles.length) return true;
  return allowedRoles.includes(role);
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export function findLinkedPatient(patients = [], user = getCurrentUser()) {
  if (!user) return null;

  return (
    patients.find((patient) => normalize(patient.fullName) === normalize(user.fullName)) ||
    patients.find((patient) => normalize(patient.email) === normalize(user.email)) ||
    null
  );
}

export function findLinkedDoctor(doctors = [], user = getCurrentUser()) {
  if (!user) return null;

  return (
    doctors.find((doctor) => normalize(doctor.fullName) === normalize(user.fullName)) ||
    doctors.find((doctor) => normalize(doctor.email) === normalize(user.email)) ||
    null
  );
}

export function getRoleLabel(role) {
  const labels = {
    [ROLES.ADMIN]: "Admin",
    [ROLES.DOCTOR]: "Doctor",
    [ROLES.PATIENT]: "Patient",
  };

  return labels[role] || "User";
}
