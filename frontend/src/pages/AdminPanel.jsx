import axios from "axios";
import {
  AlertOctagon,
  Building2,
  CheckCircle,
  LockKeyhole,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

const AdminPanel = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "User",
  });
  const [tenantForm, setTenantForm] = useState({
    id: "",
    name: "",
    status: "active",
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetForm, setResetForm] = useState({
    confirmationText: "",
    password: "",
  });
  const [isResetting, setIsResetting] = useState(false);
  const [simMode, setSimMode] = useState("demo");
  const [isTogglingMode, setIsTogglingMode] = useState(false);

  const activeTenant = user?.active_tenant_id || user?.tenant_id || "global";
  const authHeaders = {
    headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
  };
  const normalizedRole = (user?.role || "").toUpperCase();
  const isSuperAdmin =
    normalizedRole === "SUPER_ADMIN" || normalizedRole === "SUPER ADMIN";

  const fetchUsers = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/admin/users",
        authHeaders,
      );
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
  };

  const fetchTenants = async () => {
    if (!isSuperAdmin) {
      setTenants([]);
      return;
    }

    try {
      const response = await axios.get(
        "http://localhost:5000/api/admin/tenants",
        authHeaders,
      );
      setTenants(response.data);
    } catch (error) {
      console.error("Failed to fetch tenants", error);
    }
  };

  const fetchSimMode = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/admin/simulator-mode",
        authHeaders,
      );
      setSimMode(res.data.mode || "demo");
    } catch {
      // silently fail — not critical
    }
  };

  const toggleSimMode = async () => {
    if (isTogglingMode) return;
    setIsTogglingMode(true);
    try {
      const next = simMode === "demo" ? "normal" : "demo";
      const res = await axios.post(
        "http://localhost:5000/api/admin/simulator-mode",
        { mode: next },
        authHeaders,
      );
      setSimMode(res.data.mode || next);
    } catch {
      // silently fail
    } finally {
      setIsTogglingMode(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchTenants();
    fetchSimMode();
  }, []);

  const handleInputChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateUser = async e => {
    e.preventDefault();
    setIsLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await axios.post(
        "http://localhost:5000/api/admin/users",
        formData,
        authHeaders,
      );
      setStatus({ type: "success", message: response.data.message });
      setFormData({ username: "", password: "", role: "User" });
      fetchUsers();
    } catch (error) {
      setStatus({
        type: "error",
        message: error.response?.data?.error || "Failed to create user.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTenant = async e => {
    e.preventDefault();
    setIsLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await axios.post(
        "http://localhost:5000/api/admin/tenants",
        tenantForm,
        authHeaders,
      );
      setStatus({
        type: "success",
        message: `Tenant ${response.data.name || tenantForm.name} created successfully.`,
      });
      setTenantForm({ id: "", name: "", status: "active" });
      fetchTenants();
    } catch (error) {
      setStatus({
        type: "error",
        message: error.response?.data?.error || "Failed to create tenant.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openResetModal = () => {
    setResetForm({ confirmationText: "", password: "" });
    setStatus({ type: "", message: "" });
    setIsResetModalOpen(true);
  };

  const closeResetModal = () => {
    if (isResetting) return;
    setIsResetModalOpen(false);
    setResetForm({ confirmationText: "", password: "" });
  };

  const handleResetFormChange = e => {
    const { name, value } = e.target;
    setResetForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSystemReset = async e => {
    e.preventDefault();

    if (!isSuperAdmin) {
      setStatus({
        type: "error",
        message:
          "Only a SUPER_ADMIN can confirm and execute a full system reset.",
      });
      return;
    }

    if (resetForm.confirmationText !== "RESET") {
      setStatus({
        type: "error",
        message: 'Type "RESET" exactly to confirm the destructive action.',
      });
      return;
    }

    setIsResetting(true);
    setStatus({ type: "", message: "" });

    try {
      await axios.post("http://127.0.0.1:5000/api/auth/login", {
        username: user?.username || "",
        password: resetForm.password,
        tenant_id: activeTenant,
      });

      const response = await axios.post(
        "http://localhost:5000/api/admin/reset",
        {},
        authHeaders,
      );

      setStatus({ type: "success", message: response.data.message });
      setIsResetModalOpen(false);
      setResetForm({ confirmationText: "", password: "" });
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        "Reset blocked. Re-enter the SUPER_ADMIN password and try again.";
      setStatus({ type: "error", message: errorMessage });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="rounded-[32px] border border-slate-200/80 bg-[#fcfbf7] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              Operations Control
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Admin Panel
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Provision user access, review active accounts, and manage platform
              resets from one structured operations surface.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <AdminBadge label="Tenant" value={activeTenant} tone="rose" />
            <AdminBadge
              label="Active Users"
              value={`${users.length}`}
              tone="sky"
            />
            <AdminBadge
              label="Access Model"
              value="Tenant RBAC"
              tone="violet"
            />
            <SimModeToggle
              mode={simMode}
              isLoading={isTogglingMode}
              onToggle={toggleSimMode}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#eaf5ff] p-3">
                <UserPlus className="text-sky-700" size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Provisioning
                </p>
                <h2 className="text-xl font-bold text-slate-900">
                  Create account
                </h2>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="mt-6 space-y-4">
              <FormField
                label="Username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
              />
              <FormField
                label="Temporary password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
              />

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  System role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                >
                  <option value="User">User (Standard Access)</option>
                  <option value="Auditor">Auditor (Read Logs)</option>
                  <option value="Admin">Admin (Full Access)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-50"
              >
                <UserPlus size={18} />
                {isLoading ? "Creating account..." : "Create account"}
              </button>
            </form>

            {status.message && (
              <div
                className={`mt-5 rounded-[24px] border p-4 text-sm ${
                  status.type === "success"
                    ? "border-emerald-200 bg-[#ecfff1] text-emerald-800"
                    : "border-rose-200 bg-[#fff5f5] text-rose-800"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {status.type === "success" ? (
                    <CheckCircle size={18} className="text-emerald-600" />
                  ) : (
                    <ShieldAlert size={18} className="text-rose-600" />
                  )}
                  {status.message}
                </div>
              </div>
            )}
          </div>

          {isSuperAdmin && (
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#f5f3ff] p-3">
                  <Building2 className="text-violet-700" size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Tenant Registry
                  </p>
                  <h2 className="text-xl font-bold text-slate-900">
                    Create tenant
                  </h2>
                </div>
              </div>

              <form onSubmit={handleCreateTenant} className="mt-6 space-y-4">
                <FormField
                  label="Tenant ID"
                  name="id"
                  value={tenantForm.id}
                  onChange={e =>
                    setTenantForm({ ...tenantForm, id: e.target.value })
                  }
                />
                <FormField
                  label="Tenant name"
                  name="name"
                  value={tenantForm.name}
                  onChange={e =>
                    setTenantForm({ ...tenantForm, name: e.target.value })
                  }
                />

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    Tenant status
                  </label>
                  <select
                    name="status"
                    value={tenantForm.status}
                    onChange={e =>
                      setTenantForm({ ...tenantForm, status: e.target.value })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-50"
                >
                  <Building2 size={18} />
                  {isLoading ? "Creating tenant..." : "Create tenant"}
                </button>
              </form>
            </div>
          )}

          <div className="relative overflow-hidden rounded-[28px] bg-[#17181c] p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-white/10" />
            <div className="absolute -left-6 bottom-6 h-20 w-20 rounded-full bg-white/[0.03]" />
            <div className="relative flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <AlertOctagon className="text-rose-300" size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Danger Zone
                </p>
                <h3 className="text-xl font-bold">Factory reset</h3>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Resets volatile in-memory structures used for alerts and audit
              activity inside the active tenant scope. Use only during
              controlled operational windows.
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">
              Requires typed confirmation and super admin password re-entry
            </p>
            <button
              onClick={openResetModal}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 px-5 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            >
              Reset system data
            </button>
          </div>
        </div>

        <div className="rounded-[28px] bg-white shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#f3ecff] p-3">
                <Users size={20} className="text-violet-700" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Access Directory
                </p>
                <h2 className="text-xl font-bold text-slate-900">
                  User accounts
                </h2>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-[#f8f7f2] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
              <SlidersHorizontal size={14} />
              Hash map directory
            </div>
          </div>

          <div className="space-y-3 p-5">
            {users.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-[#f8f7f2] px-5 py-10 text-center">
                <p className="font-semibold text-slate-700">
                  No user accounts loaded
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Accounts from the active tenant directory will appear here.
                </p>
              </div>
            ) : (
              users.map(user => (
                <div
                  key={user.id}
                  className="flex flex-col gap-4 rounded-[24px] bg-[#f8f7f2] px-5 py-4 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sm font-bold text-slate-900 shadow-sm">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {user.username}
                      </p>
                      <p className="mt-1 text-xs font-mono text-slate-500">
                        ID {user.id} | Tenant {user.tenant_id || activeTenant}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${
                        user.role === "Admin"
                          ? "bg-[#fff1f2] text-rose-800"
                          : user.role === "Auditor"
                            ? "bg-[#efe8ff] text-violet-800"
                            : "bg-[#ecfff1] text-emerald-800"
                      }`}
                    >
                      {user.role}
                    </span>
                    {user.username !== "admin" && (
                      <button
                        className="rounded-2xl bg-white p-3 text-rose-500 shadow-sm transition hover:bg-rose-50"
                        title="Delete User"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {isSuperAdmin && (
        <section className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#eef7ff] p-3">
                <Building2 size={20} className="text-sky-700" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Tenant Directory
                </p>
                <h2 className="text-xl font-bold text-slate-900">
                  Registered tenants
                </h2>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-[#f8f7f2] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
              <Building2 size={14} />
              {tenants.length} tenants
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {tenants.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-[#f8f7f2] px-5 py-10 text-center">
                <p className="font-semibold text-slate-700">
                  No tenants loaded
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Tenant records from the registry endpoint will appear here.
                </p>
              </div>
            ) : (
              tenants.map(tenant => (
                <div
                  key={tenant.id}
                  className="flex flex-col gap-4 rounded-[24px] bg-[#f8f7f2] px-5 py-4 shadow-sm ring-1 ring-slate-100 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {tenant.name}
                    </p>
                    <p className="mt-1 text-xs font-mono text-slate-500">
                      {tenant.id}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${
                        tenant.status === "active"
                          ? "bg-[#ecfff1] text-emerald-800"
                          : "bg-[#fff1f2] text-rose-800"
                      }`}
                    >
                      {tenant.status}
                    </span>
                    <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-sm">
                      {tenant.id === activeTenant
                        ? "Current Tenant"
                        : "Registry"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.18)] ring-1 ring-slate-100">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#fff1f2] p-3">
                <LockKeyhole size={20} className="text-rose-600" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Confirm Reset
                </p>
                <h3 className="text-xl font-bold text-slate-900">
                  Re-authenticate super admin
                </h3>
              </div>
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-600">
              This will erase alert queues, triggered feeds, and tenant audit
              activity for{" "}
              <span className="font-bold text-slate-900">{activeTenant}</span>.
              To continue, type{" "}
              <span className="font-bold text-slate-900">RESET</span> and enter
              the SUPER_ADMIN password again.
            </p>

            {!isSuperAdmin && (
              <div className="mt-4 rounded-[20px] border border-amber-200 bg-[#fff7e6] px-4 py-3 text-sm text-amber-900">
                The current account is not a SUPER_ADMIN. Switch to a super
                admin account to complete this action.
              </div>
            )}

            <form onSubmit={handleSystemReset} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Type RESET to confirm
                </label>
                <input
                  required
                  name="confirmationText"
                  value={resetForm.confirmationText}
                  onChange={handleResetFormChange}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium uppercase text-slate-900 shadow-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Super admin password
                </label>
                <input
                  required
                  type="password"
                  name="password"
                  value={resetForm.password}
                  onChange={handleResetFormChange}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeResetModal}
                  className="flex-1 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isResetting ||
                    !isSuperAdmin ||
                    resetForm.confirmationText !== "RESET" ||
                    !resetForm.password
                  }
                  className="flex-1 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isResetting ? "Verifying..." : "Confirm reset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const FormField = ({ label, name, value, onChange, type = "text" }) => (
  <div>
    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
      {label}
    </label>
    <input
      required
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
    />
  </div>
);

const SimModeToggle = ({ mode, isLoading, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={isLoading}
    title={`Simulator: ${mode}. Click to switch to ${
      mode === "demo" ? "normal" : "demo"
    } mode.`}
    className="rounded-[24px] bg-[#fffbeb] px-5 py-4 text-left text-amber-900 shadow-sm transition hover:bg-[#fef3c7] disabled:opacity-60"
  >
    <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.16em] opacity-60">
      <Zap size={11} />
      Sim Engine
    </p>
    <p className="mt-1 text-lg font-bold">
      {isLoading ? "…" : mode === "demo" ? "Demo" : "Normal"}
    </p>
  </button>
);

const AdminBadge = ({ label, value, tone }) => {
  const tones = {
    rose: "bg-[#fff1f2] text-rose-900",
    sky: "bg-[#eaf5ff] text-sky-900",
    violet: "bg-[#f3ecff] text-violet-900",
  };

  return (
    <div className={`rounded-[24px] px-5 py-4 shadow-sm ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-60">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
};

export default AdminPanel;
