import axios from "axios";
import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle,
  Database,
  PlusCircle,
} from "lucide-react";
import { useState } from "react";

const StockIngestion = () => {
  const [formData, setFormData] = useState({
    stock_id: "",
    date: new Date().toISOString().split("T")[0],
    open_price: "",
    close_price: "",
    high_price: "",
    low_price: "",
    volume: "",
  });

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

  const handleChange = e => {
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
    if (sortConfig.key === key && sortConfig.direction === "asc")
      direction = "desc";
    setSortConfig({ key, direction });
  };

  const sortedRecords = [...records].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key])
      return sortConfig.direction === "asc" ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key])
      return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  // Premium Fintech Input Classes
  const inputBase =
    "w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-3 transition-all shadow-sm";

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Data Ingestion Engine
        </h1>
        <p className="text-slate-500 font-medium mt-1">
          Insert daily stock records directly into the O(1) Hash Map.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --- FORM SECTION --- */}
        <div className="lg:col-span-1 bg-white p-7 rounded-3xl shadow-sm border border-slate-200/60 transition-shadow hover:shadow-md h-fit">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <Database size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Record Entry</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Stock ID
                </label>
                <input
                  required
                  type="text"
                  name="stock_id"
                  value={formData.stock_id}
                  onChange={handleChange}
                  placeholder="e.g., AAPL"
                  className={`${inputBase} uppercase font-semibold placeholder:font-normal placeholder:normal-case`}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Trade Date
                </label>
                <input
                  required
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className={inputBase}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Open
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  name="open_price"
                  value={formData.open_price}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={inputBase}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Close
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  name="close_price"
                  value={formData.close_price}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={inputBase}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  High
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  name="high_price"
                  value={formData.high_price}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={inputBase}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Low
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  name="low_price"
                  value={formData.low_price}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={inputBase}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
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
              className="w-full mt-6 flex items-center justify-center gap-2 text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 font-semibold rounded-xl text-sm px-5 py-3.5 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none active:scale-[0.98]"
            >
              <PlusCircle size={18} />
              {isLoading ? "Ingesting to RAM..." : "Commit to Memory"}
            </button>
          </form>

          {/* STATUS MESSAGES */}
          {status.message && (
            <div
              className={`mt-5 p-4 rounded-xl text-sm flex flex-col gap-2 border animate-in slide-in-from-bottom-2 ${status.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"}`}
            >
              <div className="flex items-center gap-2 font-bold">
                {status.type === "success" ? (
                  <CheckCircle size={18} className="text-emerald-600" />
                ) : (
                  <AlertCircle size={18} className="text-rose-600" />
                )}
                {status.message}
              </div>
              {status.complexity && (
                <div className="font-mono text-xs bg-white py-1.5 px-3 rounded-lg w-fit border shadow-sm mt-1">
                  {status.complexity}
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- TABLE SECTION --- */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col transition-shadow hover:shadow-md">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Session Ledger</h2>
            <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-md uppercase tracking-widest border border-slate-200">
              Local State
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50 border-b border-slate-100">
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
                        className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort(key)}
                      >
                        <div className="flex items-center gap-1.5">
                          {col}{" "}
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
                    <td
                      colSpan="7"
                      className="px-6 py-16 text-center text-slate-400"
                    >
                      <Database
                        size={40}
                        className="mx-auto text-slate-200 mb-4 stroke-[1.5]"
                      />
                      <p className="font-medium text-slate-500">
                        No data ingested in this session yet.
                      </p>
                      <p className="text-xs mt-1">
                        Submit the form to visualize O(1) storage.
                      </p>
                    </td>
                  </tr>
                ) : (
                  sortedRecords.map(record => (
                    <tr
                      key={record.id}
                      className="bg-white border-b border-slate-50 hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4 font-extrabold text-slate-900 uppercase">
                        {record.stock_id}
                      </td>
                      <td className="px-6 py-4 font-medium">{record.date}</td>
                      <td className="px-6 py-4 font-mono font-medium">
                        ${Number(record.open_price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        ${Number(record.close_price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 font-mono font-medium">
                        ${Number(record.high_price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 font-mono font-medium">
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
      </div>
    </div>
  );
};

export default StockIngestion;
