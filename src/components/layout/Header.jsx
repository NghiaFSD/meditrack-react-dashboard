import { getCurrentUser, getRoleLabel } from "../../utils/auth";

// Header hiển thị thông tin user đang đăng nhập.
function Header() {
  const currentUser = getCurrentUser() || {};
  const roleLabel = getRoleLabel(currentUser.role);

  return (
    <header className="top-header">
      <div>
        <h2>Welcome back, {currentUser.fullName || "Guest"}</h2>
        <p>{roleLabel === "Patient" ? "View your own appointments and records." : "Monitor patients, appointments and medical records."}</p>
      </div>

      <div className="header-profile">
        <div className="notification">🔔</div>
        <div className="avatar">{currentUser.avatar || "U"}</div>
        <div>
          <strong>{currentUser.fullName || "Unknown"}</strong>
          <span>{roleLabel}</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
