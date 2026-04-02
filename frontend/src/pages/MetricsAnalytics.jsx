import axios from "axios";
import {
  Activity,
  AlertCircle,
  BarChart2,
  Clock,
  Settings,
  TrendingUp,
  Zap,
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
import { formatDateDisplay } from "../utils/date";

const defaultStockOptions = ["AAPL", "MSFT", "TSLA"];

const MetricsAnalytics = () => {
  const [config, setConfig] = useState({
    stock_id: "AAPL",
    window_size: 14,
    metric_type: "average",
  });

  const [chartData, setChartData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [availableStockIds, setAvailableStockIds] =
    useState(defaultStockOptions);

  const handleInputChange = e => {
    const { name, value } = e.target;
    setConfig({
      ...config,
      [name]:
        name === "window_size" ? parseInt(value) || "" : value.toUpperCase(),
    });
  };

  const handleSelectChange = e => {
    setConfig({ ...config, metric_type: e.target.value });
  };

  useEffect(() => {
    const fetchAvailableStocks = async () => {
      try {
        const response = await axios.get(
          "http://localhost:5000/api/stocks/summary",
        );
        const ids = Array.from(
          new Set([
            ...defaultStockOptions,
            ...Object.keys(response.data || {}),
          ]),
        ).sort();
        setAvailableStockIds(ids);
        setConfig(prev => ({
          ...prev,
          stock_id: ids.includes(prev.stock_id)
            ? prev.stock_id
            : ids[0] || "AAPL",
        }));
      } catch (error) {
        console.error("Failed to fetch stock IDs:", error);
        setAvailableStockIds(defaultStockOptions);
      }
    };

    fetchAvailableStocks();
  }, []);

  const fetchAnalytics = async e => {
    e.preventDefault();
    if (!config.stock_id || !config.window_size) return;

    setIsLoading(true);
    setError("");
    setChartData([]);
    setMeta(null);

    try {
      const response = await axios.get(
        "http://localhost:5000/api/stocks/analytics",
        {
          params: {
            stock_id: config.stock_id,
            window_size: config.window_size,
            metric_type: config.metric_type.toLowerCase(),
          },
        },
      );

      setChartData(response.data.data);
      setMeta(response.data.meta);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to fetch analytics. Ensure data exists.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getChartColor = () => {
    if (config.metric_type === "average") return "#3B82F6";
    if (config.metric_type === "maximum") return "#10B981";
    return "#F43F5E";
  };

  const inputBase =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100";

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="rounded-[32px] border border-slate-200/80 bg-[#fcfbf7] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              Analytics Studio
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Metrics Analytics
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Explore sliding-window behavior with a softer dashboard shell and
              clearer computational status.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricPill
              label="Window"
              value={`${config.window_size} days`}
              tone="sky"
            />
            <MetricPill
              label="Algorithm"
              value={config.metric_type}
              tone="violet"
            />
            <MetricPill label="Engine" value="Deque / Heap" tone="amber" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#eaf5ff] p-3">
              <Settings className="text-sky-700" size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Parameters
              </p>
              <h2 className="text-xl font-bold text-slate-900">
                Configure Run
              </h2>
            </div>
          </div>

          <form onSubmit={fetchAnalytics} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Stock ID
              </label>
              <select
                required
                name="stock_id"
                value={config.stock_id}
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
                Window Size
              </label>
              <input
                required
                type="number"
                min="2"
                name="window_size"
                value={config.window_size}
                onChange={handleInputChange}
                className={inputBase}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Algorithm
              </label>
              <select
                value={config.metric_type}
                onChange={handleSelectChange}
                className={inputBase}
              >
                <option value="average">Rolling Average (Deque)</option>
                <option value="maximum">Rolling Maximum (MaxHeap)</option>
                <option value="minimum">Rolling Minimum (MinHeap)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-50"
            >
              <Activity size={18} />
              {isLoading ? "Computing..." : "Generate Chart"}
            </button>
          </form>
        </div>

        <div className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-[#f7f4ff] p-3">
                <BarChart2 size={22} className="text-violet-700" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Visualization
                </p>
                <h2 className="text-xl font-bold uppercase tracking-tight text-slate-900">
                  {config.stock_id}
                </h2>
                <p className="text-sm capitalize text-slate-500">
                  {config.window_size}-day rolling {config.metric_type}
                </p>
              </div>
            </div>

            {meta && (
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
                  <Clock size={14} className="text-slate-500" />
                  <span className="font-mono font-semibold">
                    {meta.execution_time_ms} ms
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-[#eef4ff] px-4 py-2 text-sm text-sky-800">
                  <Zap size={14} className="text-sky-600" />
                  <span className="font-mono font-semibold">
                    {meta.complexity_note}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="relative h-[520px] bg-[#fcfbf7] p-7">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-sky-600" />
                <p className="mt-4 font-mono text-sm text-slate-600">
                  Executing sliding-window algorithm...
                </p>
              </div>
            )}

            {error && !isLoading && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="rounded-full bg-rose-100 p-4">
                  <AlertCircle size={38} className="text-rose-500" />
                </div>
                <p className="mt-4 font-semibold text-rose-700">{error}</p>
              </div>
            )}

            {!error && chartData.length === 0 && !isLoading && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="rounded-full bg-slate-100 p-5">
                  <TrendingUp size={40} className="text-slate-400" />
                </div>
                <p className="mt-4 font-medium text-slate-600">
                  Configure parameters to generate the algorithmic chart.
                </p>
              </div>
            )}

            {chartData.length > 0 && !isLoading && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="colorMetric"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={getChartColor()}
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="95%"
                        stopColor={getChartColor()}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E2E8F0"
                  />
                  <XAxis
                    dataKey="date"
                    stroke="#94A3B8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={12}
                    tickFormatter={value => formatDateDisplay(value)}
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
                    labelFormatter={label => formatDateDisplay(label)}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 14px 40px rgba(15, 23, 42, 0.08)",
                      padding: "12px",
                      backgroundColor: "#ffffff",
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
                    dataKey="value"
                    stroke={getChartColor()}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorMetric)"
                    activeDot={{
                      r: 6,
                      fill: getChartColor(),
                      stroke: "#FFFFFF",
                      strokeWidth: 3,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

const MetricPill = ({ label, value, tone }) => {
  const tones = {
    sky: "bg-[#dce8f5] text-sky-900",
    amber: "bg-[#f6ecc7] text-amber-900",
    violet: "bg-[#e4dcf2] text-violet-900",
  };

  return (
    <div className={`rounded-[24px] px-5 py-4 shadow-sm ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-60">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold capitalize">{value}</p>
    </div>
  );
};

export default MetricsAnalytics;
