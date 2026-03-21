import axios from "axios";
import { Clock, Database, Layers, ShieldCheck, Zap } from "lucide-react";
import { useEffect, useState } from "react";

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/logs?limit=100",
        {
          headers: { Authorization: `Bearer SIMULATED_TOKEN` },
        },
      );
      setLogs(response.data.logs);
      setMeta(response.data.meta.complexity_note);
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000); // Auto-refresh logs every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            System Audit Logs
            <span className="text-xs font-mono bg-purple-100 text-purple-800 px-2 py-1 rounded-full uppercase tracking-wider">
              LIFO Stack
            </span>
          </h1>
          <p className="text-gray-500 mt-1">
            Immutable tracking of system events powered by a Last-In-First-Out
            data structure.
          </p>
        </div>
        {meta && (
          <div className="flex items-center gap-2 bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg shadow-sm">
            <Zap size={16} />
            <span className="font-mono text-sm font-semibold">{meta}</span>
          </div>
        )}
      </div>

      <div className="bg-gray-900 rounded-xl shadow-xl overflow-hidden border border-gray-800">
        <div className="bg-gray-950 p-4 border-b border-gray-800 flex items-center gap-3 text-gray-400 font-mono text-sm">
          <Layers size={18} className="text-purple-500" />
          <span>[ TOP OF STACK ] - Showing Most Recent Events First</span>
        </div>

        <div className="p-6 max-h-[600px] overflow-y-auto space-y-3">
          {isLoading && logs.length === 0 ? (
            <div className="text-center text-gray-500 py-10 font-mono">
              Loading Stack Data...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center text-gray-500 py-10 font-mono">
              Stack is completely empty.
            </div>
          ) : (
            logs.map((log, index) => {
              // Determine icon based on log action text
              let Icon = Database;
              let iconColor = "text-blue-400";

              if (log.action.includes("Alert")) {
                Icon = ShieldCheck;
                iconColor = "text-orange-400";
              } else if (log.action.includes("Queried")) {
                Icon = Zap;
                iconColor = "text-purple-400";
              } else if (log.action.includes("Admin")) {
                Icon = ShieldCheck;
                iconColor = "text-red-400";
              }

              return (
                <div
                  key={index}
                  className={`flex items-start gap-4 p-4 rounded-lg border bg-gray-800/50 hover:bg-gray-800 transition-all ${
                    index === 0
                      ? "border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                      : "border-gray-700/50"
                  }`}
                >
                  <div className="mt-1 bg-gray-900 p-2 rounded-md border border-gray-700">
                    <Icon size={16} className={iconColor} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-200 font-medium">
                        {log.action}
                      </span>
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs font-mono">
                        <Clock size={12} />
                        {log.timestamp}
                      </div>
                    </div>
                    {index === 0 && (
                      <span className="text-[10px] font-mono uppercase bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/30">
                        Latest Push
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="bg-gray-950 p-4 border-t border-gray-800 flex items-center gap-3 text-gray-600 font-mono text-sm">
          <span>[ BOTTOM OF STACK ] - System Initialization</span>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
