import {
  ArrowRightLeft,
  BookOpen,
  ChevronRight,
  Clock,
  Database,
  Hash,
  Layers,
  Network,
  SortAsc,
  Zap,
} from "lucide-react";

const SystemDocumentation = () => {
  const dataStructures = [
    {
      id: "hash-tables",
      title: "Hash Tables (Dictionaries)",
      icon: <Hash className="text-blue-500" size={24} />,
      variant: "C1 — Stock Ingestion & Query",
      complexity: "O(1) Average Time",
      description:
        "A Hash Table (implemented via Python dictionaries) maps keys to values using a hash function. In our system, it maps stock IDs to dates, and dates to stock records.",
      implementation: "stocks = HashMap<stock_id, HashMap<date, StockRecord>>",
      details:
        "This allows the system to look up a specific stock price on a specific date instantaneously. Whether the system holds 10 records or 10 million, the time to retrieve the data remains constant. This is why our Query engine shows ~0.002ms execution times.",
    },
    {
      id: "deques",
      title: "Double-Ended Queues (Deques)",
      icon: <ArrowRightLeft className="text-green-500" size={24} />,
      variant: "C2 — Rolling Average Analytics",
      complexity: "O(N) Time / O(K) Space",
      description:
        'A Deque allows insertion and deletion at both ends in O(1) time. We use it to maintain a "Sliding Window" of stock prices.',
      implementation: "window = deque(maxlen=K)",
      details:
        "When calculating a rolling 5-day average, we add the newest day's price to the right of the deque, and pop the oldest day's price from the left. By keeping a running sum, we avoid recalculating the entire window, bringing the total algorithm complexity down to O(N).",
    },
    {
      id: "heaps",
      title: "Priority Queues (Heaps)",
      icon: <Network className="text-purple-500" size={24} />,
      variant: "C2 — Rolling Max/Min Analytics",
      complexity: "O(N log K) Time",
      description:
        "A Heap is a specialized tree-based structure that always keeps the maximum (or minimum) element at the root node for O(1) retrieval.",
      implementation:
        "max_heap = [], heapq.heappush(max_heap, (-price, index))",
      details:
        'To find the rolling maximum over a window, we push prices into a Max Heap. We use a technique called "Lazy Deletion"—we only remove outdated prices when they bubble up to the root. This is vastly more efficient than sorting the window every single day.',
    },
    {
      id: "queues",
      title: "FIFO Queues",
      icon: <Database className="text-orange-500" size={24} />,
      variant: "C3 — Alert Event System",
      complexity: "O(1) Enqueue / Dequeue",
      description:
        "A Queue operates on a First-In-First-Out (FIFO) principle. The first event added is the first one processed.",
      implementation: "alertsQueue = Queue<AlertEvent>",
      details:
        "In our event-driven architecture, when new stock data is ingested, an event is pushed to the back of the queue. A background processor continuously pops events from the front to check them against user thresholds, preventing system lockups during high data volumes.",
    },
    {
      id: "stacks",
      title: "LIFO Stacks",
      icon: <Layers className="text-red-500" size={24} />,
      variant: "C4 — Audit Logs",
      complexity: "O(1) Push / Pop",
      description:
        "A Stack operates on a Last-In-First-Out (LIFO) principle. It is analogous to a stack of plates; you add to the top, and remove from the top.",
      implementation: "auditLog = Stack<AuditEntry>",
      details:
        "Every time a user performs an action (queries data, sets an alert), an entry is pushed to the top of the stack. When an Admin reviews the logs, they read from the top down, ensuring the most recent system events are always displayed first.",
    },
    {
      id: "sorting",
      title: "Sorting Algorithms",
      icon: <SortAsc className="text-teal-500" size={24} />,
      variant: "Frontend Tables",
      complexity: "O(N log N) Time",
      description:
        "While the backend uses unordered Hash Maps for O(1) storage, human users require ordered data.",
      implementation: "Array.prototype.sort()",
      details:
        "We implement sorting on the React frontend. Modern JavaScript engines use highly optimized algorithms (like Timsort or Merge Sort) to sort the arrays by Date or Price in O(N log N) time before rendering them to the screen.",
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-20 -mt-20 opacity-50 blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3 mb-4">
            <BookOpen className="text-blue-600" size={32} />
            System Documentation
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed max-w-3xl">
            This platform is an educational simulation demonstrating how
            fundamental computer science data structures power highly scalable
            financial systems. Below is the technical breakdown of the
            algorithms driving Variants C1 through C4.
          </p>
        </div>
      </div>

      {/* BIG-O PRIMER */}
      <div className="bg-gray-900 rounded-xl p-6 text-gray-300 shadow-md">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
          <Clock className="text-purple-400" size={20} />
          Understanding Big-O Complexity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-sm">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <span className="text-green-400 font-bold text-lg block mb-1">
              O(1) - Constant
            </span>
            Execution time remains exactly the same regardless of dataset size.
            The holy grail of algorithm efficiency.
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <span className="text-yellow-400 font-bold text-lg block mb-1">
              O(N) - Linear
            </span>
            Execution time grows directly in proportion to the size of the
            dataset.
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <span className="text-orange-400 font-bold text-lg block mb-1">
              O(N log N) - Linearithmic
            </span>
            The theoretical limit for comparison-based sorting. Highly efficient
            for large datasets.
          </div>
        </div>
      </div>

      {/* DATABASE SCHEMA SECTION */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-8 border border-slate-200 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3 mb-6">
          <Database className="text-blue-600" size={28} />
          Database Schema
        </h2>

        <div className="space-y-6">
          {/* Users Table */}
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              public.users Table
            </h3>
            <div className="bg-gray-900 text-gray-300 font-mono text-xs p-4 rounded-lg border border-gray-800 overflow-x-auto">
              <pre>{`CREATE TABLE public.users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'USER',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);`}</pre>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h4 className="font-bold text-blue-900 mb-2">
                  Role Constraint
                </h4>
                <div className="bg-gray-900 text-gray-300 font-mono text-xs p-3 rounded border border-gray-800 overflow-x-auto">
                  <pre>{`ALTER TABLE public.users
ADD CONSTRAINT role_check
CHECK (role IN ('SUPER_ADMIN',
  'ADMIN','AUDITOR','USER'));`}</pre>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <h4 className="font-bold text-green-900 mb-2">
                  Status Constraint
                </h4>
                <div className="bg-gray-900 text-gray-300 font-mono text-xs p-3 rounded border border-gray-800 overflow-x-auto">
                  <pre>{`ALTER TABLE public.users
ADD CONSTRAINT status_check
CHECK (status IN ('active',
  'inactive'));`}</pre>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-purple-50 p-4 rounded-lg border border-purple-100">
              <h4 className="font-bold text-purple-900 mb-2">Sample Data</h4>
              <div className="bg-gray-900 text-gray-300 font-mono text-xs p-3 rounded border border-gray-800 overflow-x-auto">
                <pre>{`INSERT INTO public.users 
  (username, password, role, status)
VALUES
  ('brainey', 'decode26', 'SUPER_ADMIN', 'active'),
  ('user01', 'password01', 'USER', 'active'),
  ('user02', 'password02', 'USER', 'active');`}</pre>
              </div>
            </div>
          </div>

          {/* Column Reference */}
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Column Reference
            </h3>
            <div className="space-y-3">
              <div className="flex gap-4 items-start">
                <span className="font-mono bg-gray-200 text-gray-800 px-2 py-1 rounded text-sm font-bold whitespace-nowrap">
                  id
                </span>
                <p className="text-gray-700 text-sm">
                  Auto-incrementing primary key identifier
                </p>
              </div>
              <div className="flex gap-4 items-start">
                <span className="font-mono bg-gray-200 text-gray-800 px-2 py-1 rounded text-sm font-bold whitespace-nowrap">
                  username
                </span>
                <p className="text-gray-700 text-sm">
                  Unique username for authentication
                </p>
              </div>
              <div className="flex gap-4 items-start">
                <span className="font-mono bg-gray-200 text-gray-800 px-2 py-1 rounded text-sm font-bold whitespace-nowrap">
                  password
                </span>
                <p className="text-gray-700 text-sm">
                  Hashed password for user authentication
                </p>
              </div>
              <div className="flex gap-4 items-start">
                <span className="font-mono bg-gray-200 text-gray-800 px-2 py-1 rounded text-sm font-bold whitespace-nowrap">
                  role
                </span>
                <p className="text-gray-700 text-sm">
                  User role: SUPER_ADMIN, ADMIN, AUDITOR, or USER
                </p>
              </div>
              <div className="flex gap-4 items-start">
                <span className="font-mono bg-gray-200 text-gray-800 px-2 py-1 rounded text-sm font-bold whitespace-nowrap">
                  status
                </span>
                <p className="text-gray-700 text-sm">
                  Account status: active or inactive
                </p>
              </div>
              <div className="flex gap-4 items-start">
                <span className="font-mono bg-gray-200 text-gray-800 px-2 py-1 rounded text-sm font-bold whitespace-nowrap">
                  created_at
                </span>
                <p className="text-gray-700 text-sm">
                  Timestamp of account creation (defaults to current time)
                </p>
              </div>
              <div className="flex gap-4 items-start">
                <span className="font-mono bg-gray-200 text-gray-800 px-2 py-1 rounded text-sm font-bold whitespace-nowrap">
                  last_login
                </span>
                <p className="text-gray-700 text-sm">
                  Timestamp of user's most recent login
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DATA STRUCTURES LIST */}
      <div className="space-y-6 mt-8">
        {dataStructures.map(ds => (
          <div
            key={ds.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="border-b border-gray-100 bg-gray-50/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                  {ds.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">
                    {ds.title}
                  </h3>
                  <p className="text-sm font-medium text-gray-500">
                    {ds.variant}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm w-fit">
                <Zap className="text-yellow-500" size={16} />
                <span className="font-mono text-sm font-semibold text-gray-700">
                  {ds.complexity}
                </span>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-4 flex flex-col justify-center">
                <div className="bg-gray-900 text-gray-300 font-mono text-xs p-4 rounded-lg border border-gray-800">
                  <span className="text-gray-500 block mb-2">
                    // Pseudocode Implementation
                  </span>
                  <code className="text-blue-300">{ds.implementation}</code>
                </div>
              </div>
              <div className="md:col-span-8 space-y-3">
                <p className="text-gray-700 leading-relaxed font-medium">
                  {ds.description}
                </p>
                <div className="flex gap-2 items-start text-gray-600 bg-blue-50/50 p-4 rounded-lg border border-blue-100/50">
                  <ChevronRight
                    className="text-blue-400 mt-0.5 flex-shrink-0"
                    size={18}
                  />
                  <p className="text-sm leading-relaxed">{ds.details}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemDocumentation;
