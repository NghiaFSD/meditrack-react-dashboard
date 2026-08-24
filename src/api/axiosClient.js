import axios from "axios";
import { APP_CONFIG } from "../config/appConfig";

/**
 * Axios Client kết nối trực tiếp đến json-server (port 9000)
 * File database: database.json
 * Tất cả thao tác GET/POST/PUT/DELETE đều gọi json-server thông qua HTTP.
 */
const axiosClient = axios.create({
  baseURL: APP_CONFIG.apiBaseUrl,
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor: tự động unwrap response.data
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Lỗi kết nối đến server. Hãy đảm bảo json-server đang chạy trên port 9000.";
    console.error("[API Error]", message);
    return Promise.reject(new Error(message));
  }
);

// Thêm method patch để hỗ trợ PATCH (cập nhật một phần)
axiosClient.patch = (url, data, config) =>
  axios.patch(APP_CONFIG.apiBaseUrl + url, data, { ...config, headers: { "Content-Type": "application/json" } })
    .then((res) => res.data)
    .catch((error) => {
      const message = error?.response?.data?.message || error?.message || "Lỗi PATCH request.";
      return Promise.reject(new Error(message));
    });

export { axiosClient };
export default axiosClient;
