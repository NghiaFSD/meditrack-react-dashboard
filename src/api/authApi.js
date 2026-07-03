import axiosClient from "./axiosClient";

// API đăng nhập demo.
// json-server hỗ trợ query dạng /users?email=...&password=...
export const authApi = {
  login(email) {
    return axiosClient.get(`/users`, {
      params: { email },
    });
  },
};
