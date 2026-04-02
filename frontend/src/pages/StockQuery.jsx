import axios from "axios";
import {
  AlertCircle,
  BarChart2,
  CalendarDays,
  Clock,
  DollarSign,
  Search,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatDateDisplay } from "../utils/date";

const formatDateForQueryDisplay = isoDate => {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "";

  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
};

const parseQueryDateTextToIso = textValue => {
  const cleaned = (textValue || "").replace(/\D/g, "");
  if (cleaned.length !== 8) return "";

  const day = cleaned.slice(0, 2);
  const month = cleaned.slice(2, 4);
  const year = cleaned.slice(4, 8);
  const isoValue = `${year}-${month}-${day}`;
  const parsed = new Date(`${isoValue}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return "";

  const parsedDay = String(parsed.getDate()).padStart(2, "0");
  const parsedMonth = String(parsed.getMonth() + 1).padStart(2, "0");
  const parsedYear = String(parsed.getFullYear());

  if (parsedDay !== day || parsedMonth !== month || parsedYear !== year) {
    return "";
  }

  return isoValue;
};

const StockQuery = () => {
  const initialDate = new Date().toISOString().split("T")[0];
  const [query, setQuery] = useState({
    stock_id: "",
    date: initialDate,
  });
  const [queryDateText, setQueryDateText] = useState(
    formatDateForQueryDisplay(initialDate),
  );
  const datePickerRef = useRef(null);

  const [result, setResult] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [availableStockIds, setAvailableStockIds] = useState([]);

  const handleInputChange = e => {
    const { name, value } = e.target;
    if (name === "date") {
      const formattedDisplay = formatDateForQueryDisplay(value);
      setQueryDateText(formattedDisplay);
      setQuery({
        ...query,
        date: value,
      });
      return;
    }

    setQuery({
      ...query,
      [name]: name === "stock_id" ? value.toUpperCase() : value,
    });
  };

  const handleQueryDateTextChange = e => {
    const input = e.target.value;
    const cleaned = input.replace(/\D/g, "").slice(0, 8);

    // Format as dd/mm/yyyy for display
    let formattedValue = cleaned;
    if (cleaned.length > 2) {
      formattedValue = cleaned.slice(0, 2) + "/" + cleaned.slice(2);
    }
    if (cleaned.length > 4) {
      formattedValue =
        cleaned.slice(0, 2) +
        "/" +
        cleaned.slice(2, 4) +
        "/" +
        cleaned.slice(4);
    }

    setQueryDateText(formattedValue);

    // Only update the actual date if we have 8 digits and it's valid
    if (cleaned.length === 8) {
      const day = parseInt(cleaned.slice(0, 2), 10);
      const month = parseInt(cleaned.slice(2, 4), 10);
      const year = parseInt(cleaned.slice(4, 8), 10);

      // Validate date ranges
      if (month < 1 || month > 12) {
        return; // Invalid month
      }

      // Check if day is valid for the month
      const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) {
        daysInMonth[1] = 29; // Leap year
      }

      if (day < 1 || day > daysInMonth[month - 1]) {
        return; // Invalid day for this month
      }

      const isoDate = parseQueryDateTextToIso(cleaned);
      if (isoDate) {
        setQuery(prev => ({ ...prev, date: isoDate }));
      }
    }
  };

  const openDatePicker = () => {
    if (!datePickerRef.current) return;

    // Try modern approach first
    if (typeof datePickerRef.current.showPicker === "function") {
      try {
        datePickerRef.current.showPicker();
        return;
      } catch (error) {
        console.error("showPicker failed:", error);
      }
    }

    // Fallback to click
    try {
      datePickerRef.current.click();
    } catch (error) {
      console.error("Calendar click failed:", error);
    }
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

  const isPositive = result && result.close_price >= result.open_price;
  const inputBase =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100";

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="stock-query-hero-stage rounded-[32px] border border-slate-200/80 bg-[#fcfbf7] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              Query Engine
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Stock Query
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Retrieve exact daily records with fast hash-map lookups and a
              cleaner finance-dashboard presentation.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <StatusPill label="Lookup Mode" value="O(1) Hash Map" tone="sky" />
            <StatusPill
              label="Available Symbols"
              value={`${availableStockIds.length || 0} tracked`}
              tone="emerald"
            />
          </div>
        </div>
      </section>

      <section className="stock-query-card-stage grid gap-6 rounded-[30px] p-3 xl:grid-cols-[360px_1fr]">
        <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#efe8ff] p-3">
              <Search className="text-violet-700" size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Search Engine
              </p>
              <h2 className="text-xl font-bold text-slate-900">Run Query</h2>
            </div>
          </div>

          <form onSubmit={handleSearch} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Stock ID
              </label>
              <select
                required
                name="stock_id"
                value={query.stock_id}
                onChange={handleInputChange}
                className={inputBase}
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
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Target Date
              </label>
              <div className="relative flex items-center gap-2">
                <input
                  required
                  type="text"
                  name="query_date_text"
                  value={queryDateText}
                  onChange={handleQueryDateTextChange}
                  placeholder="dd/mm/yyyy"
                  inputMode="numeric"
                  className={inputBase}
                />
                <button
                  type="button"
                  onClick={openDatePicker}
                  className="inline-flex h-[50px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-600 transition hover:bg-slate-100"
                  aria-label="Open calendar"
                >
                  <CalendarDays size={18} />
                </button>
                <input
                  ref={datePickerRef}
                  type="date"
                  name="date"
                  value={query.date}
                  onChange={handleInputChange}
                  style={{
                    position: "absolute",
                    left: "-9999px",
                    visibility: "hidden",
                  }}
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </div>
              {/* <p className="mt-2 text-xs font-medium text-slate-500">
                Query format (ddmmyyyy):
                <span className="ml-1 font-mono font-semibold text-slate-700">
                  {formatDateForQueryDisplay(query.date) || "ddmmyyyy"}
                </span>
              </p> */}
            </div>

            <button
              type="submit"
              disabled={isLoading || !query.stock_id || !query.date}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-50"
            >
              <Search size={18} />
              {isLoading ? "Searching..." : "Execute Query"}
            </button>
          </form>

          <div className="mt-6 rounded-[24px] bg-[#f3f8ff] p-4 ring-1 ring-sky-100">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Query Notes
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Pick a symbol and date to inspect one stored candle. Results are
              surfaced as structured finance cards instead of plain output.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {!result && !error && !isLoading && (
            <div className="flex min-h-[380px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-10 text-center shadow-sm">
              <div className="rounded-full bg-slate-100 p-5">
                <Zap size={42} className="text-slate-400" />
              </div>
              <p className="mt-5 text-lg font-semibold text-slate-700">
                Ready to search the hash map
              </p>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Enter a stock ID and date to inspect a stored trading day with
                O(1) lookup semantics.
              </p>
            </div>
          )}

          {isLoading && (
            <div className="flex min-h-[380px] flex-col items-center justify-center rounded-[28px] bg-white p-10 text-center shadow-sm ring-1 ring-slate-100">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-sky-600" />
              <p className="mt-4 font-mono text-sm text-slate-500">
                Traversing hash-map buckets...
              </p>
            </div>
          )}

          {error && !isLoading && (
            <div className="rounded-[28px] border border-rose-200 bg-[#fff7f6] p-8 shadow-sm">
              <div className="flex items-center gap-3 text-rose-700">
                <div className="rounded-2xl bg-rose-100 p-3">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <p className="text-lg font-semibold">{error}</p>
                  <p className="text-sm text-rose-600">
                    Ensure the selected symbol has data for that date.
                  </p>
                </div>
              </div>
              {meta?.complexity_note && (
                <div className="mt-5 inline-flex rounded-full bg-white px-4 py-2 font-mono text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                  {meta.complexity_note}
                </div>
              )}
            </div>
          )}

          {result && !isLoading && (
            <>
              <div className="overflow-hidden rounded-[30px] bg-white shadow-sm ring-1 ring-slate-100">
                <div className="relative overflow-hidden bg-[#171717] px-7 py-8 text-white">
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-white/10" />
                  <div className="absolute -left-6 bottom-8 h-20 w-20 rounded-full bg-white/[0.03]" />
                  <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-400">
                        {formatDateDisplay(query.date)}
                      </p>
                      <h2 className="mt-2 text-4xl font-bold tracking-tight">
                        {query.stock_id}
                      </h2>
                    </div>
                    <div className="text-left lg:text-right">
                      <p className="text-sm font-medium text-slate-400">
                        Close Price
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-3xl font-bold">
                        ${result.close_price.toFixed(2)}
                        {isPositive ? (
                          <TrendingUp size={24} className="text-emerald-400" />
                        ) : (
                          <TrendingDown size={24} className="text-rose-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-4">
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

                <div className="flex flex-col gap-3 bg-[#f3f8ff] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sky-900">
                    <Zap size={18} className="text-sky-600" />
                    <span className="font-mono text-sm font-semibold">
                      {meta?.complexity_note}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Clock size={18} className="text-slate-500" />
                    <span className="font-mono text-sm">
                      Execution: <strong>{meta?.execution_time_ms} ms</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <StatusPill
                  label="Direction"
                  value={isPositive ? "Bullish" : "Bearish"}
                  tone={isPositive ? "emerald" : "rose"}
                />
                <StatusPill
                  label="Symbol"
                  value={query.stock_id}
                  tone="violet"
                />
                <StatusPill
                  label="Dataset Date"
                  value={formatDateDisplay(query.date)}
                  tone="amber"
                />
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

const DataCell = ({ label, value, icon }) => (
  <div className="bg-white p-5 text-center">
    <div className="mb-2 flex items-center justify-center gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
      {icon}
      {label}
    </div>
    <div className="text-lg font-semibold text-slate-900">{value}</div>
  </div>
);

const StatusPill = ({ label, value, tone }) => {
  const tones = {
    sky: "bg-[#eaf5ff] text-sky-900",
    emerald: "bg-[#ecfff1] text-emerald-900",
    violet: "bg-[#f3ecff] text-violet-900",
    rose: "bg-[#fff1f2] text-rose-900",
    amber: "bg-[#fff7e6] text-amber-900",
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

export default StockQuery;
