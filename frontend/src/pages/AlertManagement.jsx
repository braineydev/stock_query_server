import axios from "axios";
import {
  Activity,
  AlertTriangle,
  BellRing,
  CheckCircle,
  Clock,
  List,
  PlusCircle,
  User as UserIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

const AlertManagement = () => {
  const { user } = useAuth();
  const normalizedRole = (user?.role || "").toUpperCase();
  const isAdminOrSuper = ["ADMIN", "SUPER_ADMIN", "SUPER ADMIN"].includes(
    normalizedRole,
  );

  const [formData, setFormData] = useState({
    stock_id: "",
    condition: "greater_than",
    threshold: "",
  });

  const [configuredAlerts, setConfiguredAlerts] = useState([]);
  const [triggeredFeed, setTriggeredFeed] = useState([]);
  const [status, setStatus] = useState({ type: "", message: "", meta: "" });
  const [isLoading, setIsLoading] = useState(false);

  const visibleAlerts = isAdminOrSuper
    ? configuredAlerts
    : configuredAlerts.filter(alert => alert.created_by === user?.username);

  // Fetch both active configurations and the live feed
  const fetchAlertData = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/alerts");
      setConfiguredAlerts(response.data.configured_alerts);
      setTriggeredFeed(response.data.triggered_feed);
    } catch (error) {
      console.error("Failed to fetch alerts data:", error);
    }
  };

  // Initial load and polling for live feed updates
  useEffect(() => {
    fetchAlertData();
    const interval = setInterval(fetchAlertData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "stock_id" ? value.toUpperCase() : value,
    });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setIsLoading(true);
    setStatus({ type: "", message: "", meta: "" });

    try {
      const payload = {
        ...formData,
        created_by: user?.username || "System",
      };

      const response = await axios.post(
        "http://localhost:5000/api/alerts",
        payload,
      );
      setStatus({
        type: "success",
        message: response.data.message,
        meta: response.data.meta?.complexity_note,
      });

      // Reset form but keep stock_id for convenience
      setFormData({ ...formData, threshold: "" });
      fetchAlertData(); // Refresh table immediately
    } catch (error) {
      setStatus({
        type: "error",
        message: error.response?.data?.error || "Failed to create alert.",
        meta: "",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          Alert Management (C3)
          <span className="text-xs font-mono bg-orange-100 text-orange-800 px-2 py-1 rounded-full uppercase tracking-wider">
            FIFO Queue System
          </span>
        </h1>
        <p className="text-gray-500 mt-1">
          Configure thresholds and monitor asynchronous, event-driven triggers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --- LEFT COLUMN: CREATE ALERT FORM --- */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
            <BellRing className="text-orange-500" size={24} />
            <h2 className="text-lg font-semibold text-gray-800">
              New Alert Target
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock ID
              </label>
              <input
                required
                type="text"
                name="stock_id"
                value={formData.stock_id}
                onChange={handleInputChange}
                placeholder="e.g., TSLA"
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 p-2.5 uppercase"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trigger Condition
              </label>
              <select
                name="condition"
                value={formData.condition}
                onChange={handleInputChange}
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 p-2.5"
              >
                <option value="greater_than">Price Exceeds (&gt;)</option>
                <option value="less_than">Price Drops Below (&lt;)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Threshold Price ($)
              </label>
              <input
                required
                type="number"
                step="0.01"
                name="threshold"
                value={formData.threshold}
                onChange={handleInputChange}
                placeholder="0.00"
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 p-2.5"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 flex items-center justify-center gap-2 text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 transition-colors disabled:opacity-50"
            >
              <PlusCircle size={18} />
              {isLoading ? "Enqueuing Target..." : "Create Alert"}
            </button>
          </form>

          {/* Form Status */}
          {status.message && (
            <div
              className={`mt-4 p-4 rounded-lg text-sm flex flex-col gap-2 ${status.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
            >
              <div className="flex items-center gap-2 font-medium">
                {status.type === "success" ? (
                  <CheckCircle size={18} />
                ) : (
                  <AlertTriangle size={18} />
                )}
                {status.message}
              </div>
              {status.meta && (
                <div className="font-mono text-xs bg-white/50 py-1 px-2 rounded w-fit border border-green-200">
                  {status.meta}
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- RIGHT COLUMN: TABLES AND FEEDS --- */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Configured Alerts Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <List size={18} className="text-gray-500" /> Configured Alerts
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-white border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3">Stock ID</th>
                    <th className="px-6 py-3">Condition</th>
                    <th className="px-6 py-3">Threshold</th>
                    <th className="px-6 py-3">Status</th>
                    {isAdminOrSuper && <th className="px-6 py-3">Owner</th>}
                  </tr>
                </thead>
                <tbody>
                  {visibleAlerts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isAdminOrSuper ? "5" : "4"}
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        No active alerts configured for your account.
                      </td>
                    </tr>
                  ) : (
                    visibleAlerts.map((alert, idx) => (
                      <tr
                        key={idx}
                        className="bg-white border-b hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 font-bold text-gray-900">
                          {alert.stock_id}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">
                          {alert.condition === "greater_than"
                            ? "> (EXCEEDS)"
                            : "< (DROPS BELOW)"}
                        </td>
                        <td className="px-6 py-4 font-mono">
                          ${alert.threshold.toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              alert.status === "active"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {alert.status.toUpperCase()}
                          </span>
                        </td>
                        {isAdminOrSuper && (
                          <td className="px-6 py-4 flex items-center gap-2">
                            <UserIcon size={14} className="text-gray-400" />
                            {alert.created_by}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Triggered Feed (Queue Visualization) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-900 text-white">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Activity size={18} className="text-orange-400" /> Live Trigger
                Feed
              </h2>
              <span className="text-xs font-mono bg-gray-800 border border-gray-700 text-gray-300 px-2 py-1 rounded flex items-center gap-2">
                <Clock size={12} /> O(1) Dequeue Processing
              </span>
            </div>

            <div className="p-0 max-h-80 overflow-y-auto bg-gray-50">
              {triggeredFeed.length === 0 ? (
                <div className="p-10 text-center text-gray-500 flex flex-col items-center">
                  <BellRing size={32} className="text-gray-300 mb-3" />
                  <p>
                    Queue is empty. Waiting for price data to trigger alerts...
                  </p>
                  <p className="text-xs mt-2 text-gray-400">
                    Go to the 'Ingestion' tab to add matching stock records.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {triggeredFeed.map((trigger, idx) => (
                    <li
                      key={idx}
                      className="p-4 hover:bg-orange-50/50 flex items-start gap-4 transition-colors animate-fade-in-up"
                    >
                      <div className="bg-orange-100 p-2 rounded-full mt-0.5">
                        <AlertTriangle size={18} className="text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {trigger.message}
                        </p>
                        <p className="text-xs font-mono text-gray-500 mt-1">
                          {trigger.timestamp}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertManagement;
