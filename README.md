# MediTrack – React Medical Record & Appointment Dashboard

MediTrack is a responsive healthcare dashboard built with React. The project is designed for a CV/portfolio and demonstrates routing, CRUD, REST API calls, form handling, search/filter, chart visualization and simple role-based UI.

## Main Features

- Role-based login UI for Admin, Doctor and Patient
- Dashboard with statistics cards and charts
- Patient CRUD: create, view, update, delete, search and filter
- Appointment management: create, edit, update status and delete
- Medical record tracking: glucose, HbA1c, BMI and blood pressure
- Health warning logic for abnormal medical values
- Responsive layout for desktop and mobile
- Fake REST API using json-server

## Tech Stack

- React
- Vite
- React Router
- Axios
- json-server
- Recharts
- SweetAlert2
- CSS

## Demo Accounts

```txt
Admin:   admin@gmail.com / 123456
Doctor:  doctor@gmail.com / 123456
Patient: patient@gmail.com / 123456
```

## How to Run

Install dependencies:

```bash
npm install
```

Run fake API server:

```bash
npm run server
```

Open another terminal and run React app:

```bash
npm run dev
```

Or run both at once:

```bash
npm start
```

Default URLs:

```txt
React app: http://localhost:5173
API server: http://localhost:9999
```

## Suggested CV Description

```txt
MediTrack – React Medical Record & Appointment Dashboard
Developed a responsive healthcare dashboard using React, Vite, React Router, Axios and REST API simulation with json-server. Implemented patient management, appointment scheduling, medical record tracking, search/filter, role-based UI, chart visualization and health warning logic for abnormal medical values.
```

## Project Structure

```txt
src/
├── api/              API service files using Axios
├── components/       Reusable UI components
├── hooks/            Custom hooks for data loading
├── pages/            Main pages
├── routes/           App route configuration
├── utils/            Helper functions
├── App.jsx
├── main.jsx
└── index.css
```

## Notes

This project uses `json-server` for demo purpose. In a real project, you can replace it with a Java Spring Boot, Node.js, ASP.NET or Firebase backend.
