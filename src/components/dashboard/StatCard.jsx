import React from "react";
import { Card } from "react-bootstrap";

/**
 * Card thống kê trên Dashboard sử dụng React-Bootstrap Card
 */
function StatCard({ title, value, icon, note }) {
  return (
    <Card className="h-100 border-0 shadow-sm rounded-3">
      <Card.Body className="d-flex align-items-center justify-content-between p-3">
        <div>
          <Card.Subtitle className="text-muted mb-1 small fw-medium text-uppercase" style={{ letterSpacing: "0.5px" }}>
            {title}
          </Card.Subtitle>
          <Card.Title as="h3" className="fw-bold mb-1 text-dark">
            {value}
          </Card.Title>
          {note && <Card.Text className="text-muted small mb-0">{note}</Card.Text>}
        </div>
        <div
          className="d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary rounded-circle"
          style={{ width: "48px", height: "48px", fontSize: "1.4rem" }}
        >
          {icon}
        </div>
      </Card.Body>
    </Card>
  );
}

export default StatCard;
