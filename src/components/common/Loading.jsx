import React from "react";
import { Spinner } from "react-bootstrap";

/**
 * Component Loading sử dụng Spinner của React-Bootstrap
 */
function Loading({ text = "Loading..." }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 text-muted">
      <Spinner animation="border" variant="primary" role="status" className="mb-2" />
      <span className="fw-medium">{text}</span>
    </div>
  );
}

export default Loading;
