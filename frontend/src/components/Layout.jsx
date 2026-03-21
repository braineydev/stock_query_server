import {
  Activity,
  ActivitySquare,
  BellRing,
  BookOpen,
  Database,
  Layers,
  LayoutDashboard,
  LogOut,
  Moon,
  Search,
  ShieldAlert,
  Sun,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    {
      path: "/",
      label: "Dashboard",
      icon: <LayoutDashboard size={18} />,
      roles: ["User", "Admin", "Auditor", "SUPER_ADMIN"],
    },
    {
      path: "/ingest",
      label: "Stock Ingestion",
      icon: <Database size={18} />,
      roles: ["User", "Admin", "SUPER_ADMIN"],
    },
    {
      path: "/query",
      label: "Query Stocks",
      icon: <Search size={18} />,
      roles: ["User", "Admin", "Auditor", "SUPER_ADMIN"],
    },
    {
      path: "/analytics",
      label: "Metrics Analytics",
      icon: <Activity size={18} />,
      roles: ["User", "Admin", "Auditor", "SUPER_ADMIN"],
    },
    {
      path: "/alerts",
      label: "Alerts Management",
      icon: <BellRing size={18} />,
      roles: ["User", "Admin", "SUPER_ADMIN"],
    },
    {
      path: "/admin",
      label: "Admin Panel",
      icon: <ShieldAlert size={18} />,
      roles: ["Admin", "SUPER_ADMIN"],
    },
    {
      path: "/logs",
      label: "Audit Logs",
      icon: <Layers size={18} />,
      roles: ["Admin", "Auditor", "SUPER_ADMIN"],
    },
    {
      path: "/docs",
      label: "System Documentation",
      icon: <BookOpen size={18} />,
      roles: ["User", "Admin", "Auditor", "SUPER_ADMIN"],
    },
  ];

  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={`flex h-screen font-sans selection:bg-blue-100 selection:text-blue-900 ${
        isDark
          ? "bg-[var(--bg-base)] text-[var(--text-base)]"
          : "bg-[var(--bg-base)] text-[var(--text-base)]"
      }`}
    >
      {/* SIDEBAR: Premium Dark Mode with subtle gradients */}
      <aside
        className={`w-64 flex flex-col shadow-2xl flex-shrink-0 border-r z-20 transition-all ${
          isDark
            ? "bg-[#0B1120] text-slate-300 border-slate-800"
            : "bg-[#0B1120] text-slate-300 border-slate-800"
        }`}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-inner">
            <ActivitySquare className="text-white" size={24} />
          </div>
          <span
            className={`text-lg font-bold tracking-tight leading-tight ${
              isDark ? "text-white" : "text-white"
            }`}
          >
            Stock Query
            <br />
            Server
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
          <ul className="space-y-1.5 px-3">
            {navItems
              .filter(item => item.roles.includes(user?.role || "SUPER_ADMIN"))
              .map(item => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-900/20 font-medium"
                          : isDark
                            ? "hover:bg-slate-800/50 hover:text-white text-slate-400"
                            : "hover:bg-slate-800/50 hover:text-white text-slate-400"
                      }`
                    }
                  >
                    <span className="transition-transform duration-200 group-hover:scale-110">
                      {item.icon}
                    </span>
                    <span className="text-sm">{item.label}</span>
                  </NavLink>
                </li>
              ))}
          </ul>
        </nav>

        {/* BOTTOM USER CARD: Figma-style glassmorphism */}
        <div className="p-4">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-sm transition-colors cursor-pointer card-style ${
              isDark
                ? "border border-[var(--card-border)] bg-[var(--surface)]"
                : "border border-[var(--card-border)] bg-[var(--surface)]"
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-600 to-slate-400 flex items-center justify-center text-white font-bold shadow-inner">
              {user?.username ? user.username.charAt(0).toUpperCase() : "B"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate">
                {user?.username || "brainey"}
              </p>
              <p className="text-[10px] font-mono tracking-wider">
                {user?.role || "SUPER_ADMIN"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* HEADER: Sticky with Backdrop Blur */}
        <header
          className={`sticky top-0 z-10 backdrop-blur-md h-16 flex items-center justify-between px-8 flex-shrink-0 transition-all ${
            isDark
              ? "bg-[var(--header)] border-b border-[var(--border)]"
              : "bg-[var(--header)] border-b border-[var(--border)]"
          }`}
        >
          <div
            className={`text-sm font-medium tracking-wide ${
              isDark
                ? "text-slate-300"
                : "text-slate-500"
            }`}
          >
            Educational Algorithm Visualization Platform
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition ${
                isDark
                  ? "bg-slate-800 text-slate-100 border-slate-700 hover:bg-slate-700"
                  : "bg-slate-800 text-slate-100 border-slate-700 hover:bg-slate-700"
              }`}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
              {isDark ? "Light Mode" : "Dark Mode"}
            </button>
            <button
              onClick={handleLogout}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                isDark
                  ? "bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700"
                  : "bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700"
              }`}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>

        {/* DYNAMIC PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>

        {/* FOOTER */}
        <footer className="bg-[var(--surface)] border-t border-[var(--border)] py-4 px-8 text-xs flex justify-between items-center flex-shrink-0 font-medium">
          <span
            className={`${isDark ? "text-[var(--muted)]" : "text-[var(--muted)]"}`}
          >
            Version 1.0.0 | Variant C1-C4 Complete
          </span>
          <span className={`${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Project Team Credits |{" "}
            <a
              className={`${isDark ? "text-sky-300 hover:text-sky-200" : "text-blue-500 hover:text-blue-700"}`}
              href="#"
            >
              GitHub Repository
            </a>
          </span>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
