# SQS GMN - Stock Query Server (Theme C)

This project is a full-stack stock query server designed for DSA coursework using the Chapter 23 system-design method. It demonstrates variants C1-C5 with explicit data structures and algorithms.

1. Aloo John BSCCS/2025/409821: System Design Lead and API Contracts
2. Natasha Mudavali BSCCS/2025/41200: Data Architecture and Indexed Storage
3. Gerald Wachira BSCCS/2025/40699: Ingestion and Storage Optimization
4. Lewis Thegetha BSCCS/2025/69379: Rolling Metrics and Heap/Deque Algorithms
5. John Timothy BSCCS/2025/35868: Performance and Memory Optimization
6. Abraham kibichii BSCCS/2025/39564: Event Queue and Processing
7. Cliff Ogutu BSCCS/2025/42307: Alerts and Notification Handling
8. ⁠Franklin Njenga BSCCS/2025/40683: Authentication and Access Control
9. Esther BSCCS/2025/39862: Audit Logging and Compliance
10. Mohamed Amin BSCCS/2025/41039: Testing, Integration, and Validation

## Problem Statement

Build a mini-system that supports stock ingestion, fast date-based querying, rolling analytics, threshold alerts, multi-tenant role-based access, audit trails, and read-heavy cache benchmarking while clearly justifying DSA choices and scalability decisions.

## Project Structure

```
sqsgmn/
├── backend/                  # Flask API and algorithms
│   ├── app.py               # Main routes and integration
│   ├── data_structures.py   # HashMap, Stack, Queue, Deque, Heap, cache
│   ├── algorithms.py        # Graph BFS/DFS, merge sort, binary search
│   ├── auth_service.py      # Supabase/local auth and role handling
│   ├── tenant_service.py    # Tenant registry and switching
│   ├── sql/001_multi_tenant_schema.sql
│   └── requirements.txt
├── frontend/                 # React app
└── docs at repository root   # Report, architecture, tests, samples
```

## Chapter 23 Design Method (Required 5 Steps)

- Use Cases Generation, Constraints and Analysis, Basic Design, Bottlenecks, Scalability:
  - [SYSTEM_DESIGN_REPORT.md](SYSTEM_DESIGN_REPORT.md)

## Architecture Diagram

- Mermaid architecture and flow diagram:
  - [ARCHITECTURE.md](ARCHITECTURE.md)

## Features and DSA Evidence

- C1 Ingestion and Query:
  - Hash Map for O(1) average lookup.
- C2 Rolling Metrics:
  - Deque for moving average, heaps for rolling max/min.
- C3 Alerts:
  - FIFO queue for threshold event processing.
- C4 Multi-tenant Access and Audit:
  - JWT role-based routes + tenant context + stack-style audit stream.
- C5 Hot Cache + Benchmark:
  - Bounded LRU-style cache with hit/miss and benchmark endpoint.
- Additional explicit algorithms:
  - Graph traversal (BFS/DFS).
  - Merge sort O(n log n) and binary search O(log n).

## Setup and Run Instructions

## Backend Setup

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Backend runs at http://localhost:5000

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:3000

## Environment Configuration

Use template:

```bash
cp backend/.env.example backend/.env
```

Then set Supabase and JWT values in backend/.env.

## Sample Inputs and Outputs

- API request/response examples (login, ingest, query, analytics, alerts, cache benchmark, graph, sort/search):
  - [SAMPLE_INPUT_OUTPUT.md](SAMPLE_INPUT_OUTPUT.md)

## Test Plan and Test Cases

- Test strategy, matrix, and validation criteria:
  - [TEST_PLAN.md](TEST_PLAN.md)

## Variant Coverage Summary

- C1-C5 audit mapping:
  - [VARIANT_AUDIT_REPORT.md](VARIANT_AUDIT_REPORT.md)

## Team Member Roles

1. Aloo John BSCCS/2025/409821: System Design Lead and API Contracts
2. Natasha Mudavali BSCCS/2025/41200: Data Architecture and Indexed Storage
3. Gerald Wachira BSCCS/2025/40699: Ingestion and Storage Optimization
4. Lewis Thegetha BSCCS/2025/69379: Rolling Metrics and Heap/Deque Algorithms
5. John Timothy BSCCS/2025/35868: Performance and Memory Optimization
6. Abraham kibichii BSCCS/2025/39564: Event Queue and Processing
7. Cliff Ogutu BSCCS/2025/42307: Alerts and Notification Handling
8. ⁠Franklin Njenga BSCCS/2025/40683: Authentication and Access Control
9. Esther BSCCS/2025/39862: Audit Logging and Compliance
10. Mohamed Amin BSCCS/2025/41039: Testing, Integration, and Validation

## Demo Video (YouTube)

Add final video link here before submission:

- YouTube Demo Link: TODO

## Technologies

### Backend

- Python 3.x
- Flask
- PyJWT
- Flask-CORS
- Supabase Python client

### Frontend

- React 18
- React Router
- Axios
- Recharts
- Tailwind CSS
- Vite

## License

MIT
