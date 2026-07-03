import axiosClient from "./axiosClient";

// API đăng nhập demo.
// json-server hỗ trợ query dạng /users?email=...&password=...
export const authApi = {
  login(email, password) {
    return axiosClient.get(`/users?email=${email}&password=${password}`);
  },
};
