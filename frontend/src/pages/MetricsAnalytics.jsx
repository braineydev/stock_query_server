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
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
    if (config.metric_type === "average") return "#3B82F6"; // Blue
    if (config.metric_type === "maximum") return "#10B981"; // Emerald
    return "#F43F5E"; // Rose
  };

  const inputBase =
    "w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-3 transition-all shadow-sm";

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Metrics Analytics
        </h1>
        <p className="text-slate-500 font-medium mt-1">
          Visualize sliding window algorithms using Deques and Priority Queues.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* --- CONTROLS SIDEBAR --- */}
        <div className="lg:col-span-1 bg-white p-7 rounded-3xl shadow-sm border border-slate-200/60 transition-shadow hover:shadow-md h-fit">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <Settings size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Parameters</h2>
          </div>

          <form onSubmit={fetchAnalytics} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Stock ID
              </label>
              <input
                required
                type="text"
                name="stock_id"
                value={config.stock_id}
                onChange={handleInputChange}
                placeholder="AAPL"
                className={`${inputBase} uppercase placeholder:normal-case placeholder:font-normal`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Window (Days)
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
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Algorithm
              </label>
              <div className="relative">
                <select
                  value={config.metric_type}
                  onChange={handleSelectChange}
                  className={`${inputBase} appearance-none cursor-pointer pr-10`}
                >
                  <option value="average">Rolling Average (Deque)</option>
                  <option value="maximum">Rolling Maximum (MaxHeap)</option>
                  <option value="minimum">Rolling Minimum (MinHeap)</option>
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 flex items-center justify-center gap-2 text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 font-semibold rounded-xl text-sm px-5 py-3.5 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none active:scale-[0.98]"
            >
              <Activity size={18} />
              {isLoading ? "Computing..." : "Generate Chart"}
            </button>
          </form>
        </div>

        {/* --- VISUALIZATION AREA --- */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col h-[500px] transition-shadow hover:shadow-md">
            {/* Header Area with Badges */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <BarChart2 size={24} className="text-slate-600" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight">
                    {config.stock_id}
                  </h2>
                  <p className="text-sm text-slate-500 font-medium capitalize mt-0.5">
                    {config.window_size}-Day Rolling {config.metric_type}
                  </p>
                </div>
              </div>

              {meta && (
                <div className="flex gap-3">
                  <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-lg border border-slate-200 text-sm shadow-sm">
                    <Clock size={14} className="text-slate-500" />
                    <span className="font-mono font-semibold text-slate-700">
                      {meta.execution_time_ms} ms
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-indigo-50 px-3.5 py-1.5 rounded-lg border border-indigo-100 text-indigo-700 text-sm shadow-sm">
                    <Zap size={14} className="text-indigo-500" />
                    <span className="font-mono font-bold tracking-tight">
                      {meta.complexity_note}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 p-7 relative bg-slate-50/30">
              {isLoading && (
                <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-slate-600 font-mono font-medium text-sm">
                    Executing Sliding Window Algorithm...
                  </p>
                </div>
              )}

              {error && !isLoading && (
                <div className="h-full flex flex-col items-center justify-center text-rose-500">
                  <div className="p-4 bg-rose-50 rounded-full mb-4">
                    <AlertCircle size={40} className="text-rose-400" />
                  </div>
                  <p className="font-semibold text-rose-700">{error}</p>
                </div>
              )}

              {!error && chartData.length === 0 && !isLoading && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <TrendingUp
                    size={48}
                    className="mb-4 opacity-20 stroke-[1.5]"
                  />
                  <p className="font-medium text-slate-500">
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
                      stroke="#F1F5F9"
                    />
                    <XAxis
                      dataKey="date"
                      stroke="#94A3B8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={12}
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
        </div>
      </div>
    </div>
  );
};

export default MetricsAnalytics;
