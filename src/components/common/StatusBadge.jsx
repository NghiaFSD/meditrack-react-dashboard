// Badge hiển thị trạng thái với màu khác nhau.
function StatusBadge({ status, type }) {
  const normalizedType = String(type || status)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return (
    <span className={`status-badge status-${normalizedType}`}>
      {status}
    </span>
  );
}

export default StatusBadge;
