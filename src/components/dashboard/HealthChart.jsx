import React from "react";
import { Card } from "react-bootstrap";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useLanguage } from "../../context/LanguageContext";

/**
 * Biểu đồ đường hiển thị chỉ số Glucose sử dụng React-Bootstrap Card & Recharts
 */
function HealthChart({ data }) {
  const { t } = useLanguage();

  return (
    <Card className="border-0 shadow-sm rounded-3 mb-4">
      <Card.Header className="bg-white border-0 pt-3 pb-0">
        <Card.Title as="h5" className="fw-bold mb-1">
          {t("dashboard.chartGlucoseTitle")}
        </Card.Title>
        <Card.Subtitle className="text-muted small">
          {t("dashboard.chartGlucoseSub")}
        </Card.Subtitle>
      </Card.Header>
      <Card.Body>
        <div style={{ width: "100%", height: "280px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                }}
              />
              <Line
                type="monotone"
                dataKey="glucose"
                stroke="#0d6efd"
                strokeWidth={3}
                dot={{ r: 4, fill: "#0d6efd" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card.Body>
    </Card>
  );
}

export default HealthChart;
