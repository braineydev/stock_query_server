# Sample Inputs and Outputs

## 1. Login

### Request

```bash
curl -X POST http://127.0.0.1:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<DEMO_ADMIN_PASSWORD>","tenant_id":"global"}'
```

### Response (200)

```json
{
  "token": "<jwt-token>",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "ADMIN",
    "tenant_id": "global",
    "active_tenant_id": "global"
  }
}
```

## 2. Ingest Stock (C1)

### Request

```bash
curl -X POST http://127.0.0.1:5000/api/stocks/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "stock_id":"AAPL",
    "date":"2026-03-28",
    "open_price":180.1,
    "close_price":182.6,
    "high_price":184.0,
    "low_price":179.7,
    "volume":92000000
  }'
```

### Response (201)

```json
{
  "message": "Successfully ingested data for AAPL on 2026-03-28",
  "status": "success"
}
```

## 3. Query Stock (C1)

### Request

```bash
curl "http://127.0.0.1:5000/api/stocks/query?stock_id=AAPL&date=2026-03-28"
```

### Response (200)

```json
{
  "stock_id": "AAPL",
  "date": "2026-03-28",
  "data": {
    "open_price": 180.1,
    "close_price": 182.6,
    "high_price": 184.0,
    "low_price": 179.7,
    "volume": 92000000
  },
  "meta": {
    "complexity_note": "Lookup Complexity: O(1)"
  }
}
```

## 4. Rolling Metrics (C2)

### Request

```bash
curl "http://127.0.0.1:5000/api/stocks/analytics?stock_id=AAPL&window_size=14&metric_type=maximum"
```

### Response (200)

```json
{
  "stock_id": "AAPL",
  "metric_type": "maximum",
  "window_size": 14,
  "data": [{ "date": "2026-03-14", "value": 191.2 }],
  "meta": {
    "complexity_note": "Algorithm Complexity: O(N log K) using MaxHeap"
  }
}
```

## 5. Alert Create (C3)

### Request

```bash
curl -X POST http://127.0.0.1:5000/api/alerts \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"stock_id":"TSLA","condition":"greater_than","threshold":300}'
```

### Response (201)

```json
{
  "message": "Alert successfully created for TSLA",
  "meta": {
    "complexity_note": "Insertion Complexity: O(1)"
  }
}
```

## 6. Cache Benchmark (C5)

### Request

```bash
curl "http://127.0.0.1:5000/api/stocks/cache/benchmark?iterations=2000"
```

### Response (200)

```json
{
  "success": true,
  "benchmark": {
    "iterations": 2000,
    "uncached_ms": 42.7,
    "cached_ms": 12.1,
    "speedup": 3.53,
    "cache_hits": 1990,
    "cache_misses": 10
  }
}
```

## 7. Graph Rebuild and BFS/DFS

### Rebuild Request

```bash
curl -X POST http://127.0.0.1:5000/api/stocks/graph/rebuild \
  -H "Content-Type: application/json" \
  -d '{"min_overlap":30,"correlation_threshold":0.45}'
```

### Traverse Request (BFS)

```bash
curl "http://127.0.0.1:5000/api/stocks/graph/traverse?start=AAPL&method=bfs&max_depth=2"
```

### Traverse Response (200)

```json
{
  "traversal": {
    "start": "AAPL",
    "method": "bfs",
    "visited_order": ["AAPL", "MSFT", "TSLA"]
  },
  "meta": {
    "complexity_note": "Traversal Complexity: O(V + E)"
  }
}
```

## 8. Merge Sort and Binary Search

### Sorted History

```bash
curl "http://127.0.0.1:5000/api/stocks/history/sorted?stock_id=AAPL&order=asc&limit=30"
```

### Binary Search by Date

```bash
curl "http://127.0.0.1:5000/api/stocks/history/search?stock_id=AAPL&date=2026-03-28"
```

### Binary Search Response (200)

```json
{
  "stock_id": "AAPL",
  "date": "2026-03-28",
  "index": 29,
  "data": {
    "date": "2026-03-28",
    "open_price": 180.1,
    "close_price": 182.6,
    "high_price": 184.0,
    "low_price": 179.7,
    "volume": 92000000
  },
  "meta": {
    "complexity_note": "Merge Sort O(n log n) + Binary Search O(log n)"
  }
}
```
