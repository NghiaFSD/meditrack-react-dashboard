import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { authApi } from "../api/authApi";

// Trang đăng nhập demo.
// Tài khoản được lấy từ db.json thông qua json-server.
function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "admin@gmail.com", password: "123456" });
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      const users = await authApi.login(form.email, form.password);

      if (!users.length) {
        Swal.fire("Login failed", "Email or password is incorrect.", "error");
        return;
      }

      const user = users[0];
      localStorage.setItem("currentUser", JSON.stringify(user));
      Swal.fire("Success", `Welcome ${user.fullName}!`, "success");
      navigate("/dashboard");
    } catch (err) {
      Swal.fire("Error", "Cannot connect to API server. Please run npm run server.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Gán nhanh tài khoản demo vào form.
  const useDemoAccount = (email) => {
    setForm({ email, password: "123456" });
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-logo large">M</div>
          <h1>MediTrack</h1>
          <p>React Medical Dashboard for CV Portfolio</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <label>Email</label>
          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="admin@gmail.com"
          />

          <label>Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="123456"
          />

          <button className="btn btn-primary full" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="demo-box">
          <p>Demo accounts</p>
          <button onClick={() => useDemoAccount("admin@gmail.com")}>Admin</button>
          <button onClick={() => useDemoAccount("doctor@gmail.com")}>Doctor</button>
          <button onClick={() => useDemoAccount("patient@gmail.com")}>Patient</button>
        </div>
      </div>
    </div>
  );
}

export default Login;
