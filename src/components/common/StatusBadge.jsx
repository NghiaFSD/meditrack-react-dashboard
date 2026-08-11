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
};

// Badge hiển thị trạng thái với màu sắc và ngôn ngữ linh hoạt.
function StatusBadge({ status, type }) {
  const { lang } = useLanguage();
  const normalizedType = String(type || status)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const displayStatus = lang === "vi" && STATUS_MAP_VI[status] ? STATUS_MAP_VI[status] : status;

  return (
    <span className={`status-badge status-${normalizedType}`}>
      {displayStatus}
    </span>
  );
}

export default StatusBadge;
