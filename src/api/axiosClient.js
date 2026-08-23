import axios from "axios";
import { APP_CONFIG } from "../config/appConfig";
import { storageAdapter } from "./storageAdapter";

/**
 * Cấu hình Axios Client kết hợp Fallback Storage thông minh
 * - Khi chạy Local có json-server (port 9999): Gửi request trực tiếp đến json-server.
 * - Khi chạy Online (Vercel/GitHub Pages) hoặc khi chưa bật json-server: Tự động chuyển tiếp mượt mà sang Local Storage có sẵn toàn bộ dữ liệu mẫu.
 */
const rawAxios = axios.create({
  baseURL: APP_CONFIG.apiBaseUrl,
  timeout: 3000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor trích xuất response.data
rawAxios.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);

// Wrapper hỗ trợ fallback sang localStorage khi mất kết nối đến json-server
export const axiosClient = {
  async get(url, config) {
    try {
      // Nếu đang chạy trên web online (không phải localhost), ưu tiên dùng storageAdapter để tránh lỗi Mixed-Content / CORS
      if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        return await storageAdapter.get(url, config);
      }
      return await rawAxios.get(url, config);
    } catch (err) {
      console.warn(`[API Fallback] Chuyển hướng sang Storage Adapter cho GET ${url}`);
      return await storageAdapter.get(url, config);
    }
  },

  async post(url, data, config) {
    try {
      if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        return await storageAdapter.post(url, data);
      }
      return await rawAxios.post(url, data, config);
    } catch (err) {
      console.warn(`[API Fallback] Chuyển hướng sang Storage Adapter cho POST ${url}`);
      return await storageAdapter.post(url, data);
    }
  },

  async put(url, data, config) {
    try {
      if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        return await storageAdapter.put(url, data);
      }
      return await rawAxios.put(url, data, config);
    } catch (err) {
      console.warn(`[API Fallback] Chuyển hướng sang Storage Adapter cho PUT ${url}`);
      return await storageAdapter.put(url, data);
    }
  },

  async delete(url, config) {
    try {
      if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        return await storageAdapter.delete(url);
      }
      return await rawAxios.delete(url, config);
    } catch (err) {
      console.warn(`[API Fallback] Chuyển hướng sang Storage Adapter cho DELETE ${url}`);
      return await storageAdapter.delete(url);
    }
  },
};

export default axiosClient;
