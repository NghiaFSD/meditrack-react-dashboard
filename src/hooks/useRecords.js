import { useCallback, useEffect, useState } from "react";
import { recordApi } from "../api/recordApi";

// Custom hook quản lý việc load hồ sơ bệnh án.
export function useRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await recordApi.getAll();
      setRecords(data);
    } catch (err) {
      setError("Cannot load medical records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return { records, loading, error, fetchRecords };
}
