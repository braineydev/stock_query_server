# Architecture Diagram

## Component Diagram (Mermaid)

```mermaid
flowchart LR
    U[Users: User/Auditor/Admin/SuperAdmin] --> FE[React Frontend]
    FE -->|JWT + REST| API[Flask API]

    API --> AUTH[Auth Service]
    API --> TENANT[Tenant Service]
    API --> DB[StockDatabase Engine]

    DB --> HM[Hash Map: stocks]
    DB --> Q[Queue: alerts_queue]
    DB --> S[Stack: audit_log]
    DB --> H[Heap: rolling max/min]
    DB --> C[Hot Cache: LRU-style]
    DB --> G[Graph: stock relationships]

    API --> SB[(Supabase: users/tenants/historical_stocks)]
    DB --> SB

    SIM[Market Simulator Thread] --> DB
```

## Data Flow

1. Frontend authenticates and receives JWT.
2. Ingestion route writes stock point into hash map.
3. Query route serves O(1) lookup and optional hot-cache path.
4. Analytics route executes deque/heap sliding-window algorithms.
5. Alert events are enqueued and processed FIFO.
6. Audit events are pushed to stack and retrieved latest-first.
7. Graph rebuild route derives edges from return correlations, then traversal route runs BFS/DFS.

## Deployment Notes

- Current mode is single-process Flask + optional Supabase.
- Recommended production path: external cache + worker queue + load-balanced API replicas.
