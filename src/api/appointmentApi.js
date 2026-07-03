import axiosClient from "./axiosClient";

// Các API quản lý lịch hẹn.
export const appointmentApi = {
  getAll() {
    return axiosClient.get("/appointments");
  },
  getById(id) {
    return axiosClient.get(`/appointments/${id}`);
  },
  create(data) {
    return axiosClient.post("/appointments", data);
  },
  update(id, data) {
    return axiosClient.put(`/appointments/${id}`, data);
  },
  patchStatus(id, status) {
    return axiosClient.patch(`/appointments/${id}`, { status });
  },
  remove(id) {
    return axiosClient.delete(`/appointments/${id}`);
  },
};
