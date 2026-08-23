import React from "react";
import { Card } from "react-bootstrap";

/**
 * Component hiển thị trạng thái dữ liệu trống sử dụng React-Bootstrap Card
 */
function EmptyState({ title = "No data", message = "No data found.", icon = "bi-inbox" }) {
  return (
    <Card className="text-center border-dashed py-5 my-3 bg-light border-0 shadow-sm">
      <Card.Body>
        <div className="text-muted mb-3" style={{ fontSize: "2.5rem" }}>
          <i className={`bi ${icon}`}></i>
        </div>
        <Card.Title as="h5" className="fw-bold text-secondary">{title}</Card.Title>
        <Card.Text className="text-muted small">{message}</Card.Text>
      </Card.Body>
    </Card>
  );
}

export default EmptyState;
