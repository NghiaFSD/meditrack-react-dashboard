// Format ngày theo kiểu dễ đọc.
export function formatDate(dateString) {
  if (!dateString) return "N/A";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}
