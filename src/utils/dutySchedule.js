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
 * Tự động tính toán trạng thái: "Đã qua", "Đang trực" (Hôm nay), "Sắp tới", "Nghỉ ca"
 */
export function getDoctorWeeklySchedule(doctor, appointments = []) {
  const curr = new Date();
  const currentDayIndex = curr.getDay(); // 0 = CN, 1 = T2,...
  const mondayOffset = currentDayIndex === 0 ? -6 : 1 - currentDayIndex;

  const monday = new Date(curr);
  monday.setDate(curr.getDate() + mondayOffset);

  const todayStr = curr.toISOString().slice(0, 10);
  const docShift = doctor?.shift || "Morning";
  const docRoom = doctor?.room || "A-201";

  const schedule = [];

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    const dateStr = dayDate.toISOString().slice(0, 10);
    const dayName = DAY_NAMES[dayDate.getDay()];
    const isToday = dateStr === todayStr;
    const isPassed = dateStr < todayStr;
    const isFuture = dateStr > todayStr;

    // Xếp ca trực mẫu thực tế:
    // Thứ 2, 4, 6: Theo ca chính của Bác sĩ (Ca sáng / Ca chiều)
    // Thứ 3, 5: Ca ngược lại hoặc Khám chuyên sâu
    // Thứ 7: Ca sáng
    // Chủ Nhật: Nghỉ trực (hoặc Trực cấp cứu)
    let shiftType = "Off";
    let shiftHours = "Nghỉ trực";
    let isWorking = false;

    if (i === 0 || i === 2 || i === 4) {
      // Thứ 2, Thứ 4, Thứ 6
      shiftType = docShift === "Morning" ? "Ca sáng" : "Ca chiều";
      shiftHours = docShift === "Morning" ? "07:30 - 11:30" : "13:30 - 17:30";
      isWorking = true;
    } else if (i === 1 || i === 3) {
      // Thứ 3, Thứ 5
      shiftType = docShift === "Morning" ? "Ca chiều" : "Ca sáng";
      shiftHours = docShift === "Morning" ? "13:30 - 17:30" : "07:30 - 11:30";
      isWorking = true;
    } else if (i === 5) {
      // Thứ 7
      shiftType = "Ca sáng";
      shiftHours = "08:00 - 12:00";
      isWorking = true;
    } else {
      // Chủ Nhật
      shiftType = "Nghỉ trực";
      shiftHours = "Nghỉ cuối tuần";
      isWorking = false;
    }

    // Logic xác định trạng thái ca trực dựa trên thời gian thực tế
    let statusText = "Nghỉ ca";
    let statusVariant = "secondary";
    let statusKey = "off";

    if (!isWorking) {
      statusText = "Nghỉ ca";
      statusVariant = "secondary";
      statusKey = "off";
    } else if (isPassed) {
      statusText = "Đã qua";
      statusVariant = "secondary";
      statusKey = "passed";
    } else if (isToday) {
      statusText = "Đang trực";
      statusVariant = "success";
      statusKey = "today";
    } else {
      statusText = "Sắp tới";
      statusVariant = "primary";
      statusKey = "upcoming";
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
      isWorking,
      isPassed,
      isToday,
      isFuture,
      status: isWorking ? "active" : "off",
      statusKey,
      statusText,
      statusVariant,
      room: isWorking ? docRoom : "-",
      nurse: isWorking ? (i % 2 === 0 ? "ĐD. Nguyễn Thị Hoa" : "ĐD. Trần Thu Trang") : "-",
      appointmentsCount: dayAppts.length,
      appointments: dayAppts,
    });
  }

  return schedule;
}

/**
 * Parse chuỗi khung giờ "07:30 - 11:30" thành 2 đối tượng Date theo ngày cụ thể
 */
function parseShiftTimes(shiftHours, dateStr) {
  if (!shiftHours || shiftHours === "Nghỉ trực" || shiftHours === "Nghỉ cuối tuần") return null;
  const parts = shiftHours.split(" - ");
  if (parts.length !== 2) return null;
  const [startStr, endStr] = parts.map((s) => s.trim());
  const start = new Date(`${dateStr}T${startStr}:00`);
  const end = new Date(`${dateStr}T${endStr}:00`);
  if (isNaN(start) || isNaN(end)) return null;
  return { start, end };
}

/**
 * Xác định trạng thái ca trực theo thời gian thực (now = Date object hiện tại)
 * Trả về: { key, label, variant, icon }
 *
 * Logic:
 *  - Ngày đã qua (isPassed) → "Đã qua"
 *  - Hôm nay (isToday):
 *      + Trước giờ bắt đầu ca → "Sắp tới"
 *      + Trong khung giờ ca  → "Đang trực"
 *      + Sau giờ kết thúc ca → "Đã qua"
 *  - Ngày tương lai (isWorking) → "Sắp tới"
 *  - Không làm việc (isWorking=false) → "Nghỉ ca"
 */
export function getRealtimeShiftStatus(row, now = new Date()) {
  const { isPassed, isToday, isWorking, shiftHours, date } = row;

  if (!isWorking) {
    return { key: "off", label: "Nghỉ ca", variant: "light", icon: "bi-pause-circle" };
  }

  if (isPassed) {
    return { key: "passed", label: "Đã qua", variant: "secondary", icon: "bi-clock-history" };
  }

  if (isToday) {
    const times = parseShiftTimes(shiftHours, date);
    if (times) {
      if (now < times.start) {
        // Trước giờ bắt đầu ca
        const diffMin = Math.round((times.start - now) / 60000);
        const label = diffMin <= 60 ? `Sắp tới (${diffMin}p)` : "Sắp tới";
        return { key: "upcoming", label, variant: "primary", icon: "bi-calendar-check" };
      }
      if (now >= times.start && now <= times.end) {
        // Đang trong ca trực
        return { key: "active", label: "Đang trực", variant: "success", icon: "bi-broadcast" };
      }
      // Đã hết ca hôm nay
      return { key: "passed", label: "Đã qua", variant: "secondary", icon: "bi-clock-history" };
    }
    // Không parse được giờ → fallback "Đang trực" nếu là hôm nay
    return { key: "active", label: "Đang trực", variant: "success", icon: "bi-broadcast" };
  }

  // Ngày tương lai, có làm việc
  return { key: "upcoming", label: "Sắp tới", variant: "primary", icon: "bi-calendar-check" };
}
