import { useCallback, useEffect, useState } from "react";
import { patientApi } from "../api/patientApi";

// Custom hook gom logic lấy danh sách bệnh nhân.
// Dùng hook giúp page Patients gọn hơn.
export function usePatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await patientApi.getAll();
      setPatients(data);
    } catch (err) {
      setError("Cannot load patients.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  return { patients, loading, error, fetchPatients };
}
