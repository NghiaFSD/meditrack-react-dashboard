import React from "react";
import { Card } from "react-bootstrap";

/**
 * Card thống kê trên Dashboard sử dụng React-Bootstrap Card có hỗ trợ Click xem nhanh (Quick-View)
 */
function StatCard({ title, value, icon, note, onClick, className = "" }) {
  const isClickable = typeof onClick === "function";

  return (
    <Card
      className={`h-100 border-0 shadow-sm rounded-3 transition-all ${
        isClickable ? "stat-card-clickable cursor-pointer" : ""
      } ${className}`}
      onClick={onClick}
      style={{ cursor: isClickable ? "pointer" : "default" }}
      title={isClickable ? "Nhấn để xem nhanh danh sách chi tiết" : ""}
    >
      <Card.Body className="d-flex align-items-center justify-content-between p-3 position-relative">
        <div>
          <Card.Subtitle
            className="text-muted mb-1 small fw-medium text-uppercase d-flex align-items-center gap-1"
            style={{ letterSpacing: "0.5px" }}
          >
            <span>{title}</span>
            {isClickable && <i className="bi bi-arrows-angle-expand text-primary opacity-50" style={{ fontSize: "0.75rem" }}></i>}
          </Card.Subtitle>
          <Card.Title as="h3" className="fw-bold mb-1 text-dark">
            {value}
          </Card.Title>
          {note && <Card.Text className="text-muted small mb-0">{note}</Card.Text>}
        </div>
        <div
          className="d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary rounded-circle shadow-sm"
          style={{ width: "48px", height: "48px", fontSize: "1.4rem" }}
        >
          {icon}
        </div>
      </Card.Body>
    </Card>
  );
}

export default StatCard;
