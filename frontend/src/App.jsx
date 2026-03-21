import { useState } from "react";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import Layout from "./components/Layout";
import { useAuth } from "./context/AuthContext";
import { useTheme } from "./context/ThemeContext";

// Pages
import AdminPanel from "./pages/AdminPanel";
import AlertManagement from "./pages/AlertManagement";
import AuditLogs from "./pages/AuditLogs";
import Dashboard from "./pages/Dashboard";
import MetricsAnalytics from "./pages/MetricsAnalytics";
import StockIngestion from "./pages/StockIngestion";
import StockQuery from "./pages/StockQuery";
import SystemDocumentation from "./pages/SystemDocumentation";

// Minimal Login Component
const Login = () => {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const { login } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const handleSubmit = async e => {
    e.preventDefault();
    const result = await login(credentials.username, credentials.password);
    if (!result.success) setError(result.error);
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center ${
        isDark ? "bg-slate-950" : "bg-gray-100"
      }`}
    >
      <form
        onSubmit={handleSubmit}
        className={`p-8 rounded-xl shadow-lg w-96 space-y-4 ${
          isDark
            ? "bg-slate-800 text-slate-100 border border-slate-700"
            : "bg-white text-slate-900"
        }`}
      >
        <h2 className="text-2xl font-bold text-center mb-6">System Login</h2>
        {error && (
          <div
            className={`p-3 rounded text-sm ${
              isDark ? "bg-red-200 text-red-900" : "bg-red-100 text-red-700"
            }`}
          >
            {error}
          </div>
        )}
        <input
          required
          type="text"
          placeholder="Username"
          className={`w-full border p-2 rounded focus:outline-none focus:ring-2 ${
            isDark
              ? "bg-slate-700 border-slate-600 text-slate-100 ring-sky-400"
              : "bg-white border-gray-300 text-slate-900 ring-blue-400"
          }`}
          onChange={e =>
            setCredentials({ ...credentials, username: e.target.value })
          }
        />
        <input
          required
          type="password"
          placeholder="Password"
          className={`w-full border p-2 rounded focus:outline-none focus:ring-2 ${
            isDark
              ? "bg-slate-700 border-slate-600 text-slate-100 ring-sky-400"
              : "bg-white border-gray-300 text-slate-900 ring-blue-400"
          }`}
          onChange={e =>
            setCredentials({ ...credentials, password: e.target.value })
          }
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded font-medium hover:bg-blue-700 transition"
        >
          Login
        </button>
        <p
          className={`text-xs text-center mt-4 ${isDark ? "text-slate-300" : "text-gray-500"}`}
        >
          Hint: Use the admin credentials configured in your backend.
        </p>
      </form>
    </div>
  );
};

// Route Protection Wrapper (RBAC)
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  const userRole = (user?.role || "").toUpperCase();
  const normalizedAllowedRoles = allowedRoles?.map(role => role.toUpperCase());

  if (normalizedAllowedRoles && !normalizedAllowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />

        <Route
          path="ingest"
          element={
            <ProtectedRoute allowedRoles={["USER", "ADMIN", "SUPER_ADMIN"]}>
              <StockIngestion />
            </ProtectedRoute>
          }
        />
        <Route
          path="query"
          element={
            <ProtectedRoute
              allowedRoles={["USER", "ADMIN", "SUPER_ADMIN", "AUDITOR"]}
            >
              <StockQuery />
            </ProtectedRoute>
          }
        />
        <Route
          path="analytics"
          element={
            <ProtectedRoute
              allowedRoles={["USER", "ADMIN", "SUPER_ADMIN", "AUDITOR"]}
            >
              <MetricsAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="alerts"
          element={
            <ProtectedRoute allowedRoles={["USER", "ADMIN", "SUPER_ADMIN"]}>
              <AlertManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="logs"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN", "AUDITOR"]}>
              <AuditLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="docs"
          element={
            <ProtectedRoute
              allowedRoles={["USER", "ADMIN", "SUPER_ADMIN", "AUDITOR"]}
            >
              <SystemDocumentation />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
