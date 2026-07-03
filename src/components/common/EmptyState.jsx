// Component hiển thị khi không có dữ liệu.
function EmptyState({ title = "No data", message = "There is no information to display." }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">📭</div>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

export default EmptyState;
