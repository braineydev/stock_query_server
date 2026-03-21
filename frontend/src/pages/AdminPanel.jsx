import axios from "axios";
import {
  AlertOctagon,
  CheckCircle,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "User",
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(false);

  // Mock token for demonstration. In a real app, get this from your AuthContext.
  const authHeaders = { headers: { Authorization: `Bearer SIMULATED_TOKEN` } };

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

  useEffect(() => {
    fetchUsers();
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
      fetchUsers(); // Refresh the table
    } catch (error) {
      setStatus({
        type: "error",
        message: error.response?.data?.error || "Failed to create user.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSystemReset = async () => {
    if (
      !window.confirm(
        "WARNING: This will erase all Hash Map stocks, Queue alerts, and Deque analytics data. Proceed?",
      )
    )
      return;

    try {
      const response = await axios.post(
        "http://localhost:5000/api/admin/reset",
        {},
        authHeaders,
      );
      setStatus({ type: "success", message: response.data.message });
    } catch (error) {
      setStatus({ type: "error", message: "Failed to reset system." });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          Admin Panel (C4)
          <span className="text-xs font-mono bg-red-100 text-red-800 px-2 py-1 rounded-full uppercase tracking-wider">
            Restricted Access
          </span>
        </h1>
        <p className="text-gray-500 mt-1">
          Manage multi-tenant access control and perform system resets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --- CREATE USER FORM --- */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
              <UserPlus className="text-blue-500" size={24} />
              <h2 className="text-lg font-semibold text-gray-800">
                Provision User
              </h2>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  required
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 border border-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temporary Password
                </label>
                <input
                  required
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 border border-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 border border-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                >
                  <option value="User">User (Standard Access)</option>
                  <option value="Auditor">Auditor (Read Logs)</option>
                  <option value="Admin">Admin (Full Access)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-4 flex items-center justify-center gap-2 text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-lg text-sm px-5 py-2.5 transition-colors"
              >
                <UserPlus size={18} />{" "}
                {isLoading ? "Creating..." : "Create Account"}
              </button>
            </form>

            {status.message && (
              <div
                className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 ${status.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
              >
                {status.type === "success" ? (
                  <CheckCircle size={18} />
                ) : (
                  <ShieldAlert size={18} />
                )}
                {status.message}
              </div>
            )}
          </div>

          {/* DANGER ZONE */}
          <div className="bg-red-50 p-6 rounded-xl border border-red-200">
            <h3 className="text-red-800 font-bold flex items-center gap-2 mb-2">
              <AlertOctagon size={20} /> Danger Zone
            </h3>
            <p className="text-sm text-red-600 mb-4">
              Wipes all volatile memory structures (Hash Maps, Queues, Heaps).
            </p>
            <button
              onClick={handleSystemReset}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Factory Reset System Data
            </button>
          </div>
        </div>

        {/* --- USERS TABLE --- */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Users size={18} className="text-gray-500" /> Active Tenants (O(1)
              Hash Map)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-white border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Username</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr
                    key={user.id}
                    className="bg-white border-b hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 font-mono text-gray-400">
                      {user.id}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {user.username}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          user.role === "Admin"
                            ? "bg-red-100 text-red-800"
                            : user.role === "Auditor"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.username !== "admin" && (
                        <button
                          className="text-red-500 hover:text-red-700 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
