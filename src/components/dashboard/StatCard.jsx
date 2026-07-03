// Card thống kê trên Dashboard.
function StatCard({ title, value, icon, note }) {
  return (
    <article className="stat-card">
      <div>
        <p>{title}</p>
        <h3>{value}</h3>
        <span>{note}</span>
      </div>
      <div className="stat-icon">{icon}</div>
    </article>
  );
}

export default StatCard;
