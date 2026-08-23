import React, { createContext, useContext, useState } from "react";
import { ROLES, getCurrentUser, clearCurrentUser } from "../utils/auth";

const AuthContext = createContext();

const STORAGE_KEY = "currentUser";

const DEMO_USERS = {
  [ROLES.ADMIN]: {
    id: "1",
    fullName: "Admin User",
    email: "admin@gmail.com",
    role: "ADMIN",
    avatar: "AU",
  },
  [ROLES.DOCTOR]: {
    id: "2",
    fullName: "Dr. Nguyen Minh",
    email: "doctor@gmail.com",
    role: "DOCTOR",
    avatar: "NM",
  },
  [ROLES.PATIENT]: {
    id: "3",
    fullName: "Le Trong Nghia",
    email: "patient@gmail.com",
    role: "PATIENT",
    avatar: "LH",
  },
};

/**
 * AuthProvider - Quản lý trạng thái xác thực và phân quyền người dùng tập trung bằng useContext
 */
export function AuthProvider({ children }) {
  // Khởi tạo state user từ localStorage
  const [user, setUser] = useState(() => {
    return getCurrentUser();
  });

  // Hàm đăng nhập: Lưu state và ghi vào localStorage
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  };

  // Hàm đăng xuất: Xóa state và xóa khỏi localStorage
  const logout = () => {
    setUser(null);
    clearCurrentUser();
  };

  // Chuyển đổi vai trò demo nhanh 1-click
  const switchDemoRole = (targetRole) => {
    const targetUser = DEMO_USERS[targetRole] || DEMO_USERS[ROLES.ADMIN];
    login(targetUser);
  };

  // Kiểm tra xem user có quyền hợp lệ hay không
  const checkRole = (allowedRoles = []) => {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    if (!user || !user.role) return false;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        isAdmin: user?.role === ROLES.ADMIN,
        isDoctor: user?.role === ROLES.DOCTOR,
        isPatient: user?.role === ROLES.PATIENT,
        login,
        logout,
        switchDemoRole,
        hasRole: checkRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook useAuth để truy cập trạng thái authentication nhanh chóng ở bất kỳ component nào
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
