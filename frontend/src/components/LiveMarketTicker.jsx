import {
  Activity,
  Clock,
  Database,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import api from "../services/api";
import { formatDateDisplay } from "../utils/date";

const LiveMarketTicker = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [marketData, setMarketData] = useState({});
  const [status, setStatus] = useState("LOADING");
  const [simDate, setSimDate] = useState("");
  const prevPrices = useRef({});

  useEffect(() => {
    const fetchLiveMarket = async () => {
      try {
        const response = await api.get("/stocks/live");
        const newData = response.data.data;

        setMarketData(newData);
        setStatus(response.data.status);
        setSimDate(response.data.date);

        const currentPrices = {};
        Object.keys(newData).forEach(symbol => {
          currentPrices[symbol] = newData[symbol].close_price;
        });
        prevPrices.current = currentPrices;
      } catch (error) {
        console.error("Failed to fetch live market data", error);
        setStatus("OFFLINE");
      }
    };

    fetchLiveMarket();
    const interval = setInterval(fetchLiveMarket, 3000);
    return () => clearInterval(interval);
  }, []);

  if (status === "LOADING" || status === "OFFLINE") return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Featured Stocks
          </p>
          <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Live market highlights
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#ecfff1] px-4 py-2 font-semibold text-emerald-800 shadow-sm">
            <Activity size={15} className="text-emerald-600" />
            Market {status}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
            <Clock size={15} className="text-slate-400" />
            Simulated date {formatDateDisplay(simDate)}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Object.keys(marketData).map(symbol => {
          const data = marketData[symbol];
          const currentPrice = data.close_price;
          const prevPrice = prevPrices.current[symbol] || currentPrice;
          const isUp = currentPrice > prevPrice;
          const isDown = currentPrice < prevPrice;

          return (
            <article
              key={symbol}
              className={`group relative overflow-hidden rounded-[28px] px-5 py-5 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] transition duration-200 hover:-translate-y-1 ${
                isDark
                  ? "bg-[#101a2b]"
                  : "bg-[#17181c]"
              }`}
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full border border-white/10" />
              <div className="absolute -left-4 bottom-6 h-14 w-14 rounded-full bg-white/[0.03]" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Asset
                  </p>
                  <h4 className="mt-1 text-2xl font-bold tracking-tight">
                    {symbol}
                  </h4>
                </div>
                <div
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isUp
                      ? "bg-emerald-500/15 text-emerald-300"
                      : isDown
                        ? "bg-rose-500/15 text-rose-300"
                        : "bg-white/10 text-slate-200"
                  }`}
                >
                  {isUp ? "+ momentum" : isDown ? "- momentum" : "steady"}
                </div>
              </div>

              <div className="relative mt-8 flex items-end justify-between">
                <div>
                  <div className="text-3xl font-bold tracking-tight">
                    ${currentPrice.toFixed(2)}
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    Vol {(data.volume / 1000).toFixed(1)}k
                  </p>
                </div>
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                    isUp
                      ? "bg-emerald-500/15 text-emerald-300"
                      : isDown
                        ? "bg-rose-500/15 text-rose-300"
                        : "bg-white/10 text-slate-200"
                  }`}
                >
                  {isUp ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                </div>
              </div>

              <div className="relative mt-6 flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-xs text-slate-300">
                <span className="flex items-center gap-2">
                  <Database size={14} className="text-slate-500" />
                  High ${data.high_price.toFixed(2)}
                </span>
                <span>Low ${data.low_price.toFixed(2)}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default LiveMarketTicker;
