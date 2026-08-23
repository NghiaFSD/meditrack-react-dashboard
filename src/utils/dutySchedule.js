/**
 * Tiện ích tạo và quản lý Lịch trực tuần cho Bác sĩ (Doctor Weekly Duty Schedule)
 */

// Danh sách các thứ trong tuần
const DAY_NAMES = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

/**
 * Tạo danh sách lịch trực 7 ngày trong tuần hiện tại cho bác sĩ
 */
export function getDoctorWeeklySchedule(doctor, appointments = []) {
  const curr = new Date();
  const currentDayIndex = curr.getDay(); // 0 = CN, 1 = T2,...
  const mondayOffset = currentDayIndex === 0 ? -6 : 1 - currentDayIndex;

  const monday = new Date(curr);
  monday.setDate(curr.getDate() + mondayOffset);

  const docShift = doctor?.shift || "Morning";
  const docRoom = doctor?.room || "A-201";

  const schedule = [];

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    const dateStr = dayDate.toISOString().slice(0, 10);
    const dayName = DAY_NAMES[dayDate.getDay()];
    const isToday = dateStr === curr.toISOString().slice(0, 10);

    // Xếp ca trực mẫu thực tế:
    // Thứ 2, 4, 6: Theo ca chính của Bác sĩ (Ca sáng / Ca chiều)
    // Thứ 3, 5: Ca ngược lại hoặc Khám chuyên sâu
    // Thứ 7: Ca sáng
    // Chủ Nhật: Nghỉ trực (hoặc Trực cấp cứu)
    let shiftType = "Off";
    let shiftHours = "Nghỉ trực";
    let status = "off";

    if (i === 0 || i === 2 || i === 4) {
      // Thứ 2, Thứ 4, Thứ 6
      shiftType = docShift === "Morning" ? "Ca sáng" : "Ca chiều";
      shiftHours = docShift === "Morning" ? "07:30 - 11:30" : "13:30 - 17:30";
      status = "active";
    } else if (i === 1 || i === 3) {
      // Thứ 3, Thứ 5
      shiftType = docShift === "Morning" ? "Ca chiều" : "Ca sáng";
      shiftHours = docShift === "Morning" ? "13:30 - 17:30" : "07:30 - 11:30";
      status = "active";
    } else if (i === 5) {
      // Thứ 7
      shiftType = "Ca sáng";
      shiftHours = "08:00 - 12:00";
      status = "active";
    } else {
      // Chủ Nhật
      shiftType = "Nghỉ trực";
      shiftHours = "Nghỉ cuối tuần";
      status = "off";
    }

    // Đếm số lượng bệnh nhân đã có lịch hẹn trong ngày này
    const dayAppts = appointments.filter(
      (a) => a.date === dateStr && Number(a.doctorId) === Number(doctor?.id)
    );

    schedule.push({
      dayIndex: i,
      dayName,
      date: dateStr,
      displayDate: `${dayDate.getDate()}/${dayDate.getMonth() + 1}`,
      shiftType,
      shiftHours,
      status,
      room: status === "active" ? docRoom : "-",
      nurse: status === "active" ? (i % 2 === 0 ? "ĐD. Nguyễn Thị Hoa" : "ĐD. Trần Thu Trang") : "-",
      isToday,
      appointmentsCount: dayAppts.length,
      appointments: dayAppts,
    });
  }

  return schedule;
}
