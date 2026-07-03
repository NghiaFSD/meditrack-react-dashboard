import axios from "axios";

// File này gom cấu hình Axios dùng chung cho toàn bộ project.
// Khi đổi backend thật, chỉ cần đổi baseURL ở đây.
const axiosClient = axios.create({
  baseURL: "http://localhost:9999",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor giúp lấy trực tiếp response.data thay vì response.data ở mọi nơi.
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error("API Error:", error);
    return Promise.reject(error);
  }
);

export default axiosClient;
