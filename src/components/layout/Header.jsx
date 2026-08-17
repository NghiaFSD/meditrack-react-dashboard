import { getRoleLabel } from "../../utils/auth";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

/**
 * Header hiển thị thông tin user đang đăng nhập và nút chuyển đổi ngôn ngữ
 */
function Header() {
  const { user } = useAuth();
  const currentUser = user || {};
  const roleLabel = getRoleLabel(currentUser.role);
  const { lang, toggleLanguage, t } = useLanguage();

  return (
    <header className="top-header">
      <div>
        <h2>
          {lang === "vi" ? `Chào mừng trở lại, ${currentUser.fullName || "Khách"}` : `Welcome back, ${currentUser.fullName || "Guest"}`}
        </h2>
        <p>
          {currentUser.role === "PATIENT"
            ? t("dashboard.descPatient")
            : currentUser.role === "DOCTOR"
              ? t("dashboard.descDoctor")
              : t("dashboard.descAdmin")}
        </p>
      </div>

      <div className="header-profile" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <button
          onClick={toggleLanguage}
          className="lang-toggle-btn"
          title="Chuyển đổi ngôn ngữ / Switch language"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            padding: "0.4rem 0.8rem",
            borderRadius: "20px",
            border: "1px solid #cbd5e1",
            background: "white",
            fontWeight: "600",
            fontSize: "0.85rem",
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          <span>🌐</span>
          <span>{lang === "vi" ? "🇻🇳 VI" : "🇬🇧 EN"}</span>
        </button>
        <div className="notification">🔔</div>
        <div className="avatar">{currentUser.avatar || "U"}</div>
        <div>
          <strong>{currentUser.fullName || "Unknown"}</strong>
          <span>{lang === "vi" ? (currentUser.role === "ADMIN" ? "Quản trị viên" : currentUser.role === "DOCTOR" ? "Bác sĩ" : "Bệnh nhân") : roleLabel}</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
