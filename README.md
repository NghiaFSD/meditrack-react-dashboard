# MediTrack – React Medical Record & Appointment Dashboard

Hệ thống quản lý hồ sơ bệnh án và lịch khám bệnh đa phân quyền (Admin, Bác sĩ, Bệnh nhân) xây dựng bằng React, Vite, React Router và Axios (kết hợp REST API json-server).

---

## 🚀 Tính năng chính (Key Features)

- **Phân quyền người dùng (Role-based Access Control):** Admin, Bác sĩ (Doctor), Bệnh nhân (Patient).
- **Dashboard thông minh:** Biểu đồ xu hướng chỉ số sức khỏe (Glucose, HbA1c, BMI, Huyết áp) với Recharts và thống kê theo thời gian thực.
- **Quản lý Bệnh nhân (Patients):** Đầy đủ các thao tác CRUD, tìm kiếm và lọc theo giới tính.
- **Quản lý Lịch hẹn (Appointments):** Duyệt lịch khám, hoàn thành, hủy lịch hẹn.
- **Quản lý Bệnh án (Medical Records):** Theo dõi tiền sử bệnh, chỉ số sinh học và cảnh báo sức khỏe bất thường.
- **Đa ngôn ngữ (i18n):** Hỗ trợ chuyển đổi mượt mà giữa Tiếng Việt và Tiếng Anh.
- **Cấu hình tập trung (Centralized Config):** Quản lý toàn bộ Routes và API URL tại thư mục `src/config/`.

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

- **Frontend:** React 19, Vite, React-Bootstrap, Bootstrap 5, Bootstrap Icons, React Router DOM, Recharts, SweetAlert2.
- **API & State:** Axios, React Context API, Custom Hooks.
- **Backend Mock:** json-server (`db.json`).

---

## 👥 Tài khoản Demo (Demo Accounts)

| Vai trò (Role) | Email | Mật khẩu (Password) |
| :--- | :--- | :--- |
| **Admin** | `admin@gmail.com` | `MediTrack#2026!` |
| **Doctor** | `doctor@gmail.com` | `MediTrack#2026!` |
| **Patient** | `patient@gmail.com` | `MediTrack#2026!` |

---

## ⚡ Hướng dẫn cài đặt & khởi chạy (Quick Start)

### 1. Cài đặt thư viện:
```bash
npm install
```

### 2. Khởi chạy toàn bộ (API + React App):
```bash
npm start
```

*Hoặc chạy riêng từng terminal:*
```bash
# Terminal 1: Chạy Fake API Server (Port 9999)
npm run server

# Terminal 2: Chạy React Vite Dev Server (Port 5173)
npm run dev
```

- **Địa chỉ React App:** [http://localhost:5173](http://localhost:5173)
- **Địa chỉ API Server:** [http://localhost:9999](http://localhost:9999)

---

## 📂 Cấu trúc thư mục (Project Architecture)

```text
src/
├── api/             # Tầng gọi API qua Axios (axiosClient, patientApi,...)
├── components/      # UI components (common, dashboard, layout)
├── config/          # Cấu hình tập trung Routes & App Settings
├── context/         # LanguageContext (đa ngôn ngữ Việt/Anh)
├── data/            # Menu items & cấu hình tĩnh
├── hooks/           # Custom hooks tải dữ liệu (usePatients, useAppointments,...)
├── pages/           # Các trang chính (Dashboard, Patients, PatientDetail,...)
├── routes/          # AppRoutes & ProtectedRoute phân quyền
├── utils/           # Auth helpers, validation, formatters, translations
├── App.jsx          # Root App Component
├── main.jsx         # Entry point bọc Router & Providers
└── index.css        # Toàn bộ CSS styling
```
