import {
  Activity,
  ActivitySquare,
  BellRing,
  BookOpen,
  ChevronDown,
  Database,
  Layers,
  LayoutDashboard,
  LogOut,
  Moon,
  Repeat,
  Search,
  ShieldAlert,
  Sparkles,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../services/api";

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

const pageMeta = {
  "/": {
    title: "Dashboard",
    eyebrow: "SaaS Analytics Platform",
  },
  "/ingest": {
    title: "Stock Ingestion",
    eyebrow: "Write Pipeline",
  },
  "/query": {
    title: "Query Stocks",
    eyebrow: "Lookup Engine",
  },
  "/analytics": {
    title: "Metrics Analytics",
    eyebrow: "Insight Studio",
  },
  "/alerts": {
    title: "Alerts Management",
    eyebrow: "Signal Watch",
  },
  "/admin": {
    title: "Admin Panel",
    eyebrow: "Operations Control",
  },
  "/logs": {
    title: "Audit Logs",
    eyebrow: "Governance Trail",
  },
  "/docs": {
    title: "System Documentation",
    eyebrow: "Product Help Center",
  },
};

const Layout = () => {
  const { user, logout, switchTenant } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [tenants, setTenants] = useState([]);
  const [isSwitchingTenant, setIsSwitchingTenant] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const currentMeta = pageMeta[location.pathname] || pageMeta["/"];
  const visibleNavItems = navItems.filter(item =>
    item.roles.includes(user?.role || "SUPER_ADMIN"),
  );
  const activeTenant = user?.active_tenant_id || user?.tenant_id || "global";
  const switchableTenants = tenants.filter(
    tenant => tenant.status === "active" || tenant.id === activeTenant,
  );
  const isSuperAdmin =
    (user?.role || "").toUpperCase() === "SUPER_ADMIN" ||
    (user?.role || "").toUpperCase() === "SUPER ADMIN";

  useEffect(() => {
    const fetchTenants = async () => {
      if (!isSuperAdmin) {
        setTenants([]);
        return;
      }

      try {
        const response = await api.get("/admin/tenants");
        setTenants(response.data || []);
      } catch {
        setTenants([]);
      }
    };

    fetchTenants();
  }, [isSuperAdmin, user?.active_tenant_id]);

  const handleTenantSwitch = async e => {
    const nextTenantId = e.target.value;
    if (!nextTenantId || nextTenantId === activeTenant) return;

    setIsSwitchingTenant(true);
    try {
      await switchTenant(nextTenantId);
    } finally {
      setIsSwitchingTenant(false);
    }
  };

  return (
    <div
      className={`relative min-h-screen overflow-hidden p-3 md:p-4 ${
        isDark ? "bg-[var(--bg-base)]" : "bg-[var(--bg-base)]"
      }`}
    >
      <div className="relative mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1600px] gap-4 overflow-hidden rounded-[38px]">
        <aside className="hidden w-[280px] flex-shrink-0 lg:block">
          <div className="flex h-full flex-col rounded-[30px] bg-[#151618] px-5 py-6 text-slate-200 shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-center gap-3 px-3">
              <div className="rounded-2xl bg-gradient-to-br from-[#bce0ff] via-[#c9c8ff] to-[#ffe59d] p-3 text-slate-900 shadow-inner">
                <ActivitySquare size={22} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Stock Query Server
                </p>
                <h1 className="text-lg font-bold tracking-tight text-white">
                  Analytics OS
                </h1>
              </div>
            </div>

            <div className="mt-8 rounded-[26px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-lg font-bold text-slate-900">
                  {user?.username ? user.username.charAt(0).toUpperCase() : "S"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {user?.username || "stock admin"}
                  </p>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    {user?.role || "SUPER_ADMIN"}
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-[#202226] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Platform
                </p>
                <p className="mt-1 text-sm font-medium text-slate-200">
                  Calm analytics shell with product-grade workflows.
                </p>
                <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Active Tenant
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {activeTenant}
                </p>
              </div>
            </div>

            <nav className="mt-8 flex-1">
              <ul className="space-y-2">
                {visibleNavItems.map(item => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-gradient-to-r from-[#a9dafc] via-[#c9c8ff] to-[#ffe59d] text-slate-950 shadow-lg"
                            : "text-slate-400 hover:bg-white/6 hover:text-white"
                        }`
                      }
                    >
                      <span className="transition-transform duration-200 group-hover:scale-105">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="space-y-3">
              <div className="rounded-[26px] bg-gradient-to-br from-white/10 to-white/5 p-4">
                <div className="flex items-center gap-2 text-[#ffe59d]">
                  <Sparkles size={16} />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                    Product Tip
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Keep live charts and operational tasks in the same interface
                  for faster daily decisions.
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </aside>

        <div
          className={`flex min-w-0 flex-1 flex-col rounded-[34px] border shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur-xl ${
            isDark
              ? "border-white/10 bg-[#101114]/85"
              : "border-white/70 bg-white/75"
          }`}
        >
          <header
            className={`sticky top-0 z-20 border-b px-5 py-4 backdrop-blur-xl md:px-8 ${
              isDark
                ? "border-white/8 bg-[#17181c]/95"
                : "border-slate-200/70 bg-[var(--header)]"
            }`}
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {currentMeta.eyebrow}
                </p>
                <h2
                  className={`mt-1 text-2xl font-bold tracking-tight ${
                    isDark ? "text-slate-100" : "text-slate-900"
                  }`}
                >
                  {currentMeta.title}
                </h2>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative min-w-[280px] flex-1 md:w-[360px]">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Search modules, stocks, or system events"
                    className={`w-full rounded-full border px-11 py-3 text-sm shadow-sm outline-none transition ${
                      isDark
                        ? "border-white/10 bg-[#17181c] text-slate-200 placeholder:text-slate-500 focus:border-white/15 focus:ring-4 focus:ring-white/5"
                        : "border-slate-200 bg-white text-slate-700 focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                    }`}
                  />
                </div>

                <div className="flex items-center gap-3">
                  {isSuperAdmin && switchableTenants.length > 0 ? (
                    <div
                      className={`hidden items-center gap-3 rounded-2xl border px-3 py-2 shadow-sm lg:flex ${
                        isDark
                          ? "border-white/10 bg-[#17181c]"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <Repeat size={15} className="text-slate-400" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Switch Tenant
                      </span>
                      <div className="relative">
                        <select
                          value={activeTenant}
                          onChange={handleTenantSwitch}
                          disabled={isSwitchingTenant}
                          className={`appearance-none rounded-full border px-4 py-2 pr-10 text-xs font-semibold uppercase tracking-[0.14em] outline-none transition ${
                            isDark
                              ? "border-white/10 bg-[#101114] text-slate-100 focus:border-sky-300/40 focus:ring-2 focus:ring-sky-300/20"
                              : "border-slate-200 bg-slate-50 text-slate-800 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                          }`}
                        >
                          {switchableTenants.map(tenant => (
                            <option key={tenant.id} value={tenant.id}>
                              {tenant.id}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={14}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                      </div>
                    </div>
                  ) : null}

                  <div
                    className={`hidden items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] shadow-sm lg:inline-flex ${
                      isDark
                        ? "border border-sky-400/20 bg-sky-500/10 text-sky-100"
                        : "bg-[#eaf5ff] text-sky-800"
                    }`}
                  >
                    Tenant {activeTenant}
                  </div>

                  <div
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm ${
                      isDark
                        ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                        : "bg-[#ecfff1] text-emerald-800"
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]" />
                    System Online
                  </div>

                  <button
                    onClick={toggleTheme}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                      isDark
                        ? "border-white/10 bg-[#17181c] text-slate-100"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                    {isDark ? "Light" : "Dark"}
                  </button>

                  <div
                    className={`hidden items-center gap-3 rounded-full border px-3 py-2 shadow-sm md:flex ${
                      isDark
                        ? "border-white/10 bg-[#17181c]"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#ffe59d] to-[#c9c8ff] text-sm font-bold text-slate-900">
                      {user?.username
                        ? user.username.charAt(0).toUpperCase()
                        : "S"}
                    </div>
                    <div className="pr-2">
                      <p
                        className={`text-sm font-semibold ${
                          isDark ? "text-slate-100" : "text-slate-900"
                        }`}
                      >
                        {user?.username || "stock admin"}
                      </p>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                        {user?.role || "SUPER_ADMIN"}
                      </p>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                        {activeTenant}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="border-b border-slate-200/70 px-5 py-3 lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {visibleNavItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "bg-[#f8f7f2] text-slate-600"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          <main className="flex-1 overflow-y-auto px-5 py-6 md:px-8 md:py-8">
            <Outlet />
          </main>

          <footer className="border-t border-slate-200/70 px-6 py-4 text-xs font-medium text-slate-500 md:px-8">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <span>Version 1.0.0 | Premium analytics interface refresh</span>
              <span>Stock Query Server | Calm, modern SaaS operations UI</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Layout;
