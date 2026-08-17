import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { authApi } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { ROUTES } from "../config/routes";
import { APP_CONFIG } from "../config/appConfig";

/**
 * Trang đăng nhập demo với đa ngôn ngữ i18n và AuthContext
 */
function Login() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const { lang, toggleLanguage, t } = useLanguage();
  const [form, setForm] = useState({ email: "admin@gmail.com", password: "MediTrack#2026!" });
  const [loading, setLoading] = useState(false);

  // Nếu đã đăng nhập, tự động chuyển hướng vào Dashboard
  useEffect(() => {
    if (user) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [user, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      const users = await authApi.login(form.email);
      const matchedUser = users.find((item) => item.password === form.password);

      if (!matchedUser) {
        Swal.fire(
          lang === "vi" ? "Đăng nhập thất bại" : "Login failed",
          t("login.invalidCreds"),
          "error"
        );
        return;
      }

      // Đăng nhập qua AuthContext
      login(matchedUser);

      Swal.fire(
        lang === "vi" ? "Thành công" : "Success",
        lang === "vi" ? `Xin chào ${matchedUser.fullName}!` : `Welcome ${matchedUser.fullName}!`,
        "success"
      );
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      Swal.fire(
        lang === "vi" ? "Lỗi kết nối" : "Error",
        lang === "vi" ? "Không thể kết nối đến máy chủ API. Vui lòng chạy npm start." : "Cannot connect to API server. Please run npm start.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Gán nhanh tài khoản demo vào form
  const useDemoAccount = (email) => {
    setForm({ email, password: "MediTrack#2026!" });
  };

  return (
    <div className="login-page">
      <div style={{ position: "absolute", top: "1rem", right: "1.5rem" }}>
        <button
          onClick={toggleLanguage}
          className="lang-toggle-btn"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.5rem 1rem",
            borderRadius: "20px",
            border: "1px solid #cbd5e1",
            background: "white",
            fontWeight: "600",
            fontSize: "0.9rem",
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
          }}
        >
          <span>🌐</span>
          <span>{lang === "vi" ? "🇻🇳 Tiếng Việt" : "🇬🇧 English"}</span>
        </button>
      </div>

      <div className="login-card">
        <div className="login-brand">
          <div className="brand-logo large">M</div>
          <h1>{APP_CONFIG.appName}</h1>
          <p>{t("login.subtitle")}</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <label>{t("login.lblEmail")}</label>
          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="admin@gmail.com"
          />

          <label>{t("login.lblPassword")}</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="MediTrack#2026!"
          />

          <button className="btn btn-primary full" disabled={loading}>
            {loading ? (lang === "vi" ? "Đang đăng nhập..." : "Logging in...") : t("login.btnSignIn")}
          </button>
        </form>

        <div className="demo-box">
          <p>{t("login.demoAccounts")}</p>
          <button onClick={() => useDemoAccount("admin@gmail.com")}>{t("login.roleAdmin")}</button>
          <button onClick={() => useDemoAccount("doctor@gmail.com")}>{t("login.roleDoctor")}</button>
          <button onClick={() => useDemoAccount("patient@gmail.com")}>{t("login.rolePatient")}</button>
        </div>
      </div>
    </div>
  );
}

export default Login;
