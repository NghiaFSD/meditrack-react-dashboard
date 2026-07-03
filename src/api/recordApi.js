import axiosClient from "./axiosClient";

// Các API quản lý hồ sơ bệnh án.
export const recordApi = {
  getAll() {
    return axiosClient.get("/medicalRecords");
  },
  getById(id) {
    return axiosClient.get(`/medicalRecords/${id}`);
  },
  create(data) {
    return axiosClient.post("/medicalRecords", data);
  },
  update(id, data) {
    return axiosClient.put(`/medicalRecords/${id}`, data);
  },
  remove(id) {
    return axiosClient.delete(`/medicalRecords/${id}`);
  },
};
