# Hướng dẫn chạy project MediTrack

## 1. Mở project bằng VS Code

Giải nén file ZIP, sau đó mở thư mục `meditrack-react-dashboard` bằng VS Code.

## 2. Cài thư viện

Mở Terminal trong VS Code và chạy:

```bash
npm install
```

## 3. Chạy API giả lập

Mở terminal thứ nhất:

```bash
npm run server
```

API sẽ chạy tại:

```txt
http://localhost:9999
```

## 4. Chạy React

Mở terminal thứ hai:

```bash
npm run dev
```

React sẽ chạy tại:

```txt
http://localhost:5173
```

## 5. Đăng nhập demo

```txt
Admin:   admin@gmail.com / 123456
Doctor:  doctor@gmail.com / 123456
Patient: patient@gmail.com / 123456
```

## 6. Nếu bị lỗi port

Nếu `9999` bị trùng, đổi port trong file `package.json`:

```json
"server": "json-server --watch db.json --port 9999"
```

Ví dụ đổi thành:

```json
"server": "json-server --watch db.json --port 3001"
```

Sau đó sửa file:

```txt
src/api/axiosClient.js
```

Đổi:

```js
baseURL: "http://localhost:9999"
```

thành:

```js
baseURL: "http://localhost:3001"
```
