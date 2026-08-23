import React from "react";
import { Badge } from "react-bootstrap";
import { useLanguage } from "../../context/LanguageContext";

const STATUS_MAP_VI = {
  Pending: "Chờ duyệt",
  Approved: "Đã duyệt",
  Completed: "Hoàn thành",
  Cancelled: "Đã hủy",
  Active: "Đang theo dõi",
  Inactive: "Tạm ngưng",
  High: "Cao",
  Medium: "Trung bình",
  Low: "Thấp",
  Normal: "Bình thường",
  Warning: "Cảnh báo",
  Elevated: "Hơi cao",
  "Stage 1": "Giai đoạn 1",
  "Stage 2": "Giai đoạn 2",
  "Hypertensive Crisis": "Cần cấp cứu",
  "Diabetes Risk": "Nguy cơ Tiểu đường",
  Prediabetes: "Tiền tiểu đường",
  Obese: "Béo phì",
  Overweight: "Thừa cân",
  Underweight: "Thiếu cân",
  Basic: "Cơ bản",
  Standard: "Tiêu chuẩn",
  Premium: "Cao cấp",
  Clinic: "Phòng khám",
  Online: "Trực tuyến",
  "Walk-in": "Vãng lai",
};

const VARIANT_MAP = {
  // Trạng thái chung
  Active: "success",
  Approved: "primary",
  Completed: "success",
  Pending: "warning",
  Cancelled: "secondary",
  Inactive: "secondary",

  // Mức độ rủi ro & huyết áp & đường huyết
  Low: "success",
  Normal: "success",
  Medium: "warning",
  Elevated: "warning",
  High: "danger",
  "Stage 1": "warning",
  "Stage 2": "danger",
  "Hypertensive Crisis": "danger",
  "Diabetes Risk": "danger",
  Prediabetes: "warning",
  Obese: "danger",
  Overweight: "warning",
  Underweight: "info",

  // Gói bảo hiểm
  Basic: "secondary",
  Standard: "info",
  Premium: "primary",

  // Kênh khám
  Clinic: "primary",
  Online: "info",
  "Walk-in": "secondary",
};

/**
 * Component Badge hiển thị trạng thái sử dụng React-Bootstrap Badge
 */
function StatusBadge({ status, type, className = "" }) {
  const { lang } = useLanguage();
  const key = type || status || "";
  const bgVariant = VARIANT_MAP[key] || "secondary";
  const displayStatus = lang === "vi" && STATUS_MAP_VI[status] ? STATUS_MAP_VI[status] : status;

  return (
    <Badge
      bg={bgVariant}
      className={`px-2 py-1 fw-medium text-capitalize ${className}`}
      style={{ fontSize: "0.75rem", letterSpacing: "0.3px" }}
    >
      {displayStatus}
    </Badge>
  );
}

export default StatusBadge;
