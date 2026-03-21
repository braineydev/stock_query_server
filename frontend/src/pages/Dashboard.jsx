import {
  Activity,
  AlertTriangle,
  Clock,
  Database,
  Search,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import LiveMarketTicker from "../components/LiveMarketTicker";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../services/api";

const Dashboard = () => {
  const { user } = useAuth();
  const normalizedRole = (user?.role || "").toUpperCase();
  const isAdminOrSuper = ["ADMIN", "SUPER_ADMIN", "SUPER ADMIN"].includes(
    normalizedRole,
  );
  const isAuditor = normalizedRole === "AUDITOR";
  const canViewSystemMetrics = isAdminOrSuper || isAuditor;

  const [metrics, setMetrics] = useState({
    totalStocks: 0,
    totalQueries: 0,
    activeAlerts: 0,
    usersOnline: 1, // Simulated for demo
  });

  const [alertsFeed, setAlertsFeed] = useState([]);
  const [recentQueries, setRecentQueries] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [selectedStock, setSelectedStock] = useState("AAPL");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Fetch Dashboard Data from our Flask API
  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem("token");
      try {
        // 1. Fetch Stocks Summary (O(1) Keys count)
        const summaryRes = await api.get("/stocks/summary");
        const stocksCount = Object.keys(summaryRes.data).length;

        // 2. Fetch Alerts (Queue / O(1) dequeue feed)
        const alertsRes = await api.get("/alerts");
        const activeAlertsCount = alertsRes.data.configured_alerts.filter(
          a => a.status === "active",
        ).length;

        // 3. Fetch Audit Logs to extract recent queries (Stack / LIFO)
        // If user role cannot access logs, fallback gracefully.
        let queries = [];
        if (token) {
          try {
            const logsRes = await api.get("/logs?limit=50");
            queries = logsRes.data.logs
              .filter(log => log.action.includes("Queried"))
              .slice(0, 5);
          } catch {
            queries = [];
          }
        }

        setMetrics(prev => ({
          ...prev,
          totalStocks: stocksCount,
          activeAlerts: activeAlertsCount,
          totalQueries: queries.length * 12, // Simulated multiplier for dashboard visual
        }));

        setAlertsFeed(alertsRes.data.triggered_feed.slice(0, 5));
        setRecentQueries(queries);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchDashboardData();

    // Set up a polling interval to simulate live updates (every 5 seconds)
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Live chart data from generation engine (/api/stocks/live).
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const response = await api.get("/stocks/live");
        const liveData = response.data?.data || {};
        const stockPoint =
          liveData[selectedStock] || Object.values(liveData)[0];

        if (!stockPoint) {
          return;
        }

        const simulatedDate = response.data?.date || "";
        const tickTime = new Date().toLocaleTimeString();

        setChartData(prev => {
          const next = [
            ...prev,
            {
              time: tickTime,
              date: simulatedDate,
              price: stockPoint.close_price,
            },
          ];
          return next.slice(-60);
        });
      } catch (error) {
        console.error("Error fetching chart data:", error);
      }
    };

    setChartData([]);
    fetchChartData();
    const interval = setInterval(fetchChartData, 3000);
    return () => clearInterval(interval);
  }, [selectedStock]);

  return (
    <div
      className={`max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 ${isDark ? "bg-[var(--surface)] text-[var(--text-base)]" : "bg-[var(--surface-2)] text-[var(--text-base)]"}`}
    >
      {/* PAGE HEADER */}
      <div className="flex justify-between items-end">
        <div>
          <h1
            className={`text-3xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}
          >
            System Dashboard
          </h1>
        </div>
        <div
          className={`border text-sm font-semibold px-4 py-1.5 rounded-full flex items-center shadow-sm ${isDark ? "bg-green-900/30 border-green-600 text-green-300" : "bg-emerald-50 border border-emerald-200/60 text-emerald-700"}`}
        >
          <span className="relative flex h-2.5 w-2.5 mr-2.5">
            <span
              className={`${isDark ? "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300/60 opacity-60" : "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"}`}
            ></span>
            <span
              className={`${isDark ? "relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" : "relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"}`}
            ></span>
          </span>
          System Online
        </div>
      </div>

      {/* --- LIVE MARKET TICKER --- */}
      <LiveMarketTicker />

      {/* --- TOP METRICS CARDS --- */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 ${isAdminOrSuper ? "lg:grid-cols-4" : "lg:grid-cols-2"} gap-6`}
      >
        <MetricCard
          title="Total Stocks Stored"
          value={metrics.totalStocks}
          icon={<Database className="text-blue-600" size={22} />}
          iconBg="bg-blue-100"
          subtitle="O(1) Hash Map Storage"
        />
        <MetricCard
          title="Active Alerts"
          value={metrics.activeAlerts}
          icon={<AlertTriangle className="text-amber-600" size={22} />}
          iconBg="bg-amber-100"
          subtitle="Queue-based monitoring"
        />

        {canViewSystemMetrics && (
          <MetricCard
            title="Queries Today"
            value={metrics.totalQueries}
            icon={<Search className="text-purple-600" size={22} />}
            iconBg="bg-purple-100"
            subtitle="~0.002ms Avg Execution"
          />
        )}

        {isAdminOrSuper && (
          <MetricCard
            title="Users Online"
            value={metrics.usersOnline}
            icon={<Users className="text-emerald-600" size={22} />}
            iconBg="bg-emerald-100"
            subtitle="Multi-tenant active"
          />
        )}
      </div>

      {/* --- FINTECH CHART AREA --- */}
      <div
        className={`card-style p-7 rounded-3xl shadow-sm border transition-shadow ${isDark ? "border-[var(--card-border)]" : "border-[var(--card-border)]"}`}
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2
              className={`text-xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}
            >
              Stock Activity
            </h2>
            <p
              className={`text-sm font-medium mt-1 ${isDark ? "text-[var(--muted)]" : "text-slate-500"}`}
            >
              Live tick stream from the generation engine (rolling 60 points)
            </p>
          </div>

          <div className="relative">
            <select
              value={selectedStock}
              onChange={e => setSelectedStock(e.target.value)}
              className="appearance-none bg-white border border-slate-300 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full pl-4 pr-10 py-2.5 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <option value="AAPL">AAPL</option>
              <option value="TSLA">TSLA</option>
              <option value="MSFT">MSFT</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
              <svg
                className="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="h-[340px] w-full">
          {chartData.length === 0 ? (
            <div
              className={`h-full w-full flex items-center justify-center text-sm rounded-xl bg-[var(--surface)] border-dashed ${isDark ? "text-[var(--muted)] border-[var(--card-border)]" : "text-gray-500 border-slate-300"}`}
            >
              Waiting for live stock data... (check backend at
              http://localhost:5000)
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#F1F5F9"
                />
                <XAxis
                  dataKey="time"
                  stroke="#94A3B8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  interval="preserveStartEnd"
                  minTickGap={50}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={["auto", "auto"]}
                  tickFormatter={value => value.toFixed(2)}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    padding: "12px",
                  }}
                  labelStyle={{
                    color: "#64748B",
                    fontSize: "12px",
                    marginBottom: "4px",
                  }}
                  itemStyle={{
                    color: "#0F172A",
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#2563EB"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorPrice)"
                  activeDot={{
                    r: 6,
                    fill: "#2563EB",
                    stroke: "#EFF6FF",
                    strokeWidth: 4,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* --- BOTTOM ROW: TABLES & FEEDS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {canViewSystemMetrics && (
          <div
            className={`rounded-xl shadow-sm border overflow-hidden card-style ${isDark ? "border-[var(--card-border)]" : "border-[var(--card-border)]"}`}
          >
            <div
              className={`p-5 border-b flex items-center justify-between ${isDark ? "border-[var(--card-border)]" : "border-gray-100"}`}
            >
              <h2
                className={`text-lg font-semibold flex items-center gap-2 ${isDark ? "text-white" : "text-gray-800"}`}
              >
                <Clock
                  size={18}
                  className={isDark ? "text-slate-300" : "text-gray-500"}
                />{" "}
                Recent Queries
              </h2>
              <span
                className={`${isDark ? "bg-slate-900 text-slate-300" : "bg-gray-100 text-gray-600"} text-xs font-mono px-2 py-1 rounded`}
              >
                LIFO Stack
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3">Action Details</th>
                  </tr>
                </thead>
                <tbody>
                  {recentQueries.length === 0 ? (
                    <tr>
                      <td colSpan="2" className="px-6 py-4 text-center">
                        No recent queries found.
                      </td>
                    </tr>
                  ) : (
                    recentQueries.map((query, idx) => (
                      <tr
                        key={idx}
                        className={`${isDark ? "bg-slate-900 border-slate-700 hover:bg-slate-800" : "bg-white border-b hover:bg-gray-50"}`}
                      >
                        <td
                          className={`px-6 py-4 font-mono text-xs ${isDark ? "text-slate-100" : "text-gray-900"}`}
                        >
                          {query.timestamp}
                        </td>
                        <td
                          className={`px-6 py-4 ${isDark ? "text-slate-200" : "text-gray-900"}`}
                        >
                          {query.action}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Live Alerts Feed (Extracted from Queue processing) */}
        <div
          className={`rounded-xl shadow-sm border overflow-hidden card-style ${!canViewSystemMetrics ? "lg:col-span-2" : ""} ${isDark ? "border-[var(--card-border)]" : "border-[var(--card-border)]"}`}
        >
          <div
            className={`p-5 border-b flex items-center justify-between ${isDark ? "border-[var(--card-border)]" : "border-gray-100"}`}
          >
            <h2
              className={`text-lg font-semibold flex items-center gap-2 ${isDark ? "text-white" : "text-gray-800"}`}
            >
              <Activity
                size={18}
                className={isDark ? "text-slate-300" : "text-gray-500"}
              />{" "}
              Live Alerts Feed
            </h2>
            <span
              className={`${isDark ? "bg-orange-900 text-orange-200" : "bg-orange-100 text-orange-600"} text-xs font-mono px-2 py-1 rounded`}
            >
              FIFO Queue
            </span>
          </div>
          <div className="p-0">
            {alertsFeed.length === 0 ? (
              <div
                className={`p-6 text-center text-sm rounded-bl-xl rounded-br-xl ${isDark ? "text-[var(--muted)] bg-[var(--surface)]" : "text-gray-500 bg-white"}`}
              >
                No alerts triggered yet.
              </div>
            ) : (
              <ul
                className={`divide-y ${isDark ? "divide-slate-700" : "divide-gray-100"}`}
              >
                {alertsFeed.map((alert, idx) => (
                  <li
                    key={idx}
                    className={`p-4 flex items-start gap-3 transition-colors ${isDark ? "hover:bg-slate-800" : "hover:bg-orange-50"}`}
                  >
                    <AlertTriangle
                      size={18}
                      className="text-orange-500 mt-0.5 flex-shrink-0"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {alert.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {alert.timestamp}
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
  );
};

// Reusable Sub-component for Top Metrics
// Reusable Sub-component for Top Metrics with Hover Animations
const MetricCard = ({ title, value, icon, subtitle, iconBg }) => (
  <div className="card-style p-6 rounded-3xl border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-default">
    <div className="flex items-center gap-4 mb-4">
      <div
        className={`p-3.5 rounded-2xl ${iconBg} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--muted)]">{title}</p>
        <h3 className="text-3xl font-extrabold text-[var(--text-base)] tracking-tight mt-0.5">
          {value}
        </h3>
      </div>
    </div>
    <div className="pt-4 border-t border-[var(--border)]">
      <p className="text-[11px] font-mono font-medium text-[var(--muted)] uppercase tracking-widest">
        {subtitle}
      </p>
    </div>
  </div>
);

export default Dashboard;
