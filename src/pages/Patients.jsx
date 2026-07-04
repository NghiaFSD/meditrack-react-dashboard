import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import Button from "../components/common/Button";
import EmptyState from "../components/common/EmptyState";
import Input from "../components/common/Input";
import Loading from "../components/common/Loading";
import Modal from "../components/common/Modal";
import SearchBox from "../components/common/SearchBox";
import StatusBadge from "../components/common/StatusBadge";
import { appointmentApi } from "../api/appointmentApi";
import { patientApi } from "../api/patientApi";
import { recordApi } from "../api/recordApi";
import { usePatients } from "../hooks/usePatients";
import { ROLES, getCurrentUser } from "../utils/auth";
import { isValidEmail, isValidPhone } from "../utils/validation";

const emptyPatient = {
  patientCode: "",
  fullName: "",
  gender: "Male",
  age: "",
  phone: "",
  email: "",
  address: "",
  insuranceType: "Standard",
  riskLevel: "Low",
  lastVisit: "",
  status: "Active",
};

// Trang quản lý bệnh nhân: CRUD + search/filter.
function Patients() {
  const { patients, loading, error, fetchPatients } = usePatients();
  const currentUser = getCurrentUser();
  const currentRole = currentUser?.role;
  const canManagePatients = currentRole === ROLES.ADMIN;
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [form, setForm] = useState(emptyPatient);

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const keyword = search.toLowerCase();
      const matchSearch =
        patient.fullName.toLowerCase().includes(keyword) ||
        patient.email.toLowerCase().includes(keyword) ||
        patient.phone.includes(keyword);

      const matchGender = genderFilter === "All" || patient.gender === genderFilter;

      return matchSearch && matchGender;
    });
  }, [patients, search, genderFilter]);

  const openAddModal = () => {
    if (!canManagePatients) return;
    setEditingPatient(null);
    setForm(emptyPatient);
    setIsModalOpen(true);
  };

  const openEditModal = (patient) => {
    if (!canManagePatients) return;
    setEditingPatient(patient);
    setForm(patient);
    setIsModalOpen(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!form.fullName.trim()) return "Full name is required.";
    if (!isValidEmail(form.email)) return "Email is invalid.";
    if (!isValidPhone(form.phone)) return "Phone must contain 9-11 digits.";
    if (Number(form.age) <= 0) return "Age must be greater than 0.";

    const normalizedEmail = form.email.trim().toLowerCase();
    const normalizedPhone = form.phone.trim();
    const duplicatePatient = patients.find((patient) => {
      const sameEmail = patient.email.trim().toLowerCase() === normalizedEmail;
      const samePhone = patient.phone.trim() === normalizedPhone;
      const sameId = editingPatient && Number(patient.id) === Number(editingPatient.id);

      return !sameId && (sameEmail || samePhone);
    });

    if (duplicatePatient) {
      return "Email or phone already exists.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationMessage = validateForm();
    if (validationMessage) {
      Swal.fire("Invalid data", validationMessage, "warning");
      return;
    }

    const nextPatientNumber = patients.reduce((highest, patient) => {
      const numericId = Number(patient.id);
      return Number.isFinite(numericId) && numericId > highest ? numericId : highest;
    }, 0) + 1;
    const fallbackPatientCode = editingPatient
      ? (editingPatient.patientCode || `PT-${String(editingPatient.id).padStart(3, "0")}`)
      : `PT-${String(nextPatientNumber).padStart(3, "0")}`;

    const payload = {
      ...form,
      patientCode: form.patientCode?.trim() || fallbackPatientCode,
      age: Number(form.age),
    };

    try {
      if (editingPatient) {
        await patientApi.update(editingPatient.id, payload);
        Swal.fire("Updated", "Patient updated successfully.", "success");
      } else {
        await patientApi.create(payload);
        Swal.fire("Created", "Patient created successfully.", "success");
      }

      setIsModalOpen(false);
      fetchPatients();
    } catch (err) {
      Swal.fire("Error", "Cannot save patient.", "error");
    }
  };

  const handleDelete = async (patient) => {
    if (!canManagePatients) {
      Swal.fire("Forbidden", "Only admins can delete patients.", "warning");
      return;
    }

    const result = await Swal.fire({
      title: "Delete patient?",
      text: `This will remove ${patient.fullName}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#e11d48",
    });

    if (result.isConfirmed) {
      try {
        const [appointments, records] = await Promise.all([
          appointmentApi.getAll(),
          recordApi.getAll(),
        ]);

        const hasAppointments = appointments.some((item) => Number(item.patientId) === Number(patient.id));
        const hasRecords = records.some((item) => Number(item.patientId) === Number(patient.id));

        if (hasAppointments || hasRecords) {
          Swal.fire(
            "Cannot delete",
            "This patient still has related appointments or medical records.",
            "warning"
          );
          return;
        }

        await patientApi.remove(patient.id);
        Swal.fire("Deleted", "Patient deleted successfully.", "success");
        fetchPatients();
      } catch (err) {
        Swal.fire("Error", "Cannot delete patient.", "error");
      }
    }
  };

  if (loading) return <Loading text="Loading patients..." />;

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>Patients</h1>
          <p>{canManagePatients ? "Manage patient information and medical profiles." : "View patient information and medical profiles."}</p>
        </div>
        {canManagePatients && <Button onClick={openAddModal}>+ Add Patient</Button>}
      </div>

      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search by name, email or phone..." />
        <select value={genderFilter} onChange={(event) => setGenderFilter(event.target.value)}>
          <option value="All">All genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="table-card">
        {filteredPatients.length === 0 ? (
          <EmptyState title="No patients found" message="Try changing your search keyword or filter." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Code</th>
                <th>Full Name</th>
                <th>Gender</th>
                <th>Age</th>
                <th>Insurance</th>
                <th>Risk</th>
                <th>Last Visit</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient) => (
                <tr key={patient.id}>
                  <td>#{patient.id}</td>
                  <td>{patient.patientCode || `PT-${String(patient.id).padStart(3, "0")}`}</td>
                  <td>{patient.fullName}</td>
                  <td>{patient.gender}</td>
                  <td>{patient.age}</td>
                  <td>{patient.insuranceType || "Standard"}</td>
                  <td>{patient.riskLevel || "Low"}</td>
                  <td>{patient.lastVisit || "-"}</td>
                  <td>{patient.phone}</td>
                  <td>{patient.email}</td>
                  <td><StatusBadge status={patient.status} /></td>
                  <td>
                    <div className="action-group">
                      <Link className="link-btn" to={`/patients/${patient.id}`}>View</Link>
                      {canManagePatients && <button onClick={() => openEditModal(patient)}>Edit</button>}
                      {canManagePatients && <button className="danger" onClick={() => handleDelete(patient)}>Delete</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        title={editingPatient ? "Edit Patient" : "Add Patient"}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="form-grid">
          <Input label="Full Name" name="fullName" value={form.fullName} onChange={handleChange} required />
          <div className="form-group">
            <label>Gender</label>
            <select name="gender" value={form.gender} onChange={handleChange}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <Input label="Age" name="age" type="number" value={form.age} onChange={handleChange} required />
          <Input label="Phone" name="phone" value={form.phone} onChange={handleChange} required />
          <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
          <Input label="Address" name="address" value={form.address} onChange={handleChange} />
          <div className="form-group">
            <label>Status</label>
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Patients;
