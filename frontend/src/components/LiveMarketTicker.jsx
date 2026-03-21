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

const LiveMarketTicker = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [marketData, setMarketData] = useState({});
  const [status, setStatus] = useState("LOADING");
  const [simDate, setSimDate] = useState("");

  // We use a ref to remember previous prices for the green/red flash effect
  const prevPrices = useRef({});

  useEffect(() => {
    const fetchLiveMarket = async () => {
      try {
        const response = await api.get("/stocks/live");
        const newData = response.data.data;

        // Update state with new data
        setMarketData(newData);
        setStatus(response.data.status);
        setSimDate(response.data.date);

        // Update our ref for the NEXT tick comparison
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

    // Fetch immediately, then poll every 3 seconds
    fetchLiveMarket();
    const interval = setInterval(fetchLiveMarket, 3000);
    return () => clearInterval(interval);
  }, []);

  if (status === "LOADING" || status === "OFFLINE") return null;

  return (
    <div
      className={`rounded-xl shadow-lg border overflow-hidden mb-8 animate-fade-in-down card-style ${isDark ? "border-[var(--border)]" : "border-[var(--border)]"}`}
    >
      {/* Ticker Header */}
      <div
        className={`p-3 border-b flex items-center justify-between ${isDark ? "bg-[var(--surface)] border-[var(--border)]" : "bg-[var(--surface)] border-[var(--border)]"}`}
      >
        <div className="flex items-center gap-3">
          <Activity
            size={18}
            className={
              status === "OPEN"
                ? "text-green-400 animate-pulse"
                : "text-gray-500"
            }
          />
          <h2 className="text-sm font-bold text-white tracking-widest uppercase">
            Live RAM Ticker
          </h2>
          <span
            className={`text-xs px-2 py-0.5 rounded font-mono ${status === "OPEN" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
          >
            MARKET {status}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-gray-400">
          <div className="flex items-center gap-1.5">
            <Clock size={14} /> Simulated Date: {simDate}
          </div>
          <div className="flex items-center gap-1.5 text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
            <Database size={14} /> Write-Behind Cache Active
          </div>
        </div>
      </div>

      {/* Ticker Tape (Stock Cards) */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.keys(marketData).map(symbol => {
          const data = marketData[symbol];
          const currentPrice = data.close_price;
          const prevPrice = prevPrices.current[symbol] || currentPrice;

          // Determine tick direction
          const isUp = currentPrice > prevPrice;
          const isDown = currentPrice < prevPrice;
          const noChange = currentPrice === prevPrice;

          // Dynamic colors based on the tick
          let colorClass = "text-gray-300";
          let bgClass = "bg-gray-800";
          if (isUp) {
            colorClass = "text-green-400";
            bgClass = "bg-green-400/10 border-green-400/30";
          }
          if (isDown) {
            colorClass = "text-red-400";
            bgClass = "bg-red-400/10 border-red-400/30";
          }

          return (
            <div
              key={symbol}
              className={`flex flex-col p-3 rounded-lg border border-gray-700 transition-colors duration-500 ${bgClass}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-gray-200">{symbol}</span>
                {isUp ? (
                  <TrendingUp size={16} className="text-green-400" />
                ) : isDown ? (
                  <TrendingDown size={16} className="text-red-400" />
                ) : null}
              </div>
              <div className={`text-xl font-mono font-medium ${colorClass}`}>
                ${currentPrice.toFixed(2)}
              </div>
              <div className="text-[10px] text-gray-500 font-mono mt-1 flex justify-between">
                <span>Vol: {(data.volume / 1000).toFixed(1)}k</span>
                <span>H: ${data.high_price.toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LiveMarketTicker;
