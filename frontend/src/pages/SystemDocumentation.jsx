import {
  Activity,
  ArrowRightLeft,
  BookOpen,
  ChevronRight,
  Clock,
  Database,
  Hash,
  Layers,
  Network,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import api from "../services/api";

const SystemDocumentation = () => {
  const [cacheStats, setCacheStats] = useState(null);
  const [benchmark, setBenchmark] = useState(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [cacheError, setCacheError] = useState("");

  const dataStructures = [
    {
      id: "hash-tables",
      title: "Hash Tables",
      icon: <Hash className="text-sky-700" size={20} />,
      variant: "C1 - Stock Ingestion & Query",
      complexity: "O(1) Average",
      description:
        "Python dictionaries map shared stock IDs to dates and dates to stock records for near-instant global market lookups.",
      implementation: "stocks = HashMap<stock_id, HashMap<date, StockRecord>>",
      details:
        "This shared market store is global across tenants, so every tenant reads from the same historical stock dataset while keeping operational state separate.",
      tone: "from-sky-50 to-cyan-50 border-sky-100",
    },
    {
      id: "deques",
      title: "Deque Windows",
      icon: <ArrowRightLeft className="text-emerald-700" size={20} />,
      variant: "C2 - Rolling Average Analytics",
      complexity: "O(N) / O(K)",
      description:
        "A deque keeps a sliding window of prices so analytics can update without reprocessing the full series.",
      implementation: "window = deque(maxlen=K)",
      details:
        "Each new price is appended, the oldest drops off, and a running sum is maintained to keep rolling averages efficient and stable.",
      tone: "from-emerald-50 to-lime-50 border-emerald-100",
    },
    {
      id: "heaps",
      title: "Priority Heaps",
      icon: <Network className="text-violet-700" size={20} />,
      variant: "C2 - Rolling Max/Min Analytics",
      complexity: "O(N log K)",
      description:
        "Heaps keep the most important value near the top so max and min signals are always easy to access.",
      implementation: "heapq.heappush(max_heap, (-price, index))",
      details:
        "We use lazy deletion so outdated values are discarded only when they reach the top, which is much cheaper than sorting every window repeatedly.",
      tone: "from-violet-50 to-fuchsia-50 border-violet-100",
    },
    {
      id: "queues",
      title: "Alert Queues",
      icon: <Database className="text-amber-700" size={20} />,
      variant: "C3 - Alert Event System",
      complexity: "O(1) FIFO",
      description:
        "Incoming events are processed in first-in, first-out order inside tenant-specific queues so alert execution stays predictable and isolated.",
      implementation: "alertsQueue[tenant_id] = Queue<AlertEvent>",
      details:
        "Fresh stock events are routed into the matching tenant bucket and workers drain each queue sequentially, preventing cross-tenant alert leakage.",
      tone: "from-amber-50 to-yellow-50 border-amber-100",
    },
    {
      id: "stacks",
      title: "Audit Stacks",
      icon: <Layers className="text-rose-700" size={20} />,
      variant: "C4 - Audit Logs",
      complexity: "O(1) Push / Pop",
      description:
        "Log entries are tagged with tenant context so audit retrieval stays scoped to the active organization.",
      implementation: "auditLog.push({ tenant_id, action, timestamp })",
      details:
        "That gives admins a reverse-chronological view of what just happened inside their own tenant while preserving shared global events when needed.",
      tone: "from-rose-50 to-orange-50 border-rose-100",
    },
    {
      id: "cache",
      title: "Hot Query Cache",
      icon: <Zap className="text-teal-700" size={20} />,
      variant: "C5 - Read-Heavy Cache Layer",
      complexity: "O(1) Average",
      description:
        "A bounded LRU-style cache keeps hot stock-date lookups close so repeated reads can skip the slower cold path.",
      implementation: "queryCache[(stock_id, date)] = StockRecord",
      details:
        "The backend now tracks hot-stock promotion, cache hits and misses, evictions, and benchmark runs through dedicated stats and benchmark endpoints.",
      tone: "from-teal-50 to-cyan-50 border-teal-100",
    },
  ];

  const assetCards = [
    {
      title: "Hash Maps",
      metric: "O(1)",
      change: "Lookup",
      subtitle: "Direct stock/date retrieval",
      accent: "bg-[#efe8ff] text-violet-900",
      badge: "text-violet-700 bg-white/80",
    },
    {
      title: "Deque Windows",
      metric: "O(N)",
      change: "Average",
      subtitle: "Sliding-window analytics",
      accent: "bg-[#dcf6df] text-emerald-900",
      badge: "text-emerald-700 bg-white/80",
    },
    {
      title: "Hot Cache",
      metric: "LRU",
      change: "C5",
      subtitle: "Hits, misses, benchmarkable reads",
      accent: "bg-[#dff7f5] text-teal-900",
      badge: "text-teal-700 bg-white/80",
    },
  ];

  const schemaHighlights = [
    { label: "id", value: "Primary key for each user record" },
    {
      label: "tenant_id",
      value: "Tenant partition key used for isolation and routing",
    },
    { label: "username", value: "Unique login identifier" },
    { label: "password", value: "Credential value stored by the system" },
    { label: "role", value: "Access tier: SUPER_ADMIN, ADMIN, AUDITOR, USER" },
    { label: "status", value: "Lifecycle flag for active/inactive accounts" },
    { label: "last_login", value: "Most recent access timestamp" },
  ];

  const candlestickData = [
    { label: "Ingest", low: 24, high: 88, open: 42, close: 68 },
    { label: "Parse", low: 30, high: 94, open: 70, close: 48 },
    { label: "Query", low: 36, high: 102, open: 54, close: 78 },
    { label: "Cache", low: 28, high: 96, open: 80, close: 58 },
    { label: "Analyze", low: 42, high: 114, open: 64, close: 90 },
    { label: "Alert", low: 38, high: 106, open: 84, close: 56 },
    { label: "Audit", low: 44, high: 118, open: 62, close: 98 },
    { label: "Scale", low: 34, high: 100, open: 72, close: 50 },
  ];

  useEffect(() => {
    const fetchCacheStats = async () => {
      try {
        const response = await api.get("/stocks/cache/stats");
        setCacheStats(response.data);
        setCacheError("");
      } catch (error) {
        setCacheError(
          error.response?.data?.error ||
            "Unable to load cache metrics from the backend.",
        );
      }
    };

    fetchCacheStats();
    const interval = setInterval(fetchCacheStats, 8000);
    return () => clearInterval(interval);
  }, []);

  const runBenchmark = async () => {
    setIsBenchmarking(true);
    try {
      const response = await api.get("/stocks/cache/benchmark", {
        params: { iterations: 2000 },
      });
      setBenchmark(response.data.benchmark || null);
      setCacheStats(response.data.cache || null);
      setCacheError("");
    } catch (error) {
      setCacheError(
        error.response?.data?.error || "Unable to run cache benchmark.",
      );
    } finally {
      setIsBenchmarking(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="docs-card-stage rounded-[32px] border border-slate-200/80 bg-[#fcfbf7] p-5 shadow-[0_28px_80px_rgba(15,23,42,0.08)] md:p-7">
        <div className="grid gap-5 xl:grid-cols-[1.7fr_1.2fr]">
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Variant C1 - C5
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                  System Documentation
                </h1>
              </div>
              <div className="rounded-full bg-[#171717] px-4 py-2 text-xs font-semibold text-white shadow-lg">
                Variant C1 - C5
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
              <div className="overflow-hidden rounded-[28px] bg-[#dff0ff] p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Platform Architecture
                    </p>
                    <div className="mt-3 text-4xl font-bold text-slate-900">
                      C1 - C5
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Verified implementation coverage across ingestion,
                      analytics, alerts, tenant control, audits, and caching.
                    </p>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                      Shared stock data powers every tenant, while alerts, audit
                      activity, account access, and tenant switching stay scoped
                      by role and active tenant context.
                    </p>
                  </div>
                  <div className="rounded-full bg-[#171717] px-4 py-2 text-sm font-semibold text-white shadow-lg">
                    5 verified variants
                  </div>
                </div>

                <div className="mt-8 rounded-[24px] border border-white/50 bg-white/35 p-4">
                  <div className="flex h-[220px] items-end justify-between gap-3">
                    {candlestickData.map(item => {
                      const bullish = item.close >= item.open;
                      const bodyBottom = Math.min(item.open, item.close);
                      const bodyHeight = Math.max(
                        Math.abs(item.close - item.open),
                        10,
                      );

                      return (
                        <div
                          key={item.label}
                          className="flex flex-1 flex-col items-center gap-3"
                        >
                          <div className="relative h-[140px] w-full">
                            <div
                              className="absolute left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-slate-500/50"
                              style={{
                                bottom: `${item.low}px`,
                                height: `${item.high - item.low}px`,
                              }}
                            />
                            <div
                              className={`absolute left-1/2 w-5 -translate-x-1/2 rounded-md shadow-sm ${
                                bullish ? "bg-emerald-500/80" : "bg-rose-500/80"
                              }`}
                              style={{
                                bottom: `${bodyBottom}px`,
                                height: `${bodyHeight}px`,
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Core Assets
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Documentation cards styled from your dashboard reference.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                  {assetCards.map(card => (
                    <div
                      key={card.title}
                      className={`rounded-[24px] p-5 shadow-sm ${card.accent}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-2xl font-bold">
                            {card.metric}
                          </div>
                          <div className="mt-1 text-sm font-semibold">
                            {card.title}
                          </div>
                          <div className="mt-1 text-xs opacity-70">
                            {card.subtitle}
                          </div>
                        </div>
                        <div
                          className={`rounded-2xl px-3 py-2 text-xs font-semibold shadow-sm ${card.badge}`}
                        >
                          {card.change}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
              <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      Verified Variant Coverage
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Core engine components mapped to concrete backend
                      implementations instead of presentation-only claims.
                    </p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Live Codebase
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {dataStructures.slice(0, 4).map(item => (
                    <div
                      key={item.id}
                      className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#171717] text-white shadow-sm">
                            {item.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold leading-6 text-slate-900">
                              {item.title}
                            </div>
                            <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                              {item.variant}
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                          {item.complexity}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[28px] bg-[#171717] p-6 text-white shadow-[0_26px_60px_rgba(15,23,42,0.24)]">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-white/10" />
                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">
                    <Sparkles size={14} />
                    Implementation Scope
                  </div>
                  <h2 className="mt-5 text-3xl font-bold leading-tight">
                    Documentation now tracks the real engine surface.
                  </h2>
                  <p className="mt-4 text-sm leading-6 text-slate-300">
                    This page now reflects the actual backend implementation:
                    nested hash maps for stock lookup, deque and heap analytics,
                    FIFO alert queues, tenant-aware audit logs, and a bounded
                    hot-query cache for repeated reads.
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    C5 is no longer a placeholder. The backend exposes cache
                    stats and a simple benchmark path so read-heavy behavior can
                    be inspected directly.
                  </p>
                  <button className="mt-6 rounded-full bg-[#bfe1ff] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#d4ebff]">
                    Explore Documentation
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="relative overflow-hidden rounded-[28px] bg-[#171717] p-6 text-slate-100 shadow-[0_22px_60px_rgba(15,23,42,0.18)]">
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border border-white/10" />
              <div className="relative">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <Clock className="text-sky-300" size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Complexity Guide
                    </p>
                    <h2 className="text-xl font-bold text-white">
                      Understanding Big-O as used in the project
                    </h2>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 font-mono text-lg font-bold text-emerald-300">
                      <TrendingUp size={16} />
                      O(1)
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Constant time. Performance stays effectively flat even
                      when the dataset grows.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 font-mono text-lg font-bold text-amber-300">
                      <TrendingDown size={16} />
                      O(N)
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Linear time. Work rises in direct proportion to the amount
                      of data processed.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 font-mono text-lg font-bold text-orange-300">
                      <Zap size={16} />
                      O(N log N)
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      A strong balance for ordered operations like sorting and
                      ranked views.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-sky-100 p-3">
                  <Database className="text-sky-700" size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Database Schema
                  </p>
                  <h2 className="text-xl font-bold text-slate-900">
                    public.users
                  </h2>
                </div>
              </div>

              <div className="mt-5 bg-[#171717] p-5 text-xs text-white shadow-inner">
                <pre className="overflow-x-auto overflow-y-hidden font-mono leading-6">{`CREATE TABLE public.users (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'global',
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'USER',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  UNIQUE (tenant_id, username)
);`}</pre>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#eef7ff] p-4">
                  <p className="text-sm font-semibold text-sky-900">
                    Tenant Rule
                  </p>
                  <pre className="mt-3 overflow-x-auto overflow-y-hidden bg-[#171717] p-3 font-mono text-[11px] leading-5 text-white">{`CHECK (
  tenant_id <> ''
);`}</pre>
                  <p className="mt-3 text-xs leading-5 text-sky-900/80">
                    Usernames are unique inside each tenant boundary, not across
                    the whole platform.
                  </p>
                </div>
                <div className="rounded-2xl bg-[#ecfff1] p-4">
                  <p className="text-sm font-semibold text-emerald-900">
                    Role Constraint
                  </p>
                  <pre className="mt-3 overflow-x-auto overflow-y-hidden bg-[#171717] p-3 font-mono text-[11px] leading-5 text-white">{`CHECK (role IN (
  'SUPER_ADMIN', 'ADMIN',
  'AUDITOR', 'USER'
));`}</pre>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-[#ecfff1] p-4">
                <p className="text-sm font-semibold text-emerald-900">
                  Status Constraint
                </p>
                <pre className="mt-3 overflow-x-auto overflow-y-hidden bg-[#171717] p-3 font-mono text-[11px] leading-5 text-white">{`CHECK (status IN (
  'active', 'inactive'
));`}</pre>
              </div>

              <div className="mt-5 rounded-2xl bg-[#faf7ff] p-4">
                <p className="text-sm font-semibold text-violet-900">
                  Sample Rows
                </p>
                <pre className="mt-3 overflow-x-auto overflow-y-hidden bg-[#171717] p-3 font-mono text-[11px] leading-5 text-white">{`INSERT INTO public.users
  (tenant_id, username, password, role, status)
VALUES
  ('global', 'kairo_dev', 'X9f!2Lm#qP', 'SUPER_ADMIN', 'active'),
  ('acme', 'zena_flux', 'pT7@vR3$kL', 'USER', 'active'),
  ('northwind', 'mako_byte', 'Qw8#Zx1!nV', 'USER', 'active');`}</pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.65fr]">
        <div className="docs-column-stage rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3">
              <ShieldCheck className="text-emerald-700" size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Column Reference
              </p>
              <h2 className="text-xl font-bold text-slate-900">
                User Table Fields
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {schemaHighlights.map(item => (
              <div
                key={item.label}
                className="flex items-start gap-4 rounded-2xl bg-slate-50 px-4 py-3"
              >
                <span className="min-w-[96px] rounded-xl bg-[#171717] px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.16em] text-white">
                  {item.label}
                </span>
                <p className="pt-1 text-sm leading-6 text-slate-600">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Engine Internals
              </p>
              <h2 className="text-2xl font-bold text-slate-900">
                Data Structure Breakdown
              </h2>
            </div>
            <div className="rounded-full bg-[#171717] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white">
              6 Core Patterns
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {dataStructures.map(ds => (
              <article
                key={ds.id}
                className={`rounded-[28px] border bg-gradient-to-br p-5 shadow-sm ${ds.tone}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                      {ds.icon}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-bold text-slate-900">
                          {ds.title}
                        </h3>
                        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {ds.variant}
                        </span>
                      </div>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                        {ds.description}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#171717] px-4 py-3 text-sm font-semibold text-white shadow-lg">
                    {ds.complexity}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
                  <div className="rounded-[22px] bg-[#171717] p-4 text-white">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Pseudocode
                    </p>
                    <code className="mt-3 block break-words font-mono text-sm leading-6 text-white">
                      {ds.implementation}
                    </code>
                  </div>
                  <div className="rounded-[22px] bg-white/70 p-4">
                    <div className="flex items-start gap-3">
                      <ChevronRight
                        className="mt-0.5 flex-shrink-0 text-slate-500"
                        size={18}
                      />
                      <p className="text-sm leading-6 text-slate-700">
                        {ds.details}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_1.2fr]">
        <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#dff7f5] p-3">
                <Activity className="text-teal-700" size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  C5 Runtime
                </p>
                <h2 className="text-xl font-bold text-slate-900">
                  Cache Stats
                </h2>
              </div>
            </div>
            <div className="rounded-full bg-[#f3f8ff] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-900">
              Live endpoint data
            </div>
          </div>

          {cacheError ? (
            <div className="mt-6 rounded-[24px] border border-rose-200 bg-[#fff7f6] p-4 text-sm text-rose-700">
              {cacheError}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <CacheMetricCard
              label="Hits"
              value={cacheStats?.hits ?? "--"}
              tone="sky"
            />
            <CacheMetricCard
              label="Misses"
              value={cacheStats?.misses ?? "--"}
              tone="amber"
            />
            <CacheMetricCard
              label="Cache Size"
              value={
                cacheStats ? `${cacheStats.size}/${cacheStats.capacity}` : "--"
              }
              tone="violet"
            />
            <CacheMetricCard
              label="Evictions"
              value={cacheStats?.evictions ?? "--"}
              tone="teal"
            />
          </div>

          <div className="mt-5 rounded-[24px] bg-[#f8f7f2] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Hot Stocks
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(cacheStats?.hot_stocks || []).length > 0 ? (
                cacheStats.hot_stocks.map(stockId => (
                  <span
                    key={stockId}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-sm"
                  >
                    {stockId}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">
                  No stocks have crossed the hot-cache threshold yet.
                </span>
              )}
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Promotion threshold: {cacheStats?.hot_stock_threshold ?? "--"}{" "}
              repeated reads.
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[28px] bg-[#171717] p-6 text-white shadow-[0_26px_60px_rgba(15,23,42,0.24)]">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-white/10" />
          <div className="relative">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  C5 Benchmark
                </p>
                <h2 className="mt-1 text-2xl font-bold text-white">
                  Read-Heavy Comparison
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                  Run a simple workload against the hot-query cache to compare
                  uncached versus cached reads using the live backend.
                </p>
              </div>

              <button
                type="button"
                onClick={runBenchmark}
                disabled={isBenchmarking}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#bfe1ff] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#d4ebff] disabled:opacity-50"
              >
                <Zap size={16} />
                {isBenchmarking ? "Running..." : "Run Benchmark"}
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <BenchmarkStat
                label="Uncached"
                value={benchmark ? `${benchmark.uncached_ms} ms` : "--"}
              />
              <BenchmarkStat
                label="Cached"
                value={benchmark ? `${benchmark.cached_ms} ms` : "--"}
              />
              <BenchmarkStat
                label="Speedup"
                value={benchmark?.speedup ? `${benchmark.speedup}x` : "--"}
              />
              <BenchmarkStat
                label="Benchmark Hits"
                value={benchmark?.cache_hits ?? "--"}
              />
            </div>

            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Benchmark Targets
                </p>
                <span className="text-xs font-mono text-slate-400">
                  {benchmark?.iterations ?? 2000} iterations
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {(benchmark?.targets || []).length > 0 ? (
                  benchmark.targets.map(target => (
                    <div
                      key={`${target.stock_id}-${target.date}`}
                      className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-white">
                          {target.stock_id}
                        </p>
                        <p className="text-slate-400">{target.date}</p>
                      </div>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">
                        {target.access_count} reads
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">
                    Run the benchmark to capture live comparison targets.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] bg-[#f3f8ff] p-6 shadow-sm ring-1 ring-sky-100">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              <BookOpen className="text-sky-700" size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Summary
              </p>
              <h2 className="text-xl font-bold text-slate-900">
                Why This Layout Works
              </h2>
            </div>
          </div>
          <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-sm">
            Dashboard Styled
          </div>
        </div>

        <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">
          This page documents the stock query server with implementation-aligned
          content instead of aspirational variant labels. Each card maps to code
          that exists in the backend: stock ingestion and lookup, rolling
          analytics, alert queues, tenant-scoped audit access, and the new hot
          query cache with measurable behavior.
        </p>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
          The platform uses globally shared stock data, while alerts, audit
          activity, and account identity remain isolated by tenant. Usernames
          are unique within each tenant boundary, and repeated stock reads can
          now be promoted into a bounded cache with hit and miss tracking.
        </p>
      </section>
    </div>
  );
};

const CacheMetricCard = ({ label, value, tone }) => {
  const tones = {
    sky: "bg-[#eaf5ff] text-sky-900",
    amber: "bg-[#fff7e6] text-amber-900",
    violet: "bg-[#f3ecff] text-violet-900",
    teal: "bg-[#dff7f5] text-teal-900",
  };

  return (
    <div className={`rounded-[24px] px-5 py-4 shadow-sm ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-60">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
};

const BenchmarkStat = ({ label, value }) => (
  <div className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4">
    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
      {label}
    </p>
    <p className="mt-1 text-2xl font-bold text-white">{value}</p>
  </div>
);

export default SystemDocumentation;
