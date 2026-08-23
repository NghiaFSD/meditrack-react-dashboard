import axiosClient from "./axiosClient";

/**
 * API Quản lý Bác sĩ (CRUD)
 */
export const doctorApi = {
  getAll() {
    return axiosClient.get("/doctors");
  },
  getById(id) {
    return axiosClient.get(`/doctors/${id}`);
  },
  create(payload) {
    return axiosClient.post("/doctors", payload);
  },
  update(id, payload) {
    return axiosClient.put(`/doctors/${id}`, payload);
  },
  remove(id) {
    return axiosClient.delete(`/doctors/${id}`);
  },
};

export default doctorApi;
