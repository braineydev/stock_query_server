import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const Layout = ({ children, setPage }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="layout">
      <Sidebar sidebarOpen={sidebarOpen} setPage={setPage} />

      <div className={`main ${sidebarOpen ? "shift" : "full"}`}>
        <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        {children}
      </div>
    </div>
  );
};

export default Layout;