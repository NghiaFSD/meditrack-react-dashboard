import { Link } from "react-router-dom";

// Trang 404 khi người dùng nhập route không tồn tại.
function NotFound() {
  return (
    <div className="not-found">
      <h1>404</h1>
      <p>Page not found.</p>
      <Link className="btn btn-primary" to="/dashboard">Back to Dashboard</Link>
    </div>
  );
}

export default NotFound;
