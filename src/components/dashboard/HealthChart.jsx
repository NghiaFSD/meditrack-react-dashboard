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

// Biểu đồ đường hiển thị glucose theo từng record.
function HealthChart({ data }) {
  const { t } = useLanguage();

  return (
    <div className="chart-card">
      <div className="section-title compact">
        <div>
          <h3>{t("dashboard.chartGlucoseTitle")}</h3>
          <p>{t("dashboard.chartGlucoseSub")}</p>
        </div>
      </div>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="glucose" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default HealthChart;
