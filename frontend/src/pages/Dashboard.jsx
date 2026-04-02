import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  Clock,
  Database,
  Search,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import api from "../services/api";

const chartStageLabels = [
  "INGEST",
  "PARSE",
  "QUERY",
  "CACHE",
  "ANALYZE",
  "ALERT",
  "AUDIT",
];

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
    usersOnline: 1,
  });
  const [alertsFeed, setAlertsFeed] = useState([]);
  const [recentQueries, setRecentQueries] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [selectedStock, setSelectedStock] = useState("AAPL");
  const [isClearingQueries, setIsClearingQueries] = useState(false);
  const [clearedQueriesAt, setClearedQueriesAt] = useState(null);
  const [tenants, setTenants] = useState([]);
  const closedPlaybackIndexRef = useRef(0);

  const mapHistoryToChartPoints = history => {
    return history.map(point => ({
      time: point.date,
      date: point.date,
      open: Number(point.open_price),
      close: Number(point.close_price),
      high: Number(point.high_price),
      low: Number(point.low_price),
    }));
  };

  const parseAuditTimestamp = timestamp => {
    const parsed = new Date((timestamp || "").replace(" ", "T"));
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem("token");
      try {
        const summaryRes = await api.get("/stocks/summary");
        const stocksCount = Object.keys(summaryRes.data).length;

        const alertsRes = await api.get("/alerts");
        const activeAlertsCount = alertsRes.data.configured_alerts.filter(
          alert => alert.status === "active",
        ).length;

        let queries = [];
        let tenantList = [];
        if (token) {
          try {
            const logsRes = await api.get("/logs?limit=50");
            queries = logsRes.data.logs
              .filter(log => log.action.includes("Queried"))
              .filter(log =>
                clearedQueriesAt
                  ? parseAuditTimestamp(log.timestamp) > clearedQueriesAt
                  : true,
              )
              .slice(0, 5);
          } catch {
            queries = [];
          }

          if (
            normalizedRole === "SUPER_ADMIN" ||
            normalizedRole === "SUPER ADMIN"
          ) {
            try {
              const tenantsRes = await api.get("/admin/tenants");
              tenantList = tenantsRes.data || [];
            } catch {
              tenantList = [];
            }
          }
        }

        setMetrics(prev => ({
          ...prev,
          totalStocks: stocksCount,
          activeAlerts: activeAlertsCount,
          totalQueries: queries.length * 12,
        }));

        setAlertsFeed(alertsRes.data.triggered_feed.slice(0, 4));
        setRecentQueries(queries);
        setTenants(tenantList);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, [clearedQueriesAt]);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const response = await api.get("/stocks/live");
        const liveData = response.data?.data || {};
        const marketStatus = String(response.data?.status || "").toUpperCase();
        const stockPoint =
          liveData[selectedStock] || Object.values(liveData)[0];

        if (!stockPoint) return;

        if (marketStatus === "CLOSED") {
          const historyRes = await api.get(
            `/stocks/history?stock_id=${selectedStock}&limit=60`,
          );
          const historyData = historyRes.data?.data || [];
          if (historyData.length > 0) {
            const historyPoints = mapHistoryToChartPoints(historyData);
            setChartData(() => {
              if (historyPoints.length <= 1) {
                return historyPoints;
              }

              // Rotate the historical series to keep CLOSED mode visually active.
              const start =
                closedPlaybackIndexRef.current % historyPoints.length;
              const rotated = [
                ...historyPoints.slice(start),
                ...historyPoints.slice(0, start),
              ];
              closedPlaybackIndexRef.current =
                (closedPlaybackIndexRef.current + 1) % historyPoints.length;
              return rotated;
            });
          }
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
              open: Number(stockPoint.open_price),
              close: Number(stockPoint.close_price),
              high: Number(stockPoint.high_price),
              low: Number(stockPoint.low_price),
            },
          ];
          return next.slice(-60);
        });
      } catch (error) {
        console.error("Error fetching chart data:", error);
      }
    };

    setChartData([]);
    closedPlaybackIndexRef.current = 0;
    fetchChartData();
    const interval = setInterval(fetchChartData, 3000);
    return () => clearInterval(interval);
  }, [selectedStock]);

  const candleSeries = chartData.slice(-7);

  const handleClearRecentQueries = () => {
    if (isClearingQueries || recentQueries.length === 0) return;

    setIsClearingQueries(true);
    try {
      setClearedQueriesAt(Date.now());
      setRecentQueries([]);
      setMetrics(prev => ({
        ...prev,
        totalQueries: 0,
      }));
    } finally {
      setIsClearingQueries(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="overflow-hidden rounded-[34px] border border-white/70 bg-[#eee8ff] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-7">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Portfolio Balance
                </p>
                <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                  {metrics.totalQueries.toLocaleString()}.
                  {String(metrics.activeAlerts).padStart(2, "0")}
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-7 text-slate-600">
                  Product-grade command center for ingestion, analytics, alerts,
                  and audits.
                </p>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg">
                <Sparkles size={15} />
                {chartData.length || 0} live modules
              </div>
            </div>

            <div className="rounded-[28px] border border-white/60 bg-white/35 p-4 md:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Stock Activity
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    {selectedStock} live tick stream
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Live tick stream from the generation engine (rolling 60
                    points)
                  </p>
                </div>

                <div className="relative">
                  <select
                    value={selectedStock}
                    onChange={e => setSelectedStock(e.target.value)}
                    className="appearance-none rounded-full border border-white/70 bg-white/85 px-4 py-2.5 pr-10 text-sm font-semibold text-slate-800 shadow-sm outline-none transition hover:bg-white"
                  >
                    <option value="AAPL">AAPL</option>
                    <option value="TSLA">TSLA</option>
                    <option value="MSFT">MSFT</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                    <svg
                      className="h-4 w-4 fill-current"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="mt-5 h-[280px]">
                {chartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-slate-300/70 bg-white/40 text-sm text-slate-500">
                    Waiting for live stock data... (check backend at
                    http://localhost:5000)
                  </div>
                ) : (
                  <DashboardActivityChart data={chartData} />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <MetricCard
            title="Total Stocks Stored"
            value={metrics.totalStocks}
            trend="+4.8%"
            subtitle="Hash map storage"
            icon={<Database size={18} />}
            tone="sky"
          />
          <MetricCard
            title="Active Alerts"
            value={metrics.activeAlerts}
            trend="+1.2%"
            subtitle="Queue-based signals"
            icon={<AlertTriangle size={18} />}
            tone="amber"
          />
          {canViewSystemMetrics && (
            <MetricCard
              title="Queries Today"
              value={metrics.totalQueries}
              trend="+3.2%"
              subtitle="Lookup activity"
              icon={<Search size={18} />}
              tone="violet"
            />
          )}
          {isAdminOrSuper && (
            <MetricCard
              title="Users Online"
              value={metrics.usersOnline}
              trend="+0.6%"
              subtitle="Live user presence"
              icon={<Users size={18} />}
              tone="emerald"
            />
          )}
        </div>
      </section>

      <LiveMarketTicker />

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.8fr]">
        <div className="rounded-[32px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Main Analytics
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                System activity and workflow health
              </h2>
            </div>
            <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs font-semibold text-slate-500">
              <span className="rounded-full bg-white px-4 py-2 text-slate-900 shadow-sm">
                24h
              </span>
              <span className="px-4 py-2">7d</span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {chartStageLabels.map((label, index) => (
              <StageCard
                key={label}
                label={label}
                index={index}
                point={candleSeries[index]}
              />
            ))}
          </div>

          <div className="mt-6 rounded-[28px] bg-[#f8f7f2] p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Recent Queries
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  Latest stack events
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {isAdminOrSuper && (
                  <button
                    type="button"
                    onClick={handleClearRecentQueries}
                    disabled={isClearingQueries || recentQueries.length === 0}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                  >
                    <Trash2 size={13} />
                    {isClearingQueries ? "Clearing" : "Clear stack"}
                  </button>
                )}
                <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-sm">
                  LIFO stack
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {recentQueries.length === 0 ? (
                <EmptyRow
                  title="No recent queries found"
                  subtitle="Query events will appear here once users search the stock store."
                />
              ) : (
                recentQueries.map((query, index) => (
                  <div
                    key={`${query.timestamp}-${index}`}
                    className="flex flex-col gap-3 rounded-[24px] bg-white px-5 py-4 shadow-sm ring-1 ring-slate-100 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-[#efe8ff] p-3 text-violet-700">
                        <Search size={16} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {query.action}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Executed through the query engine
                        </p>
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-500">
                      <Clock size={14} />
                      {query.timestamp}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {normalizedRole === "SUPER_ADMIN" ||
          normalizedRole === "SUPER ADMIN" ? (
            <div className="rounded-[32px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Active Tenants
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-slate-900">
                    Tenant registry snapshot
                  </h3>
                </div>
                <span className="rounded-full bg-[#eef7ff] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-900">
                  {tenants.filter(tenant => tenant.status === "active").length}{" "}
                  active
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {tenants.length === 0 ? (
                  <EmptyRow
                    title="No tenants available"
                    subtitle="Tenant records will appear here for super admins once the registry is loaded."
                  />
                ) : (
                  tenants.slice(0, 4).map(tenant => (
                    <div
                      key={tenant.id}
                      className="flex items-center justify-between rounded-[24px] bg-[#f8f7f2] px-5 py-4 shadow-sm ring-1 ring-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-white p-3 text-sky-700 shadow-sm">
                          <Building2 size={17} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {tenant.name}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {tenant.id}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${
                          tenant.status === "active"
                            ? "bg-[#ecfff1] text-emerald-800"
                            : "bg-[#fff1f2] text-rose-800"
                        }`}
                      >
                        {tenant.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

          <div className="relative overflow-hidden rounded-[32px] bg-[#17181c] text-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
            <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full border border-white/10" />
            <div className="absolute -left-6 bottom-10 h-24 w-24 rounded-full bg-white/[0.03]" />
            <div className="relative p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Optimize Query Performance
              </p>
              <h3 className="mt-3 max-w-xs text-3xl font-bold leading-tight">
                Reduce lookup friction across your live stock platform.
              </h3>
              <p className="mt-3 max-w-sm text-sm leading-7 text-slate-400">
                Balance ingestion speed, cache freshness, and alert visibility
                with one polished operations surface.
              </p>
              <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#a9dafc] via-[#c9c8ff] to-[#ffe59d] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5">
                Explore performance tips
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Live Alerts Feed
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  Queue activity
                </h3>
              </div>
              <span className="rounded-full bg-[#fff7e6] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-900">
                FIFO queue
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {alertsFeed.length === 0 ? (
                <EmptyRow
                  title="No alerts triggered yet"
                  subtitle="Configured thresholds will surface here when market conditions match."
                />
              ) : (
                alertsFeed.map((alert, index) => (
                  <div
                    key={`${alert.timestamp}-${index}`}
                    className="rounded-[24px] bg-[#fff8ef] px-5 py-4 shadow-sm ring-1 ring-amber-100"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-white p-3 text-orange-500 shadow-sm">
                        <AlertTriangle size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">
                          {alert.message}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {alert.timestamp}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const MetricCard = ({ title, value, trend, subtitle, icon, tone }) => {
  const tones = {
    sky: "bg-[#dce8f5] text-sky-950",
    amber: "bg-[#f6ecc7] text-amber-950",
    violet: "bg-[#e4dcf2] text-violet-950",
    emerald: "bg-[#dcf6df] text-emerald-950",
  };

  return (
    <div
      className={`rounded-[28px] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-1 ${tones[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-2xl bg-white/75 p-3 shadow-sm">{icon}</div>
        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold">
          {trend}
        </span>
      </div>
      <p className="mt-8 text-sm font-semibold uppercase tracking-[0.16em] opacity-60">
        {title}
      </p>
      <div className="mt-2 text-4xl font-bold tracking-tight">{value}</div>
      <p className="mt-2 text-sm opacity-70">{subtitle}</p>
    </div>
  );
};

const DashboardActivityChart = ({ data }) => {
  return (
    <div className="h-full w-full rounded-[22px] bg-gradient-to-b from-white/30 to-white/10 px-2 py-2">
      <div className="h-full min-h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 16, right: 16, left: -14, bottom: 14 }}
          >
            <defs>
              <filter id="dashboardLineGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient
                id="dashboardOrangeFill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#d97706" stopOpacity="0.24" />
                <stop offset="65%" stopColor="#d97706" stopOpacity="0.11" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.03" />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="rgba(148,163,184,0.16)"
              strokeDasharray="3 5"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              minTickGap={42}
              stroke="#94a3b8"
              fontSize={11}
            />
            <YAxis
              dataKey="close"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              width={48}
              stroke="#94a3b8"
              fontSize={11}
              domain={["auto", "auto"]}
              tickFormatter={value => value.toFixed(2)}
            />
            <Tooltip
              labelFormatter={label => `Time ${label}`}
              formatter={(value, name, entry) => {
                if (!entry?.payload) return value;
                const { close, open, high, low } = entry.payload;
                return [
                  `Close ${close.toFixed(2)} | Open ${open.toFixed(2)} | High ${high.toFixed(2)} | Low ${low.toFixed(2)}`,
                  "Price",
                ];
              }}
              contentStyle={{
                borderRadius: "16px",
                border: "1px solid rgba(255,255,255,0.7)",
                backgroundColor: "rgba(255,255,255,0.96)",
                boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
                padding: "12px",
              }}
              labelStyle={{
                color: "#64748b",
                fontSize: "12px",
                marginBottom: "4px",
              }}
              itemStyle={{
                color: "#0f172a",
                fontWeight: 700,
                fontSize: "13px",
              }}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke="#d97706"
              strokeWidth={3}
              fill="url(#dashboardOrangeFill)"
              fillOpacity={1}
              dot={false}
              activeDot={{
                r: 5,
                fill: "#ffffff",
                stroke: "#d97706",
                strokeWidth: 3,
              }}
              filter="url(#dashboardLineGlow)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const StageCard = ({ label, index, point }) => {
  const pastelTones = [
    "bg-[#eaf5ff]",
    "bg-[#fff5cc]",
    "bg-[#efe8ff]",
    "bg-[#dcf6df]",
    "bg-[#fce7f3]",
    "bg-[#fff1e6]",
    "bg-[#e6f8f1]",
  ];
  const tone = pastelTones[index % pastelTones.length];

  return (
    <div className={`rounded-[24px] p-4 shadow-sm ${tone}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </p>
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-900/70" />
      </div>
      <div className="mt-5 flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-slate-900">
            {point ? point.close.toFixed(2) : "--"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {point ? point.time : "Waiting for tick"}
          </p>
        </div>
        <div className="rounded-2xl bg-white/80 p-3 text-slate-700 shadow-sm">
          <Activity size={18} />
        </div>
      </div>
    </div>
  );
};

const EmptyRow = ({ title, subtitle }) => (
  <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-5 py-8 text-center shadow-sm">
    <p className="font-semibold text-slate-700">{title}</p>
    <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
  </div>
);

export default Dashboard;
