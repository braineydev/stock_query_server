import axios from "axios";
import {
  AlertCircle,
  BarChart2,
  Clock,
  DollarSign,
  Search,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

const StockQuery = () => {
  const [query, setQuery] = useState({
    stock_id: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [result, setResult] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [availableStockIds, setAvailableStockIds] = useState([]);

  const handleInputChange = e => {
    const { name, value } = e.target;
    setQuery({
      ...query,
      [name]: name === "stock_id" ? value.toUpperCase() : value,
    });
  };

  useEffect(() => {
    const fetchAvailableStocks = async () => {
      try {
        const response = await axios.get(
          "http://localhost:5000/api/stocks/summary",
        );
        const ids = Object.keys(response.data || {}).sort();
        setAvailableStockIds(ids);

        if (!query.stock_id && ids.length > 0) {
          setQuery(prev => ({ ...prev, stock_id: ids[0] }));
        }
      } catch (err) {
        console.error("Failed to fetch stock IDs:", err);
        setAvailableStockIds([]);
      }
    };

    fetchAvailableStocks();
  }, []);

  const handleSearch = async e => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setResult(null);
    setMeta(null);

    try {
      const response = await axios.get(
        "http://localhost:5000/api/stocks/query",
        {
          params: {
            stock_id: query.stock_id,
            date: query.date,
          },
        },
      );

      setResult(response.data.data);
      setMeta(response.data.meta);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setError(err.response.data.error);
        setMeta({ complexity_note: err.response.data.complexity_note });
      } else {
        setError("An error occurred while communicating with the server.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to determine price direction between open and close
  const isPositive = result && result.close_price >= result.open_price;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Stock Query (C1)</h1>
        <p className="text-gray-500 mt-1">
          Retrieve exact daily records instantly using O(1) algorithmic lookups.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* --- QUERY FORM --- */}
        <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
            <Search className="text-purple-500" size={24} />
            <h2 className="text-lg font-semibold text-gray-800">
              Search Engine
            </h2>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock ID
              </label>
              <select
                required
                name="stock_id"
                value={query.stock_id}
                onChange={handleInputChange}
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 p-2.5"
              >
                <option value="" disabled>
                  Select stock ID
                </option>
                {availableStockIds.map(stockId => (
                  <option key={stockId} value={stockId}>
                    {stockId}
                  </option>
                ))}
              </select>
              {availableStockIds.length === 0 && (
                <p className="mt-2 text-xs text-amber-600">
                  No stock IDs available yet. Ingest data first.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Date
              </label>
              <input
                required
                type="date"
                name="date"
                value={query.date}
                onChange={handleInputChange}
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 p-2.5"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !query.stock_id || !query.date}
              className="w-full mt-4 flex items-center justify-center gap-2 text-white bg-purple-600 hover:bg-purple-700 focus:ring-4 focus:ring-purple-300 font-medium rounded-lg text-sm px-5 py-2.5 transition-colors disabled:opacity-50"
            >
              <Search size={18} />
              {isLoading ? "Searching..." : "Execute O(1) Query"}
            </button>
          </form>
        </div>

        {/* --- RESULTS AREA --- */}
        <div className="md:col-span-2 space-y-6">
          {/* Default Empty State */}
          {!result && !error && !isLoading && (
            <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 h-64 flex flex-col items-center justify-center text-gray-400">
              <Zap size={48} className="mb-4 text-gray-300" />
              <p>Enter a Stock ID and Date to measure query performance.</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-64 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
              <p className="text-gray-500 font-mono text-sm">
                Traversing Hash Map...
              </p>
            </div>
          )}

          {/* Error State (e.g., 404 Not Found) */}
          {error && !isLoading && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-red-800 flex flex-col items-center justify-center h-64">
              <AlertCircle size={40} className="mb-3 text-red-400" />
              <p className="font-semibold text-lg">{error}</p>
              <p className="text-sm mt-1 text-red-600">
                Ensure you have ingested data for this specific date.
              </p>
              {meta?.complexity_note && (
                <span className="mt-4 px-3 py-1 bg-white/60 text-red-700 rounded-md font-mono text-xs border border-red-200">
                  {meta.complexity_note}
                </span>
              )}
            </div>
          )}

          {/* Success Result State */}
          {result && !isLoading && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transform transition-all animate-fade-in-up">
              {/* Data Header */}
              <div className="bg-gray-900 p-6 text-white flex justify-between items-end">
                <div>
                  <div className="text-gray-400 text-sm font-medium mb-1">
                    {query.date}
                  </div>
                  <h2 className="text-4xl font-bold tracking-tight">
                    {query.stock_id}
                  </h2>
                </div>
                <div className="text-right">
                  <div className="text-gray-400 text-sm font-medium mb-1">
                    Close Price
                  </div>
                  <div className="text-3xl font-bold flex items-center justify-end gap-2">
                    ${result.close_price.toFixed(2)}
                    {isPositive ? (
                      <TrendingUp size={24} className="text-green-400" />
                    ) : (
                      <TrendingDown size={24} className="text-red-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100 border-b border-gray-100">
                <DataCell
                  label="Open"
                  value={`$${result.open_price.toFixed(2)}`}
                  icon={<DollarSign size={16} />}
                />
                <DataCell
                  label="High"
                  value={`$${result.high_price.toFixed(2)}`}
                  icon={<TrendingUp size={16} />}
                />
                <DataCell
                  label="Low"
                  value={`$${result.low_price.toFixed(2)}`}
                  icon={<TrendingDown size={16} />}
                />
                <DataCell
                  label="Volume"
                  value={result.volume.toLocaleString()}
                  icon={<BarChart2 size={16} />}
                />
              </div>

              {/* Performance Metrics Bar (Educational Requirement) */}
              <div className="bg-purple-50 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-800">
                  <Zap size={18} className="text-purple-600" />
                  <span className="font-mono text-sm font-semibold">
                    {meta?.complexity_note}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-purple-800">
                  <Clock size={18} className="text-purple-600" />
                  <span className="font-mono text-sm">
                    Execution: <strong>{meta?.execution_time_ms} ms</strong>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Reusable micro-component for the data grid
const DataCell = ({ label, value, icon }) => (
  <div className="p-4 flex flex-col items-center justify-center text-center">
    <div className="flex items-center gap-1 text-gray-400 text-xs uppercase font-semibold mb-1">
      {icon} {label}
    </div>
    <div className="text-lg font-medium text-gray-800">{value}</div>
  </div>
);

export default StockQuery;
