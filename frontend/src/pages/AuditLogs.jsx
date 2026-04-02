import {
  Clock,
  Database,
  Layers,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import api from "../services/api";

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const response = await api.get("/logs?limit=100");
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
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="rounded-[32px] border border-slate-200/80 bg-[#fcfbf7] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              Governance Trail
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Audit Logs
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Review the most recent system actions in a cleaner timeline that
              still preserves the stack-first ordering from the backend.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <AuditPill label="Order" value="LIFO Stack" tone="violet" />
            <AuditPill label="Entries" value={`${logs.length}`} tone="sky" />
            <AuditPill
              label="Complexity"
              value={meta || "Awaiting meta"}
              tone="emerald"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.75fr]">
        <div className="rounded-[28px] bg-white shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#efe8ff] p-3">
                <Layers size={20} className="text-violet-700" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Activity Stream
                </p>
                <h2 className="text-xl font-bold text-slate-900">
                  Most recent events first
                </h2>
              </div>
            </div>

            <div className="rounded-full bg-[#f8f7f2] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
              Top of stack
            </div>
          </div>

          <div className="space-y-3 p-5">
            {isLoading && logs.length === 0 ? (
              <TimelineEmpty
                title="Loading audit history..."
                subtitle="Fetching stack entries from the backend."
              />
            ) : logs.length === 0 ? (
              <TimelineEmpty
                title="No audit entries yet"
                subtitle="Once actions are recorded, they will appear here."
              />
            ) : (
              logs.map((log, index) => {
                const { Icon, accent } = getLogPresentation(log.action);

                return (
                  <div
                    key={`${log.timestamp}-${index}`}
                    className={`flex flex-col gap-4 rounded-[24px] px-5 py-4 shadow-sm ring-1 transition hover:-translate-y-0.5 md:flex-row md:items-center md:justify-between ${
                      index === 0
                        ? "bg-[#17181c] text-white ring-slate-900"
                        : "bg-[#f8f7f2] text-slate-900 ring-slate-100"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`rounded-2xl p-3 ${
                          index === 0 ? "bg-white/10" : "bg-white"
                        } ${accent}`}
                      >
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{log.action}</p>
                          {index === 0 && (
                            <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-200">
                              Latest push
                            </span>
                          )}
                        </div>
                        <p
                          className={`mt-1 text-sm ${
                            index === 0 ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          Immutable event captured for operational traceability.
                        </p>
                      </div>
                    </div>

                    <div
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium ${
                        index === 0
                          ? "bg-white/10 text-slate-300"
                          : "bg-white text-slate-500 shadow-sm"
                      }`}
                    >
                      <Clock size={14} />
                      {log.timestamp}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#eaf5ff] p-3">
                <Sparkles size={20} className="text-sky-700" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Audit Notes
                </p>
                <h3 className="text-xl font-bold text-slate-900">
                  Why this matters
                </h3>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <InsightCard
                label="Integrity"
                value="Chronological stack view keeps the newest actions closest to review."
                tone="sky"
              />
              <InsightCard
                label="Security"
                value="Administrative events remain easy to spot with role-focused visual badges."
                tone="violet"
              />
              <InsightCard
                label="Performance"
                value={
                  meta || "Complexity metadata will appear once log data loads."
                }
                tone="emerald"
              />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[28px] bg-[#17181c] p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border border-white/10" />
            <div className="absolute -left-5 bottom-8 h-20 w-20 rounded-full bg-white/[0.03]" />
            <div className="relative flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <Zap size={20} className="text-amber-300" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Monitoring Tip
                </p>
                <h3 className="text-xl font-bold">Focus on the newest push</h3>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              The top card surfaces the freshest event immediately, which makes
              operational triage faster during alert spikes or admin actions.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

const getLogPresentation = action => {
  if (action.includes("Alert")) {
    return { Icon: ShieldCheck, accent: "text-orange-500" };
  }
  if (action.includes("Queried")) {
    return { Icon: Zap, accent: "text-violet-600" };
  }
  if (action.includes("Admin")) {
    return { Icon: ShieldCheck, accent: "text-rose-500" };
  }
  return { Icon: Database, accent: "text-sky-600" };
};

const AuditPill = ({ label, value, tone }) => {
  const tones = {
    violet: "bg-[#efe8ff] text-violet-900",
    sky: "bg-[#eaf5ff] text-sky-900",
    emerald: "bg-[#ecfff1] text-emerald-900",
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

const TimelineEmpty = ({ title, subtitle }) => (
  <div className="rounded-[24px] border border-dashed border-slate-300 bg-[#f8f7f2] px-5 py-12 text-center">
    <p className="font-semibold text-slate-700">{title}</p>
    <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
  </div>
);

const InsightCard = ({ label, value, tone }) => {
  const tones = {
    sky: "bg-[#eaf5ff]",
    violet: "bg-[#efe8ff]",
    emerald: "bg-[#ecfff1]",
  };

  return (
    <div className={`rounded-[24px] p-4 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm leading-7 text-slate-700">{value}</p>
    </div>
  );
};

export default AuditLogs;
