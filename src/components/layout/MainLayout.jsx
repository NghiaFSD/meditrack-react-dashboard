import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

/**
 * Layout chính: Sidebar bên trái + Header phía trên + Khu vực nội dung các trang
 */
function MainLayout() {
  return (
    <div className="d-flex bg-light" style={{ height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <div className="d-flex flex-column flex-grow-1" style={{ minWidth: 0, overflow: "hidden" }}>
        <Header />
        <main className="flex-grow-1 px-4 pb-5" style={{ overflowY: "auto" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
