import React from "react";
import { Link } from "react-router-dom";
import { Container, Card } from "react-bootstrap";
import Button from "../components/common/Button";
import { ROUTES } from "../config/routes";

/**
 * Trang 403 Access Denied khi người dùng không đủ quyền truy cập sử dụng React-Bootstrap
 */
function AccessDenied() {
  return (
    <Container className="min-vh-100 d-flex align-items-center justify-content-center py-5">
      <Card className="text-center border-0 shadow-lg p-4 p-md-5 rounded-4" style={{ maxWidth: "500px" }}>
        <Card.Body>
          <div className="text-danger mb-3" style={{ fontSize: "4rem" }}>
            <i className="bi bi-shield-x"></i>
          </div>
          <h1 className="display-4 fw-bold text-danger mb-2">403</h1>
          <p className="text-muted mb-4">Bạn không có quyền truy cập vào trang này.</p>
          <Link to={ROUTES.DASHBOARD}>
            <Button variant="primary" size="lg" className="px-4 shadow-sm">
              <i className="bi bi-house-door-fill me-2"></i>
              Trở về Bảng điều khiển
            </Button>
          </Link>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default AccessDenied;
