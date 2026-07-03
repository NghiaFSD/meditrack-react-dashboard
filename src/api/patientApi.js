import axiosClient from "./axiosClient";

// Các hàm API liên quan đến bệnh nhân.
export const patientApi = {
  getAll() {
    return axiosClient.get("/patients");
  },
  getById(id) {
    return axiosClient.get(`/patients/${id}`);
  },
  create(data) {
    return axiosClient.post("/patients", data);
  },
  update(id, data) {
    return axiosClient.put(`/patients/${id}`, data);
  },
  remove(id) {
    return axiosClient.delete(`/patients/${id}`);
  },
};
