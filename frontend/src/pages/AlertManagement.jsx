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

const defaultStockOptions = ["AAPL", "MSFT", "TSLA"];

const AlertManagement = () => {
  const { user } = useAuth();
  const normalizedRole = (user?.role || "").toUpperCase();
  const isAdminOrSuper = ["ADMIN", "SUPER_ADMIN", "SUPER ADMIN"].includes(
    normalizedRole,
  );

  const [formData, setFormData] = useState({
    stock_id: "AAPL",
    condition: "greater_than",
    threshold: "",
  });

  const [configuredAlerts, setConfiguredAlerts] = useState([]);
  const [triggeredFeed, setTriggeredFeed] = useState([]);
  const [status, setStatus] = useState({ type: "", message: "", meta: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [availableStockIds, setAvailableStockIds] = useState(defaultStockOptions);

  const visibleAlerts = isAdminOrSuper
    ? configuredAlerts
    : configuredAlerts.filter(alert => alert.created_by === user?.username);

  const fetchAlertData = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/alerts");
      setConfiguredAlerts(response.data.configured_alerts);
      setTriggeredFeed(response.data.triggered_feed);
    } catch (error) {
      console.error("Failed to fetch alerts data:", error);
    }
  };

  useEffect(() => {
    fetchAlertData();
    const interval = setInterval(fetchAlertData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchAvailableStocks = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/stocks/summary");
        const ids = Array.from(
          new Set([...defaultStockOptions, ...Object.keys(response.data || {})]),
        ).sort();
        setAvailableStockIds(ids);
        setFormData(prev => ({
          ...prev,
          stock_id: ids.includes(prev.stock_id) ? prev.stock_id : ids[0] || "AAPL",
        }));
      } catch (error) {
        console.error("Failed to fetch stock IDs:", error);
        setAvailableStockIds(defaultStockOptions);
      }
    };

    fetchAvailableStocks();
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

      setFormData({ ...formData, threshold: "" });
      fetchAlertData();
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

  const inputBase =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition focus:border-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-100";

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="rounded-[32px] border border-slate-200/80 bg-[#fcfbf7] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              Queue Monitor
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Alert Management
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Configure threshold triggers and review queue-driven events in the
              same visual language as the documentation dashboard.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <AlertBadge label="Mode" value="FIFO Queue" tone="amber" />
            <AlertBadge label="Configured" value={`${visibleAlerts.length}`} tone="sky" />
            <AlertBadge label="Feed Events" value={`${triggeredFeed.length}`} tone="emerald" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#fff3e8] p-3">
              <BellRing className="text-orange-700" size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                New Alert
              </p>
              <h2 className="text-xl font-bold text-slate-900">
                Create Threshold
              </h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Stock ID
              </label>
              <select
                required
                name="stock_id"
                value={formData.stock_id}
                onChange={handleInputChange}
                className={inputBase}
              >
                {availableStockIds.map(stockId => (
                  <option key={stockId} value={stockId}>
                    {stockId}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Trigger Condition
              </label>
              <select
                name="condition"
                value={formData.condition}
                onChange={handleInputChange}
                className={inputBase}
              >
                <option value="greater_than">Price Exceeds (&gt;)</option>
                <option value="less_than">Price Drops Below (&lt;)</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Threshold Price
              </label>
              <input
                required
                type="number"
                step="0.01"
                name="threshold"
                value={formData.threshold}
                onChange={handleInputChange}
                placeholder="0.00"
                className={inputBase}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-50"
            >
              <PlusCircle size={18} />
              {isLoading ? "Enqueuing Target..." : "Create Alert"}
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
                  <AlertTriangle size={18} className="text-rose-600" />
                )}
                {status.message}
              </div>
              {status.meta && (
                <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1.5 font-mono text-xs font-semibold ring-1 ring-black/5">
                  {status.meta}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <List size={18} className="text-slate-500" />
                Configured Alerts
              </h2>
              <span className="rounded-full bg-[#f3f8ff] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-900">
                Active Thresholds
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Stock ID</th>
                    <th className="px-6 py-4">Condition</th>
                    <th className="px-6 py-4">Threshold</th>
                    <th className="px-6 py-4">Status</th>
                    {isAdminOrSuper && <th className="px-6 py-4">Owner</th>}
                  </tr>
                </thead>
                <tbody>
                  {visibleAlerts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isAdminOrSuper ? "5" : "4"}
                        className="px-6 py-16 text-center text-slate-500"
                      >
                        No active alerts configured for your account.
                      </td>
                    </tr>
                  ) : (
                    visibleAlerts.map((alert, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-slate-100 bg-white transition hover:bg-[#fcfbf7]"
                      >
                        <td className="px-6 py-4 font-bold text-slate-900">
                          {alert.stock_id}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                          {alert.condition === "greater_than"
                            ? "> (EXCEEDS)"
                            : "< (DROPS BELOW)"}
                        </td>
                        <td className="px-6 py-4 font-mono">
                          ${alert.threshold.toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                              alert.status === "active"
                                ? "bg-[#eef4ff] text-sky-800"
                                : "bg-[#ecfff1] text-emerald-800"
                            }`}
                          >
                            {alert.status}
                          </span>
                        </td>
                        {isAdminOrSuper && (
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <UserIcon size={14} className="text-slate-400" />
                              {alert.created_by}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[28px] bg-[#171717] text-white shadow-[0_26px_60px_rgba(15,23,42,0.24)]">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-white/10" />
            <div className="absolute -left-6 bottom-8 h-20 w-20 rounded-full bg-white/[0.03]" />
            <div className="relative flex items-center justify-between border-b border-white/10 px-6 py-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Activity size={18} className="text-orange-400" />
                Live Trigger Feed
              </h2>
              <span className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-mono uppercase tracking-[0.16em] text-slate-200">
                <Clock size={12} />
                O(1) Dequeue
              </span>
            </div>

            <div className="relative max-h-96 overflow-y-auto bg-white/5">
              {triggeredFeed.length === 0 ? (
                <div className="p-12 text-center text-slate-300">
                  <BellRing size={32} className="mx-auto mb-3 text-slate-500" />
                  <p>Queue is empty. Waiting for trigger events...</p>
                </div>
              ) : (
                <ul className="divide-y divide-white/10">
                  {triggeredFeed.map((trigger, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-4 px-6 py-4 transition hover:bg-white/5"
                    >
                      <div className="rounded-full bg-orange-500/15 p-2">
                        <AlertTriangle size={18} className="text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">
                          {trigger.message}
                        </p>
                        <p className="mt-1 text-xs font-mono text-slate-400">
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
      </section>
    </div>
  );
};

const AlertBadge = ({ label, value, tone }) => {
  const tones = {
    amber: "bg-[#fff3e8] text-orange-900",
    sky: "bg-[#eaf5ff] text-sky-900",
    emerald: "bg-[#ecfff1] text-emerald-900",
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

export default AlertManagement;
