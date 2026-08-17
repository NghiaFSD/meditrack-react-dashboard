import axios from "axios";
import { APP_CONFIG } from "../config/appConfig";

/**
 * Cấu hình Axios Client tập trung cho toàn bộ ứng dụng MediTrack
 * URL API được đọc từ config/appConfig.js
 */
const axiosClient = axios.create({
  baseURL: APP_CONFIG.apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor giúp tự động trích xuất response.data
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error("API Error:", error);
    return Promise.reject(error);
  }
);

export default axiosClient;
