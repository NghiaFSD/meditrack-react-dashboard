import React from "react";
import { Link } from "react-router-dom";
import { Container, Card } from "react-bootstrap";
import Button from "../components/common/Button";
import { useLanguage } from "../context/LanguageContext";
import { ROUTES } from "../config/routes";

/**
 * Trang 404 Not Found khi người dùng truy cập route không tồn tại sử dụng React-Bootstrap
 */
function NotFound() {
  const { t } = useLanguage();

  return (
    <Container className="min-vh-100 d-flex align-items-center justify-content-center py-5">
      <Card className="text-center border-0 shadow-lg p-4 p-md-5 rounded-4" style={{ maxWidth: "500px" }}>
        <Card.Body>
          <div className="text-primary mb-3" style={{ fontSize: "4rem" }}>
            <i className="bi bi-compass"></i>
          </div>
          <h1 className="display-4 fw-bold text-dark mb-2">404</h1>
          <p className="text-muted mb-4">{t("common.pageNotFoundMsg")}</p>
          <Link to={ROUTES.DASHBOARD}>
            <Button variant="primary" size="lg" className="px-4 shadow-sm">
              <i className="bi bi-house-door-fill me-2"></i>
              {t("common.goDashboard")}
            </Button>
          </Link>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default NotFound;
