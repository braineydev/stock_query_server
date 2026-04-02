# Test Plan and Test Cases

## 1. Test Strategy

- Unit tests for algorithms and data-structure behaviors.
- Integration tests for API contracts and role/tenant access.
- Performance checks for cache benchmark and repeated queries.
- Security checks for auth, RBAC, and tenant isolation.

## 2. Scope

### In Scope

- Auth login and tenant context routing.
- C1-C5 feature endpoints.
- Graph BFS/DFS endpoint behavior.
- Merge sort and binary search endpoints.

### Out of Scope (Current Iteration)

- Distributed deployment failure modes.
- External load balancer behavior.

## 3. Test Environment

- Backend: Python Flask on localhost:5000.
- Frontend: React/Vite on localhost:3000.
- Optional Supabase connectivity for persistence scenarios.

## 4. Test Cases

| ID    | Area         | Test Case                | Input                          | Expected Result                |
| ----- | ------------ | ------------------------ | ------------------------------ | ------------------------------ |
| TC-01 | Auth         | Login success            | valid username/password/tenant | 200 + JWT token                |
| TC-02 | Auth         | Login failure            | wrong password                 | 401 error                      |
| TC-03 | C1 Ingest    | Ingest valid stock       | OHLCV payload                  | 201 success                    |
| TC-04 | C1 Query     | Query known record       | stock_id + date                | 200 with data                  |
| TC-05 | C1 Query     | Query missing record     | stock_id + unknown date        | 404                            |
| TC-06 | C2 Analytics | Rolling average          | stock_id, window, average      | 200 + series                   |
| TC-07 | C2 Analytics | Rolling max              | stock_id, window, maximum      | 200 + series                   |
| TC-08 | C3 Alerts    | Create alert             | stock_id, condition, threshold | 201 + configured alert         |
| TC-09 | C3 Alerts    | Trigger alert            | market tick crosses threshold  | alert status becomes triggered |
| TC-10 | C4 Audit     | Get logs as auditor      | valid JWT role AUDITOR         | 200 + logs                     |
| TC-11 | C4 RBAC      | Unauthorized admin route | role USER on /api/admin/users  | 403                            |
| TC-12 | C5 Cache     | Cache benchmark          | iterations=2000                | 200 + cached/uncached metrics  |
| TC-13 | Graph        | Rebuild graph            | min_overlap + threshold        | 200 + node/edge summary        |
| TC-14 | Graph        | BFS traversal            | start=AAPL, method=bfs         | 200 + visited_order            |
| TC-15 | Graph        | DFS traversal            | start=AAPL, method=dfs         | 200 + visited_order            |
| TC-16 | Sort/Search  | Sorted history           | stock_id + order               | 200 sorted by date             |
| TC-17 | Sort/Search  | Binary search hit        | stock_id + existing date       | 200 + matching record          |
| TC-18 | Sort/Search  | Binary search miss       | stock_id + missing date        | 404                            |

## 5. Security Validation Cases

- Verify JWT required on protected admin/audit endpoints.
- Verify role restrictions (USER cannot call admin routes).
- Verify tenant context switching only by SUPER_ADMIN.
- Verify no cross-tenant data leakage in alert and log views.

## 6. Performance Checks

- Run cache benchmark endpoint with 2K, 5K, and 10K iterations.
- Record uncached_ms, cached_ms, and speedup.
- Track median and p95 response time for repeated queries.

## 7. Exit Criteria

- All critical API tests pass.
- No auth or RBAC bypass observed in manual checks.
- Benchmark data captured and included in report appendix.
