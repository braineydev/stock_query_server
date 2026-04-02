# System Design Report (Chapter 23 Structure)

## 1. Use Cases Generation

### Primary Users

- User: Ingest stock data, query stock history, create alerts.
- Auditor: Review tenant-scoped audit logs.
- Admin: Manage users, reset operational state.
- Super Admin: Manage tenants and switch tenant context.

### Core Use Cases

1. Daily stock ingestion by symbol/date.
2. Fast stock lookup by symbol/date.
3. Rolling analytics (average, minimum, maximum).
4. Threshold alert creation and event-triggering.
5. Tenant-scoped audit review.
6. Hot-stock cache benchmarking for read-heavy workloads.
7. Stock relationship traversal with BFS/DFS.
8. Historical search using merge sort plus binary search.

## 2. Constraints and Analysis

### Functional Constraints

- Multi-tenant RBAC must isolate operational data by tenant context.
- Ingestion and query APIs must remain responsive under repeated access.
- Alerts must process in FIFO order.
- Audit review must be reverse chronological (LIFO semantics).

### Non-Functional Constraints

- Typical query latency target: < 100 ms in local environment.
- Data freshness: live simulator updates every few seconds.
- Educational requirement: explicit DSA implementations and complexity evidence.

### Data Structure and Algorithm Selection

- Hash Map (dict): O(1) average stock lookup.
- Queue (deque): O(1) enqueue/dequeue for alert events.
- Stack (list): O(1) push for audit entries, reverse-read for latest-first logs.
- Heap (heapq): O(N log K) rolling max/min with lazy deletion.
- Graph: BFS/DFS traversal on stock-relationship network.
- Merge Sort: explicit O(n log n) sorting for date-ordered history.
- Binary Search: O(log n) search over sorted history.

## 3. Basic Design

### Backend Components

- Flask API layer exposes auth, stock, analytics, alert, cache, graph, and admin routes.
- StockDatabase service stores in-memory structures and orchestrates DSA operations.
- Supabase integration persists users, tenants, and historical stocks where available.
- Market simulator thread updates live stock points and pushes alert events.

### Frontend Components

- React SPA with route-level role protection.
- Pages for ingestion, querying, analytics, alerts, admin operations, and documentation.
- Axios-based API integration with JWT token propagation.

### Storage Model

- Historical stock records: in-memory hash map with optional Supabase backing.
- Tenant and user identities: Supabase tables with fallback in local mode.
- Cache layer: bounded in-memory LRU-style hot-query cache.

## 4. Bottlenecks

### Observed and Expected Bottlenecks

1. Pairwise graph rebuild is O(S^2 \* D) and grows quickly with many symbols.
2. In-memory state is process-bound; restart drops volatile cache and operational state.
3. Single-process Flask execution limits CPU parallelism.
4. Alert processing and simulator run in same process space.

### Mitigation in Current Version

- Cache benchmark endpoint measures uncached vs cached read performance.
- Tenant-normalization functions reduce cross-tenant leakage risk.
- Efficient deque/heap usage avoids repeated full-window recomputation.

## 5. Scalability (Iterative Improvement)

### Current Scalability Posture

- Vertical scaling only (single process, in-memory active structures).
- Read performance improved for hot keys via cache promotion.

### Proposed Iteration 1

- Externalize cache and queue to Redis.
- Move alert processing to background worker(s).
- Use managed Postgres as authoritative cold storage.

### Proposed Iteration 2

- Introduce message broker (Kafka/RabbitMQ) for ingestion and alert events.
- Shard data by tenant and/or symbol groups.
- Add horizontal API replicas behind load balancer.

### Proposed Iteration 3

- Precompute graph edges asynchronously.
- Add observability: p95 latency, queue depth, cache hit ratio, error budgets.

## Complexity Summary

- Ingest stock: O(1) average.
- Query stock by symbol/date: O(1) average.
- Rolling average (deque): O(N).
- Rolling max/min (heap): O(N log K).
- Alert queue processing: O(E) for E queued events.
- Merge sort history: O(n log n).
- Binary search history: O(log n).
- Graph traversal BFS/DFS: O(V + E).

## Benchmark Notes

- System includes cache benchmark endpoint comparing uncached and cached workloads.
- Benchmark should be reported with iterations, target symbols, uncached_ms, cached_ms, and speedup.
- Record at least three runs and report average speedup in submission.
