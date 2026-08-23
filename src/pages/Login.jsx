import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Form, Button } from "react-bootstrap";
import Swal from "sweetalert2";
import { authApi } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../config/routes";
import { APP_CONFIG } from "../config/appConfig";

/**
 * Trang đăng nhập hệ thống MediTrack (Thuần Tiếng Việt)
 */
function Login() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [form, setForm] = useState({ email: "admin@gmail.com", password: "MediTrack#2026!" });
  const [loading, setLoading] = useState(false);

  // Nếu đã đăng nhập, tự động chuyển hướng vào Dashboard
  useEffect(() => {
    if (user) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [user, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      const users = await authApi.login(form.email);
      const matchedUser = users.find((item) => item.password === form.password);

      if (!matchedUser) {
        Swal.fire(
          "Đăng nhập thất bại",
          "Email hoặc mật khẩu không chính xác!",
          "error"
        );
        return;
      }

      // Đăng nhập qua AuthContext
      login(matchedUser);

      Swal.fire(
        "Thành công",
        `Xin chào ${matchedUser.fullName}!`,
        "success"
      );
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      Swal.fire(
        "Lỗi kết nối",
        "Không thể kết nối đến máy chủ API. Vui lòng chạy npm start.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Gán nhanh tài khoản demo vào form
  const useDemoAccount = (email) => {
    setForm({ email, password: "MediTrack#2026!" });
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light position-relative p-3">
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={8} lg={5}>
            <Card className="border-0 shadow-lg rounded-4 overflow-hidden">
              <Card.Header className="bg-primary text-white text-center py-4 border-0">
                <div
                  className="bg-white text-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-2 shadow"
                  style={{ width: "56px", height: "56px", fontSize: "1.8rem" }}
                >
                  <i className="bi bi-heart-pulse-fill"></i>
                </div>
                <h3 className="fw-bold mb-1">{APP_CONFIG.appName}</h3>
                <p className="mb-0 text-white-50 small">Hệ thống quản lý hồ sơ bệnh án và lịch khám bệnh</p>
              </Card.Header>

              <Card.Body className="p-4 p-md-5">
                <Form onSubmit={handleLogin}>
                  <Form.Group className="mb-3" controlId="loginEmail">
                    <Form.Label className="fw-semibold small">Email</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="admin@gmail.com"
                      required
                      className="py-2"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4" controlId="loginPassword">
                    <Form.Label className="fw-semibold small">Mật khẩu</Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="MediTrack#2026!"
                      required
                      className="py-2"
                    />
                  </Form.Group>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                    className="w-100 py-2 fw-bold rounded-3 shadow-sm"
                  >
                    {loading ? (
                      <span className="d-flex align-items-center justify-content-center gap-2">
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        <span>Đang đăng nhập...</span>
                      </span>
                    ) : (
                      "Đăng nhập"
                    )}
                  </Button>
                </Form>

                {/* Hộp chọn nhanh tài khoản demo */}
                <div className="mt-4 pt-3 border-top text-center">
                  <p className="text-muted small fw-medium mb-2">Tài khoản dùng thử:</p>
                  <div className="d-flex flex-wrap gap-2 justify-content-center">
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="rounded-pill px-3"
                      onClick={() => useDemoAccount("admin@gmail.com")}
                    >
                      <i className="bi bi-shield-lock me-1"></i>
                      Admin
                    </Button>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="rounded-pill px-3"
                      onClick={() => useDemoAccount("doctor@gmail.com")}
                    >
                      <i className="bi bi-person-badge me-1"></i>
                      Bác sĩ
                    </Button>
                    <Button
                      variant="outline-success"
                      size="sm"
                      className="rounded-pill px-3"
                      onClick={() => useDemoAccount("patient@gmail.com")}
                    >
                      <i className="bi bi-person me-1"></i>
                      Bệnh nhân
                    </Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default Login;
