import axiosClient from "./axiosClient";

// API danh sách bác sĩ.
export const doctorApi = {
  getAll() {
    return axiosClient.get("/doctors");
  },
  getById(id) {
    return axiosClient.get(`/doctors/${id}`);
  },
};
