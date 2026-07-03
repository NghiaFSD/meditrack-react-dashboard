import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

// Layout chính: Sidebar bên trái + Header + nội dung page.
function MainLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Header />
        <section className="page-container">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export default MainLayout;
