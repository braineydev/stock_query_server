import axios from "axios";
import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle,
  Database,
  PlusCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { formatDateDisplay, parseDisplayDateToIso } from "../utils/date";

const defaultStockOptions = ["AAPL", "MSFT", "TSLA"];

const StockIngestion = () => {
  const [formData, setFormData] = useState({
    stock_id: "AAPL",
    date: new Date().toISOString().split("T")[0],
    open_price: "",
    close_price: "",
    high_price: "",
    low_price: "",
    volume: "",
  });
  const [displayDate, setDisplayDate] = useState(
    formatDateDisplay(new Date().toISOString().split("T")[0]),
  );

  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState({
    type: "",
    message: "",
    complexity: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: "date",
    direction: "desc",
  });
  const [availableStockIds, setAvailableStockIds] = useState(defaultStockOptions);

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

  const handleChange = e => {
    if (e.target.name === "date") {
      setDisplayDate(e.target.value);
      setFormData({
        ...formData,
        date: parseDisplayDateToIso(e.target.value),
      });
      return;
    }

    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setIsLoading(true);
    setStatus({ type: "", message: "", complexity: "" });

    try {
      const response = await axios.post(
        "http://localhost:5000/api/stocks/ingest",
        formData,
      );
      setStatus({
        type: "success",
        message: response.data.message,
        complexity: "Insertion Complexity: O(1) via Hash Map",
      });
      setRecords(prev => [...prev, { ...formData, id: Date.now() }]);
      setFormData(prev => ({
        ...prev,
        open_price: "",
        close_price: "",
        high_price: "",
        low_price: "",
        volume: "",
      }));
    } catch (error) {
      setStatus({
        type: "error",
        message: error.response?.data?.error || "Failed to ingest data.",
        complexity: "",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = key => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedRecords = [...records].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === "asc" ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  const inputBase =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100";

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="rounded-[32px] border border-slate-200/80 bg-[#fcfbf7] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              Ingestion Engine
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Data Ingestion
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Insert daily OHLCV records into the stock store with a calmer,
              dashboard-style workflow.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <InfoBadge label="Structure" value="Hash Map" tone="sky" />
            <InfoBadge label="Session Rows" value={`${records.length}`} tone="emerald" />
            <InfoBadge label="Write Cost" value="O(1)" tone="violet" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#eaf5ff] p-3">
              <Database className="text-sky-700" size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Record Entry
              </p>
              <h2 className="text-xl font-bold text-slate-900">New Candle</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Stock ID
                </label>
                <select
                  required
                  name="stock_id"
                  value={formData.stock_id}
                  onChange={handleChange}
                  className={inputBase}
                >
                  {availableStockIds.map(stockId => (
                    <option key={stockId} value={stockId}>
                      {stockId}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Trade Date
                </label>
                <input
                  required
                  type="text"
                  name="date"
                  value={displayDate}
                  onChange={handleChange}
                  placeholder="dd/mm/yyyy"
                  inputMode="numeric"
                  pattern="\d{2}/\d{2}/\d{4}"
                  className={inputBase}
                />
              </div>

              {[
                ["open_price", "Open"],
                ["close_price", "Close"],
                ["high_price", "High"],
                ["low_price", "Low"],
              ].map(([name, label]) => (
                <div key={name}>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    {label}
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    name={name}
                    value={formData[name]}
                    onChange={handleChange}
                    placeholder="0.00"
                    className={inputBase}
                  />
                </div>
              ))}

              <div className="col-span-2">
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Volume
                </label>
                <input
                  required
                  type="number"
                  name="volume"
                  value={formData.volume}
                  onChange={handleChange}
                  placeholder="e.g., 1000000"
                  className={inputBase}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-50"
            >
              <PlusCircle size={18} />
              {isLoading ? "Ingesting to Memory..." : "Commit Record"}
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
                  <AlertCircle size={18} className="text-rose-600" />
                )}
                {status.message}
              </div>
              {status.complexity && (
                <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1.5 font-mono text-xs font-semibold ring-1 ring-black/5">
                  {status.complexity}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-[28px] bg-white shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Session Ledger
              </p>
              <h2 className="text-xl font-bold text-slate-900">
                Recently Added Records
              </h2>
            </div>
            <div className="rounded-full bg-[#f3f8ff] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-900">
              Local Preview
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  {[
                    "Stock ID",
                    "Date",
                    "Open",
                    "Close",
                    "High",
                    "Low",
                    "Volume",
                  ].map(col => {
                    const key = col.toLowerCase().replace(" ", "_");
                    return (
                      <th
                        key={col}
                        className="cursor-pointer px-6 py-4 transition hover:bg-slate-100"
                        onClick={() => handleSort(key)}
                      >
                        <div className="flex items-center gap-1.5">
                          {col}
                          <ArrowUpDown size={14} className="text-slate-400" />
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedRecords.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-20 text-center">
                      <Database
                        size={40}
                        className="mx-auto mb-4 text-slate-200"
                      />
                      <p className="font-medium text-slate-500">
                        No data ingested in this session yet.
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Submit the form to preview new rows in the dashboard
                        ledger.
                      </p>
                    </td>
                  </tr>
                ) : (
                  sortedRecords.map(record => (
                    <tr
                      key={record.id}
                      className="border-t border-slate-100 bg-white transition hover:bg-[#fcfbf7]"
                    >
                      <td className="px-6 py-4 font-bold uppercase text-slate-900">
                        {record.stock_id}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {formatDateDisplay(record.date)}
                      </td>
                      <td className="px-6 py-4 font-mono">
                        ${Number(record.open_price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold text-slate-900">
                        ${Number(record.close_price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 font-mono">
                        ${Number(record.high_price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 font-mono">
                        ${Number(record.low_price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500">
                        {Number(record.volume).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

const InfoBadge = ({ label, value, tone }) => {
  const tones = {
    sky: "bg-[#eaf5ff] text-sky-900",
    emerald: "bg-[#ecfff1] text-emerald-900",
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

export default StockIngestion;
