import { createContext, useContext } from "react";
import { translations } from "../utils/translations";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const lang = "vi";

  // Hàm lấy chuỗi dịch tiếng Việt theo key dạng "patients.title" hoặc "nav.dashboard"
  const t = (keyPath, fallback = "") => {
    const keys = keyPath.split(".");
    let current = translations.vi;

    for (const key of keys) {
      if (current && current[key] !== undefined) {
        current = current[key];
      } else {
        return fallback || keyPath;
      }
    }

    return typeof current === "string" ? current : fallback || keyPath;
  };

  return (
    <LanguageContext.Provider value={{ lang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
