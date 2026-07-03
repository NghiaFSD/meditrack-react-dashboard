import { NavLink, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { getMenuItemsForRole } from "../../data/menuItems";
import { clearCurrentUser, getCurrentUser, getRoleLabel } from "../../utils/auth";

// Sidebar chứa menu điều hướng chính.
function Sidebar() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const menuItems = getMenuItemsForRole(currentUser?.role);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Logout?",
      text: "Do you want to log out of MediTrack?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Logout",
    });

    if (result.isConfirmed) {
      clearCurrentUser();
      navigate("/login");
    }
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">M</div>
        <div>
          <h1>MediTrack</h1>
          <p>{getRoleLabel(currentUser?.role)} Dashboard</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <button className="logout-btn" onClick={handleLogout}>🚪 Logout</button>
    </aside>
  );
}

export default Sidebar;
