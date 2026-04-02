# Variant Audit Report

Date: 2026-03-28

## Scope

This audit maps variants C1 through C5 to the current codebase and identifies any remaining gaps or caveats.

## C1: Daily ingestion and query by stock/date

Status: Achieved

Evidence:

- `backend/data_structures.py`: `self.stocks` nested hash map, `ingest_stock`, `query_stock`
- `backend/app.py`: `/api/stocks/ingest`, `/api/stocks/query`, `/api/stocks/summary`
- `frontend/src/pages/StockIngestion.jsx`: ingestion UI
- `frontend/src/pages/StockQuery.jsx`: query UI

Notes:

- The implementation uses a shared in-memory stock store keyed by stock ID and date.

## C2: Rolling metrics with moving average and heap-based max/min

Status: Achieved

Evidence:

- `backend/data_structures.py`: `get_rolling_average`, `calculate_rolling_metrics`
- `backend/app.py`: `/api/stocks/analytics`
- `frontend/src/pages/MetricsAnalytics.jsx`: analytics UI

Notes:

- Average uses a deque-based sliding window.
- Maximum and minimum use heapq with lazy deletion.

## C3: Alerts with threshold checks and FIFO event queue

Status: Achieved

Evidence:

- `backend/data_structures.py`: `alerts_queue`, `create_alert`, `process_alerts`
- `backend/app.py`: `/api/alerts`
- `frontend/src/pages/AlertManagement.jsx`: alert creation and feed UI

Notes:

- Alert queues are tenant-aware and drained FIFO.

## C4: Multi-tenant access control with roles and audit logs

Status: Achieved

Evidence:

- `backend/app.py`: JWT tenant context, `token_required`, `role_required`, `/api/logs`, `/api/admin/*`
- `backend/auth_service.py`: tenant-aware authentication and user lookup
- `backend/tenant_service.py`: tenant registry and switching support
- `backend/data_structures.py`: `push_audit`, `get_recent_logs`
- `frontend/src/App.jsx`: role-gated routes
- `frontend/src/context/AuthContext.jsx`: login and tenant switching context

Notes:

- Audit visibility is tenant-scoped.
- Residual caveat: audit entries are stored in one shared list and filtered by tenant at read time, rather than physically partitioned by tenant.

## C5: Hot-stock cache with read-heavy benchmark

Status: Achieved

Evidence:

- `backend/data_structures.py`: bounded hot-query cache, promotion threshold, hit/miss metrics, benchmark routine
- `backend/app.py`: query cache metadata, `/api/stocks/cache/stats`, `/api/stocks/cache/benchmark`
- `frontend/src/pages/SystemDocumentation.jsx`: implementation-aligned documentation

Notes:

- The cache is a bounded LRU-style structure for stock/date lookups.
- The benchmark endpoint compares uncached and cached reads over a repeated workload.

## Residual Risks

- Query caching is in-memory only and resets with process restarts.
- Audit storage is logically tenant-scoped but not structurally partitioned per tenant.
- No dedicated frontend page currently visualizes cache stats or benchmark results; they are available at the backend API level.

## Final Verdict

- C1: Achieved
- C2: Achieved
- C3: Achieved
- C4: Achieved
- C5: Achieved
