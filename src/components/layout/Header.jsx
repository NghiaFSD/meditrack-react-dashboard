// Header hiển thị thông tin user đang đăng nhập.
function Header() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser")) || {};

  return (
    <header className="top-header">
      <div>
        <h2>Welcome back, {currentUser.fullName || "Guest"}</h2>
        <p>Monitor patients, appointments and medical records.</p>
      </div>

      <div className="header-profile">
        <div className="notification">🔔</div>
        <div className="avatar">{currentUser.avatar || "U"}</div>
        <div>
          <strong>{currentUser.fullName || "Unknown"}</strong>
          <span>{currentUser.role || "USER"}</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
