import { initialData } from "../data/initialData";

const STORAGE_PREFIX = "meditrack_db_v7_";

/**
 * Khởi tạo dữ liệu vào localStorage nếu chưa có
 */
function initStorage() {
  if (typeof window === "undefined") return;

  const collections = ["users", "patients", "doctors", "appointments", "medicalRecords"];
  for (const col of collections) {
    const key = STORAGE_PREFIX + col;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(initialData[col] || []));
    }
  }
}

// Khởi chạy ngay khi nạp module
initStorage();

/**
 * Hàm khôi phục lại toàn bộ dữ liệu mẫu ban đầu (Dùng cho Demo / Reset)
 */
export function resetStorage() {
  if (typeof window === "undefined") return;

  const collections = ["users", "patients", "doctors", "appointments", "medicalRecords"];
  for (const col of collections) {
    const key = STORAGE_PREFIX + col;
    localStorage.setItem(key, JSON.stringify(initialData[col] || []));
  }
}

function getCollectionKey(endpoint) {
  const clean = endpoint.replace(/^\//, "").split("/")[0].split("?")[0];
  if (clean === "records" || clean === "medicalRecords") return STORAGE_PREFIX + "medicalRecords";
  if (clean === "patients") return STORAGE_PREFIX + "patients";
  if (clean === "doctors") return STORAGE_PREFIX + "doctors";
  if (clean === "appointments") return STORAGE_PREFIX + "appointments";
  if (clean === "users") return STORAGE_PREFIX + "users";
  return STORAGE_PREFIX + clean;
}

function readData(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error("Storage error:", err);
  }
}

export const storageAdapter = {
  get(url, config = {}) {
    const key = getCollectionKey(url);
    const list = readData(key);
    const parts = url.replace(/^\//, "").split("/");

    // Ví dụ /patients/1
    if (parts.length > 1 && parts[1]) {
      const id = parts[1].split("?")[0];
      const item = list.find((i) => String(i.id) === String(id));
      if (!item) return Promise.reject(new Error("Not found"));
      return Promise.resolve(item);
    }

    // Query params ví dụ /users?email=...
    if (config.params) {
      let filtered = [...list];
      for (const [k, v] of Object.entries(config.params)) {
        filtered = filtered.filter((i) => String(i[k]).toLowerCase() === String(v).toLowerCase());
      }
      return Promise.resolve(filtered);
    }

    return Promise.resolve(list);
  },

  post(url, payload) {
    const key = getCollectionKey(url);
    const list = readData(key);
    const nextId =
      list.reduce((max, item) => {
        const num = Number(item.id);
        return Number.isFinite(num) && num > max ? num : max;
      }, 0) + 1;

    const newItem = {
      ...payload,
      id: String(payload.id || nextId),
    };

    list.push(newItem);
    writeData(key, list);
    return Promise.resolve(newItem);
  },

  put(url, payload) {
    const key = getCollectionKey(url);
    const list = readData(key);
    const parts = url.replace(/^\//, "").split("/");
    const id = parts[1] || payload.id;

    const index = list.findIndex((i) => String(i.id) === String(id));
    if (index === -1) {
      list.push(payload);
    } else {
      list[index] = { ...list[index], ...payload, id: String(id) };
    }

    writeData(key, list);
    return Promise.resolve(list[index] || payload);
  },

  delete(url) {
    const key = getCollectionKey(url);
    const list = readData(key);
    const parts = url.replace(/^\//, "").split("/");
    const id = parts[1];

    const updated = list.filter((i) => String(i.id) !== String(id));
    writeData(key, updated);
    return Promise.resolve({ success: true, id });
  },
};
