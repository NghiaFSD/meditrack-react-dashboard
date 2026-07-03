// Validate email đơn giản cho form.
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validate số điện thoại đơn giản.
export function isValidPhone(phone) {
  return /^[0-9]{9,11}$/.test(phone);
}

// Chuyển chuỗi rỗng thành giá trị mặc định.
export function emptyToDefault(value, defaultValue = "N/A") {
  return value?.trim() ? value.trim() : defaultValue;
}
