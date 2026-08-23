import React, { useEffect, useMemo, useState } from "react";
import { Container } from "react-bootstrap";
import Swal from "sweetalert2";
import { patientApi } from "../api/patientApi";
import { doctorApi } from "../api/doctorApi";
import { appointmentApi } from "../api/appointmentApi";
import { recordApi } from "../api/recordApi";
import Loading from "../components/common/Loading";
import AdminDashboard from "../components/dashboard/AdminDashboard";
import DoctorDashboard from "../components/dashboard/DoctorDashboard";
import PatientDashboard from "../components/dashboard/PatientDashboard";
import { ROLES, findLinkedDoctor, findLinkedPatient } from "../utils/auth";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

/**
 * Trang Dashboard thông minh phân tách 3 giao diện nghiệp vụ chuyên sâu:
 * 1. Admin: Trung tâm điều hành phòng khám toàn diện
 * 2. Doctor: Bàn làm việc Bác sĩ Lâm sàng & Xử lý hàng đợi
 * 3. Patient: Cổng theo dõi sức khỏe cá nhân & Nhắc lịch
 */
function Dashboard() {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const currentRole = user?.role;

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [p, d, a, r] = await Promise.all([
        patientApi.getAll(),
        doctorApi.getAll(),
        appointmentApi.getAll(),
        recordApi.getAll(),
      ]);
      setPatients(p || []);
      setDoctors(d || []);
      setAppointments(a || []);
      setRecords(r || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const linkedPatient = useMemo(() => findLinkedPatient(patients, user), [patients, user]);
  const linkedDoctor = useMemo(() => findLinkedDoctor(doctors, user), [doctors, user]);

  // Cập nhật trạng thái lịch hẹn từ Dashboard
  const handleUpdateAppointmentStatus = async (item, newStatus) => {
    const confirmText =
      newStatus === "Approved"
        ? lang === "vi"
          ? `Duyệt lịch hẹn cho ${item.patientId}?`
          : "Approve this appointment?"
        : newStatus === "Completed"
        ? lang === "vi"
          ? "Đánh dấu hoàn thành ca khám?"
          : "Complete this consultation?"
        : lang === "vi"
        ? "Cập nhật trạng thái lịch hẹn?"
        : "Update appointment status?";

    const res = await Swal.fire({
      title: confirmText,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: lang === "vi" ? "Đồng ý" : "Confirm",
      cancelButtonText: lang === "vi" ? "Hủy" : "Cancel",
    });

    if (res.isConfirmed) {
      try {
        await appointmentApi.update(item.id, { ...item, status: newStatus });
        Swal.fire(
          lang === "vi" ? "Thành công" : "Success",
          lang === "vi" ? "Trạng thái đã được cập nhật." : "Status updated successfully.",
          "success"
        );
        loadData();
      } catch (err) {
        Swal.fire(lang === "vi" ? "Lỗi" : "Error", "Không thể cập nhật trạng thái.", "error");
      }
    }
  };

  if (loading) return <Loading text={t("common.loading")} />;

  return (
    <Container fluid className="px-0">
      {/* Phân nhánh Dashboard theo đúng Role */}
      {currentRole === ROLES.DOCTOR ? (
        <DoctorDashboard
          doctor={linkedDoctor || doctors[0]}
          patients={patients}
          appointments={appointments}
          records={records}
          onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
        />
      ) : currentRole === ROLES.PATIENT ? (
        <PatientDashboard
          patient={linkedPatient || patients[0]}
          doctors={doctors}
          appointments={appointments}
          records={records}
        />
      ) : (
        <AdminDashboard
          patients={patients}
          doctors={doctors}
          appointments={appointments}
          records={records}
          onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
        />
      )}
    </Container>
  );
}

export default Dashboard;
