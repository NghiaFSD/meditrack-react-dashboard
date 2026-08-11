// Helper tự động chuyển đổi dữ liệu mẫu trong DB (Lý do khám, Chẩn đoán, Bảo hiểm, Nguy cơ) sang Tiếng Việt.

const REASON_MAP = {
  "Diabetes follow up": "Tái khám tiểu đường",
  "Diabetes follow-up": "Tái khám tiểu đường",
  "General check-up": "Khám sức khỏe tổng quát",
  "Blood sugar review": "Kiểm tra chỉ số đường huyết",
  "Blood pressure monitoring": "Theo dõi huyết áp",
  check: "Khám định kỳ",
  No: "Khám theo hẹn",
};

const DIAGNOSIS_MAP = {
  "High blood sugar, diabetes follow up required": "Đường huyết cao, cần tái khám tiểu đường",
  "Prediabetes watch": "Theo dõi tiền tiểu đường",
  "Diabetes risk": "Nguy cơ mắc tiểu đường",
  "High blood pressure": "Huyết áp cao",
  Normal: "Sức khỏe bình thường",
};

const INSURANCE_MAP = {
  Basic: "Cơ bản",
  Standard: "Tiêu chuẩn",
  Premium: "Cao cấp",
};

const RISK_MAP = {
  Low: "Thấp",
  Medium: "Trung bình",
  High: "Cao",
};

export function translateReason(reason, lang) {
  if (lang !== "vi" || !reason) return reason;
  return REASON_MAP[reason] || reason;
}

export function translateDiagnosis(diagnosis, lang) {
  if (lang !== "vi" || !diagnosis) return diagnosis;
  return DIAGNOSIS_MAP[diagnosis] || diagnosis;
}

export function translateInsurance(insurance, lang) {
  if (lang !== "vi" || !insurance) return insurance;
  return INSURANCE_MAP[insurance] || insurance;
}

export function translateRiskLevel(risk, lang) {
  if (lang !== "vi" || !risk) return risk;
  return RISK_MAP[risk] || risk;
}
