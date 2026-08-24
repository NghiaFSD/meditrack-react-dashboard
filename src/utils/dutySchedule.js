/**
 * Tiện ích tạo và quản lý Lịch trực tuần cho Bác sĩ (Doctor Weekly Duty Schedule)
 */

/**
 * Lấy chuỗi ngày theo múi giờ địa phương (local time) dạng "YYYY-MM-DD"
 * Tránh lỗi lệch ngày khi dùng toISOString() (trả UTC, khác local ở 0h-7h giờ VN)
 */
export function getLocalDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const CUSTOM_DUTY_STORAGE_KEY = "meditrack_custom_duty_schedules";

/**
 * Lấy danh sách phân ca trực theo ngày tùy chỉnh đã lưu trong localStorage
 */
export function getCustomDutySchedules() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_DUTY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Lưu hoặc cập nhật phân ca trực cho một bác sĩ vào một ngày cụ thể
 */
export function saveCustomDutySchedule({ date, doctorId, shiftType, shiftHours, room, nurse }) {
  if (typeof window === "undefined") return;
  try {
    const list = getCustomDutySchedules();
    const docIdStr = String(doctorId);

    if (shiftType === "Nghỉ trực" || shiftType === "Off") {
      // Xóa tất cả các ca làm việc của bác sĩ trong ngày này và thay bằng Nghỉ trực
      const filtered = list.filter(
        (item) => !(item.date === date && String(item.doctorId) === docIdStr)
      );
      filtered.push({
        date,
        doctorId: docIdStr,
        shiftType: "Nghỉ trực",
        shiftHours: "Nghỉ ca",
        room: "-",
        nurse: "-",
        updatedAt: new Date().toISOString(),
      });
      localStorage.setItem(CUSTOM_DUTY_STORAGE_KEY, JSON.stringify(filtered));
      return;
    }

    // Nếu là ca làm việc:
    // 1. Xóa bản ghi "Nghỉ trực" (nếu có)
    let filtered = list.filter(
      (item) => !(item.date === date && String(item.doctorId) === docIdStr && (item.shiftType === "Nghỉ trực" || item.shiftType === "Off"))
    );

    // 2. Kiểm tra xem đã có bản ghi cùng date + doctorId + shiftType chưa
    const existingIndex = filtered.findIndex(
      (item) => item.date === date && String(item.doctorId) === docIdStr && item.shiftType === shiftType
    );

    const record = {
      date,
      doctorId: docIdStr,
      shiftType,
      shiftHours,
      room,
      nurse,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      filtered[existingIndex] = record;
    } else {
      filtered.push(record);
    }

    localStorage.setItem(CUSTOM_DUTY_STORAGE_KEY, JSON.stringify(filtered));
    return record;
  } catch (err) {
    console.error("Lỗi khi lưu lịch trực tùy chỉnh:", err);
    throw err;
  }
}

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
 * Ưu tiên các ca phân bổ tùy chỉnh theo ngày (custom), nếu không có thì dùng ca mặc định
 */
export function getDoctorWeeklySchedule(doctor, appointments = []) {
  const curr = new Date();
  const currentDayIndex = curr.getDay();
  const mondayOffset = currentDayIndex === 0 ? -6 : 1 - currentDayIndex;

  const monday = new Date(curr);
  monday.setDate(curr.getDate() + mondayOffset);

  // Dùng local date (getFullYear/Month/Date) thay vì toISOString() — tránh lệch ngày 0h-7h VN
  const todayStr = getLocalDateStr(curr);
  const docShift = doctor?.shift || "Morning";
  const docRoom = doctor?.room || "A-201";

  // Lấy các ca tùy chỉnh đã lưu cho bác sĩ này
  const customList = getCustomDutySchedules();
  const docIdStr = String(doctor?.id);

  const schedule = [];

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    // Dùng local date cho từng ngày trong tuần
    const dateStr = getLocalDateStr(dayDate);
    const dayName = DAY_NAMES[dayDate.getDay()];
    const isToday = dateStr === todayStr;
    const isPassed = dateStr < todayStr;
    const isFuture = dateStr > todayStr;

    // 1. Kiểm tra nếu có ca phân bổ tùy chỉnh riêng cho ngày này
    const dayCustoms = customList.filter(
      (c) => c.date === dateStr && String(c.doctorId) === docIdStr
    );

    let shiftType = "Off";
    let shiftHours = "Nghỉ trực";
    let isWorking = false;
    let room = "-";
    let nurse = "-";
    let shifts = [];

    const workingCustoms = dayCustoms.filter(
      (c) => c.shiftType !== "Nghỉ trực" && c.shiftType !== "Off"
    );

    if (workingCustoms.length > 0) {
      isWorking = true;
      shifts = workingCustoms.map((c) => ({
        shiftType: c.shiftType,
        shiftHours: c.shiftHours,
        room: c.room || docRoom,
        nurse: c.nurse || "ĐD. Nguyễn Thị Hoa",
      }));

      if (workingCustoms.length === 1) {
        shiftType = workingCustoms[0].shiftType;
        shiftHours = workingCustoms[0].shiftHours;
        room = workingCustoms[0].room || docRoom;
        nurse = workingCustoms[0].nurse || "ĐD. Nguyễn Thị Hoa";
      } else {
        shiftType = "2 ca (" + workingCustoms.map((c) => c.shiftType.replace("Ca ", "")).join(" & ") + ")";
        shiftHours = workingCustoms.map((c) => `${c.shiftType}: ${c.shiftHours}`).join(" | ");
        room = workingCustoms.map((c) => `${c.shiftType}: ${c.room || docRoom}`).join(", ");
        nurse = workingCustoms.map((c) => `${c.shiftType}: ${c.nurse || "ĐD"}`).join(", ");
      }
    } else if (dayCustoms.length > 0) {
      // Có custom nhưng là Nghỉ trực
      shiftType = "Nghỉ trực";
      shiftHours = "Nghỉ ca";
      isWorking = false;
    } else {
      // Xếp ca trực mẫu thực tế:
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
      room = isWorking ? docRoom : "-";
      nurse = isWorking ? (i % 2 === 0 ? "ĐD. Nguyễn Thị Hoa" : "ĐD. Trần Thu Trang") : "-";
      if (isWorking) {
        shifts = [{ shiftType, shiftHours, room, nurse }];
      }
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
      shifts,
      hasMultipleShifts: shifts.length > 1,
      isWorking,
      isPassed,
      isToday,
      isFuture,
      status: isWorking ? "active" : "off",
      statusKey,
      statusText,
      statusVariant,
      room,
      nurse,
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
