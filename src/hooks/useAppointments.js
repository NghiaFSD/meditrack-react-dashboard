import { useCallback, useEffect, useState } from "react";
import { appointmentApi } from "../api/appointmentApi";

// Custom hook quản lý việc load lịch hẹn.
export function useAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await appointmentApi.getAll();
      setAppointments(data);
    } catch (err) {
      setError("Cannot load appointments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return { appointments, loading, error, fetchAppointments };
}
