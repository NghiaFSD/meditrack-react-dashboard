import { createContext, useContext, useState } from "react";
import { translations } from "../utils/translations";

const LanguageContext = createContext();

const STORAGE_KEY = "meditrack_lang";

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "vi";
  });

  const switchLanguage = (newLang) => {
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
  };

  const toggleLanguage = () => {
    switchLanguage(lang === "vi" ? "en" : "vi");
  };

  // Hàm dịch theo key dạng "patients.title" hoặc "nav.dashboard"
  const t = (keyPath, fallback = "") => {
    const keys = keyPath.split(".");
    let current = translations[lang];

    for (const key of keys) {
      if (current && current[key] !== undefined) {
        current = current[key];
      } else {
        // Fallback sang ngôn ngữ mặc định nếu thiếu key
        let fallbackCurrent = translations["en"];
        for (const fk of keys) {
          if (fallbackCurrent && fallbackCurrent[fk] !== undefined) {
            fallbackCurrent = fallbackCurrent[fk];
          } else {
            return fallback || keyPath;
          }
        }
        return fallbackCurrent;
      }
    }

    return typeof current === "string" ? current : fallback || keyPath;
  };

  return (
    <LanguageContext.Provider value={{ lang, switchLanguage, toggleLanguage, t }}>
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
