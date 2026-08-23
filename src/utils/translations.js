/**
 * Các hàm tiện ích chuyển đổi dữ liệu từ khóa y tế sang Tiếng Việt
 */

// Map lý do khám từ cơ sở dữ liệu sang Tiếng Việt
const REASON_MAP = {
  "Diabetes follow up": "Tái khám tiểu đường",
  "Diabetes follow-up": "Tái khám tiểu đường",
  "General check-up": "Khám sức khỏe tổng quát",
  "Blood sugar review": "Kiểm tra chỉ số đường huyết",
  "Blood pressure monitoring": "Theo dõi huyết áp",
  "Dietary consultation": "Tư vấn dinh dưỡng",
  "Routine health check": "Khám sức khỏe định kỳ",
};

// Map chẩn đoán y khoa sang Tiếng Việt
const DIAGNOSIS_MAP = {
  "High blood sugar, diabetes follow up required": "Đường huyết cao, cần tái khám",
  "High blood sugar, diabetes follow-up required": "Đường huyết cao, cần tái khám",
  "Prediabetes watch": "Theo dõi tiền tiểu đường",
  "Diabetes risk": "Nguy cơ mắc tiểu đường",
  "High blood pressure": "Huyết áp cao",
  Normal: "Bình thường",
};

export const translateReason = (reason) => REASON_MAP[reason] || reason || "-";
export const translateDiagnosis = (diagnosis) => DIAGNOSIS_MAP[diagnosis] || diagnosis || "-";
export const translateInsurance = (ins) => (ins === "Basic" ? "Cơ bản" : ins === "Premium" ? "Cao cấp" : "Tiêu chuẩn");
export const translateRiskLevel = (risk) => (risk === "High" ? "Cao" : risk === "Medium" ? "Trung bình" : "Thấp");
