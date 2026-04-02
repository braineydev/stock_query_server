import heapq
import os
import time
from collections import OrderedDict, deque
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from supabase_client import get_supabase_client
from werkzeug.security import generate_password_hash


class StockDatabase:
    def __init__(self):
        # 1. Hash Map: Fast stock retrieval -> O(1)
        # Structure: { stock_id: { date: StockRecord_Dict } }
        self.stocks = {}

        # C5. Hot Query Cache: bounded LRU cache for read-heavy lookups
        self.query_cache = OrderedDict()
        self.cache_capacity = max(1, int(os.getenv("HOT_CACHE_CAPACITY", "128")))
        self.hot_stock_threshold = max(1, int(os.getenv("HOT_STOCK_THRESHOLD", "3")))
        self.stock_access_counts = {}
        self.cache_metrics = {
            "hits": 0,
            "misses": 0,
            "puts": 0,
            "evictions": 0,
            "benchmark_runs": 0,
        }

        # 2. Queue: Alert event processing (FIFO) -> O(1) enqueue/dequeue
        self.alerts_queue = {"global": deque()}
        self.active_alerts = []  # Stores user-defined alert thresholds
        self.alerts_config = {"global": {}}  # Maps tenant -> stock_id -> alerts
        self.triggered_alerts = {"global": []}  # Maps tenant -> triggered feed
        self.alert_counter = {"global": 1}

        # 3. Stack: Audit logging (LIFO) -> O(1) push/pop
        self.audit_log = []

        # 4. Max Heap: Ranking stocks (Simulated using Python's min-heap with negative values)
        self.top_stocks = []

        # 5. Hash Map for Users -> O(1) lookup
        demo_password = os.getenv("DEMO_DEFAULT_PASSWORD", "change-this-demo-password")
        demo_password_hash = generate_password_hash(demo_password)
        self.users = {
            "admin": {
                "id": 1,
                "username": "admin",
                "password_hash": demo_password_hash,
                "role": "Admin",
            },
            "auditor": {
                "id": 2,
                "username": "auditor",
                "password_hash": demo_password_hash,
                "role": "Auditor",
            },
            "user": {
                "id": 3,
                "username": "user",
                "password_hash": demo_password_hash,
                "role": "User",
            },
        }
        self.user_counter = 4

        # 6. Live Market State
        self.live_session = {}
        self.market_open = False
        self.market_timezone = os.getenv("MARKET_TIMEZONE", "Africa/Nairobi")
        self.market_close_hour = int(os.getenv("MARKET_CLOSE_HOUR", "16"))
        self.market_close_minute = int(os.getenv("MARKET_CLOSE_MINUTE", "0"))
        self.current_market_date = None
        self.last_closed_date = None

        # 7. The Cold Storage: shared Supabase Connection
        self.supabase = get_supabase_client()
        self.db_connected = self.supabase is not None
        if not self.db_connected:
            print("Supabase is unavailable. Running in RAM-only mode.")

    def normalize_tenant_id(self, tenant_id=None):
        normalized = (tenant_id or "global").strip()
        return normalized or "global"

    def ensure_tenant_state(self, tenant_id=None):
        normalized_tenant_id = self.normalize_tenant_id(tenant_id)
        if normalized_tenant_id not in self.alerts_queue:
            self.alerts_queue[normalized_tenant_id] = deque()
        if normalized_tenant_id not in self.alerts_config:
            self.alerts_config[normalized_tenant_id] = {}
        if normalized_tenant_id not in self.triggered_alerts:
            self.triggered_alerts[normalized_tenant_id] = []
        if normalized_tenant_id not in self.alert_counter:
            self.alert_counter[normalized_tenant_id] = 1
        return normalized_tenant_id

    def _cache_key(self, stock_id, date):
        return (stock_id, date)

    def is_hot_stock(self, stock_id):
        return self.stock_access_counts.get(stock_id, 0) >= self.hot_stock_threshold

    def get_hot_stocks(self, limit=5):
        ranked = sorted(
            self.stock_access_counts.items(),
            key=lambda item: (-item[1], item[0]),
        )
        return [stock_id for stock_id, _ in ranked[:limit]]

    def get_cache_stats(self):
        return {
            **self.cache_metrics,
            "capacity": self.cache_capacity,
            "size": len(self.query_cache),
            "hot_stock_threshold": self.hot_stock_threshold,
            "hot_stocks": self.get_hot_stocks(),
        }

    def reset_cache_metrics(self):
        self.cache_metrics = {
            "hits": 0,
            "misses": 0,
            "puts": 0,
            "evictions": 0,
            "benchmark_runs": 0,
        }

    def clear_query_cache(self, reset_metrics=False):
        self.query_cache.clear()
        if reset_metrics:
            self.reset_cache_metrics()

    def _cache_get(self, stock_id, date):
        key = self._cache_key(stock_id, date)
        if key not in self.query_cache:
            self.cache_metrics["misses"] += 1
            return None

        self.query_cache.move_to_end(key)
        self.cache_metrics["hits"] += 1
        return dict(self.query_cache[key])

    def _cache_set(self, stock_id, date, record):
        key = self._cache_key(stock_id, date)
        self.query_cache[key] = dict(record)
        self.query_cache.move_to_end(key)
        self.cache_metrics["puts"] += 1

        if len(self.query_cache) > self.cache_capacity:
            self.query_cache.popitem(last=False)
            self.cache_metrics["evictions"] += 1

    def _cache_delete(self, stock_id, date=None):
        if date is not None:
            self.query_cache.pop(self._cache_key(stock_id, date), None)
            return

        keys_to_remove = [key for key in self.query_cache if key[0] == stock_id]
        for key in keys_to_remove:
            self.query_cache.pop(key, None)

    # --- STARTUP: Hydrate Hash Map from Supabase ---
    def hydrate_from_db(self):
        """Startup Task: Loads all historical data from Supabase into the Hash Map."""
        if not self.db_connected:
            return

        print("[storage] Hydrating O(1) Hash Map from Supabase cold storage...")
        try:
            response = self.supabase.table("historical_stocks").select("*").execute()

            count = 0
            for row in response.data:
                stock_id = row["stock_id"]
                date = row["date"]
                record = {
                    "open_price": float(row["open_price"]),
                    "close_price": float(row["close_price"]),
                    "high_price": float(row["high_price"]),
                    "low_price": float(row["low_price"]),
                    "volume": int(row["volume"]),
                }
                # Populate the Python Dictionary!
                if stock_id not in self.stocks:
                    self.stocks[stock_id] = {}
                self.stocks[stock_id][date] = record
                count += 1

            print(f"[storage] Hydration complete. Loaded {count} records into RAM.")
            self.push_audit(f"Hydrated {count} records from Supabase into RAM.")
        except Exception as e:
            print(f"[storage] Hydration failed: {e}")
            self.push_audit(f"Hydration failed: {e}")

    def get_market_now(self):
        """Returns the current localized market time."""
        try:
            return datetime.now(ZoneInfo(self.market_timezone))
        except ZoneInfoNotFoundError:
            if not getattr(self, "_timezone_warning_logged", False):
                print(
                    f"Timezone '{self.market_timezone}' not available. Falling back to UTC."
                )
                self._timezone_warning_logged = True
            return datetime.now(ZoneInfo("UTC"))

    def get_market_date(self):
        """Returns the current market date in YYYY-MM-DD format."""
        return self.get_market_now().strftime("%Y-%m-%d")

    def market_close_reached(self, current_time=None):
        """Checks whether the configured market close time has passed."""
        current_time = current_time or self.get_market_now()
        return (current_time.hour, current_time.minute) >= (
            self.market_close_hour,
            self.market_close_minute,
        )

    def open_market_day(self, market_date=None):
        """Initializes the live candle for the provided real market date."""
        if not self.stocks:
            return False

        market_date = market_date or self.get_market_date()
        self.live_session = {}
        for symbol, dates_dict in self.stocks.items():
            if not dates_dict:
                continue

            latest_date = max(dates_dict.keys())
            latest = dates_dict[latest_date]
            last_close = float(latest["close_price"])
            self.live_session[symbol] = {
                "open_price": round(last_close, 2),
                "close_price": round(last_close, 2),
                "high_price": round(last_close, 2),
                "low_price": round(last_close, 2),
                "volume": int(latest.get("volume", 0)),
            }

        self.market_open = bool(self.live_session)
        self.current_market_date = market_date if self.market_open else None
        if self.market_open:
            self.push_audit(f"Market opened for {market_date} ({self.market_timezone})")

        return self.market_open

    # --- MARKET CLOSE: Save to Hash Map AND Supabase ---
    def close_market(self, market_date=None):
        """Commits the current real-day candle to the Hash Map and Supabase."""
        if not self.market_open:
            return

        date_str = market_date or self.current_market_date or self.get_market_date()
        db_insert_payload = []

        for symbol, data in self.live_session.items():
            # 1. Save to the Primary Engine (In-Memory Hash Map)
            self.ingest_stock(symbol, date_str, data.copy())

            # 2. Prep for Cold Storage Backup
            db_insert_payload.append(
                {
                    "stock_id": symbol,
                    "date": date_str,
                    "open_price": data["open_price"],
                    "close_price": data["close_price"],
                    "high_price": data["high_price"],
                    "low_price": data["low_price"],
                    "volume": data["volume"],
                }
            )

        # 3. Asynchronously push to Supabase (Write-Behind)
        if self.db_connected and db_insert_payload:
            try:
                self.supabase.table("historical_stocks").upsert(
                    db_insert_payload
                ).execute()
                print(f"[storage] Backed up OHLC data to Supabase for {date_str}")
            except Exception as e:
                print(f"Database backup failed: {e}")

        self.market_open = False
        self.live_session = {}
        self.current_market_date = None
        self.last_closed_date = date_str
        self.push_audit(
            f"Market closed. Saved OHLC data for {date_str} ({self.market_timezone})."
        )

    # --- C1: Ingestion & Query ---
    def ingest_stock(self, stock_id, date, record):
        """Time Complexity: O(1) average case"""
        if stock_id not in self.stocks:
            self.stocks[stock_id] = {}
        self.stocks[stock_id][date] = record
        self._cache_delete(stock_id, date)

        # Log to audit stack
        self.push_audit(f"Stock data ingested for {stock_id} on {date}")

        # Enqueue alert check
        self.alerts_queue[self.ensure_tenant_state("global")].append(
            {"stock_id": stock_id, "price": record["close_price"], "date": date}
        )
        self.process_alerts()

    def query_stock(
        self, stock_id, date, use_cache=True, log_audit=True, track_access=True
    ):
        """Time Complexity: O(1) average case"""
        if track_access:
            self.stock_access_counts[stock_id] = (
                self.stock_access_counts.get(stock_id, 0) + 1
            )

        if log_audit:
            self.push_audit(f"Queried {stock_id} on {date}")

        if use_cache:
            cached_record = self._cache_get(stock_id, date)
            if cached_record is not None:
                return cached_record

        record = self.stocks.get(stock_id, {}).get(date, None)
        if record is not None and use_cache and self.is_hot_stock(stock_id):
            self._cache_set(stock_id, date, record)

        return record

    def benchmark_query_workload(self, iterations=2000, stock_ids=None):
        """Run a simple read-heavy benchmark comparing uncached vs cached lookups."""
        if not self.stocks:
            return {
                "success": False,
                "error": "No stock data available for benchmarking.",
            }

        selected_stock_ids = stock_ids or self.get_hot_stocks(limit=3)
        if not selected_stock_ids:
            selected_stock_ids = list(self.stocks.keys())[:3]

        targets = []
        for stock_id in selected_stock_ids:
            if stock_id not in self.stocks or not self.stocks[stock_id]:
                continue
            latest_date = max(self.stocks[stock_id].keys())
            targets.append((stock_id, latest_date))

        if not targets:
            return {
                "success": False,
                "error": "Requested benchmark stocks do not exist.",
            }

        workload = [targets[index % len(targets)] for index in range(iterations)]

        uncached_start = time.perf_counter()
        for stock_id, date in workload:
            self.query_stock(
                stock_id, date, use_cache=False, log_audit=False, track_access=False
            )
        uncached_ms = (time.perf_counter() - uncached_start) * 1000

        self.clear_query_cache()
        for stock_id, date in targets:
            self.stock_access_counts[stock_id] = max(
                self.stock_access_counts.get(stock_id, 0), self.hot_stock_threshold
            )
            record = self.stocks.get(stock_id, {}).get(date)
            if record is not None:
                self._cache_set(stock_id, date, record)

        hits_before = self.cache_metrics["hits"]
        misses_before = self.cache_metrics["misses"]

        cached_start = time.perf_counter()
        for stock_id, date in workload:
            self.query_stock(
                stock_id, date, use_cache=True, log_audit=False, track_access=False
            )
        cached_ms = (time.perf_counter() - cached_start) * 1000

        hit_delta = self.cache_metrics["hits"] - hits_before
        miss_delta = self.cache_metrics["misses"] - misses_before
        self.cache_metrics["benchmark_runs"] += 1

        speedup = None
        if cached_ms > 0:
            speedup = round(uncached_ms / cached_ms, 4)

        return {
            "success": True,
            "benchmark": {
                "iterations": iterations,
                "targets": [
                    {
                        "stock_id": stock_id,
                        "date": date,
                        "access_count": self.stock_access_counts.get(stock_id, 0),
                    }
                    for stock_id, date in targets
                ],
                "uncached_ms": round(uncached_ms, 4),
                "cached_ms": round(cached_ms, 4),
                "speedup": speedup,
                "cache_hits": hit_delta,
                "cache_misses": miss_delta,
            },
            "cache": self.get_cache_stats(),
        }

    # --- C2: Rolling Metrics (Deque) ---
    def get_rolling_average(self, stock_id, dates, window_size):
        """
        Time Complexity: O(n) where n is number of dates.
        Space Complexity: O(k) where k is window_size.
        """

        if stock_id not in self.stocks:
            return []

        window = deque()
        rolling_averages = []
        current_sum = 0

        for date in dates:
            record = self.stocks[stock_id].get(date)
            if not record:
                continue

            price = record["close_price"]
            window.append(price)
            current_sum += price

            if len(window) > window_size:
                removed_price = window.popleft()
                current_sum -= removed_price

            if len(window) == window_size:
                rolling_averages.append(
                    {"date": date, "avg": current_sum / window_size}
                )

        return rolling_averages

    def calculate_rolling_metrics(self, stock_id, window_size, metric_type):
        """
        Calculates rolling metrics over a specified window.
        - Average: Uses Deque (O(N) time)
        - Maximum: Uses MaxHeap with lazy deletion (O(N log K) time)
        - Minimum: Uses MinHeap with lazy deletion (O(N log K) time)
        """
        if stock_id not in self.stocks:
            return None, f"Stock {stock_id} not found."

        # Sort dates to ensure chronological processing
        dates = sorted(self.stocks[stock_id].keys())
        if len(dates) < window_size:
            return None, "Not enough data for the specified window size."

        results = []

        if metric_type == "average":
            # --- DEQUE IMPLEMENTATION (O(N)) ---
            window = deque()
            current_sum = 0

            for i, date in enumerate(dates):
                price = self.stocks[stock_id][date]["close_price"]
                window.append(price)
                current_sum += price

                # Maintain window size
                if len(window) > window_size:
                    current_sum -= window.popleft()

                # Record result once window is full
                if i >= window_size - 1:
                    results.append(
                        {"date": date, "value": round(current_sum / window_size, 4)}
                    )

        elif metric_type == "maximum":
            # --- MAX-HEAP IMPLEMENTATION (O(N log K)) ---
            # Python's heapq is a min-heap. We simulate a max-heap by storing negative prices.
            max_heap = []

            for i, date in enumerate(dates):
                price = self.stocks[stock_id][date]["close_price"]
                # Push (-price, index)
                heapq.heappush(max_heap, (-price, i))

                # Lazy Deletion: If the max element at the root is outside our current window, pop it.
                while max_heap[0][1] <= i - window_size:
                    heapq.heappop(max_heap)

                if i >= window_size - 1:
                    # Convert back to positive for the result
                    results.append({"date": date, "value": -max_heap[0][0]})

        elif metric_type == "minimum":
            # --- MIN-HEAP IMPLEMENTATION (O(N log K)) ---
            min_heap = []

            for i, date in enumerate(dates):
                price = self.stocks[stock_id][date]["close_price"]
                # Push (price, index)
                heapq.heappush(min_heap, (price, i))

                # Lazy Deletion
                while min_heap[0][1] <= i - window_size:
                    heapq.heappop(min_heap)

                if i >= window_size - 1:
                    results.append({"date": date, "value": min_heap[0][0]})
        else:
            return None, "Invalid metric type. Use 'average', 'maximum', or 'minimum'."

        # Log the action to our Audit Stack
        self.push_audit(
            f"Calculated rolling {metric_type} for {stock_id} (window: {window_size})"
        )

        return results, "Success"

    # --- C3: Alerts (Queue) ---
    def create_alert(
        self, stock_id, condition, threshold, created_by="User", tenant_id="global"
    ):
        """Stores a new user-defined alert threshold."""
        normalized_tenant_id = self.ensure_tenant_state(tenant_id)
        tenant_alerts = self.alerts_config[normalized_tenant_id]

        if stock_id not in tenant_alerts:
            tenant_alerts[stock_id] = []

        alert = {
            "id": self.alert_counter[normalized_tenant_id],
            "stock_id": stock_id,
            "condition": condition.lower(),  # 'greater_than' or 'less_than'
            "threshold": float(threshold),
            "created_by": created_by,
            "status": "active",
            "tenant_id": normalized_tenant_id,
        }
        tenant_alerts[stock_id].append(alert)
        self.alert_counter[normalized_tenant_id] += 1

        # Log to audit stack
        self.push_audit(
            f"Alert created for {stock_id}: {condition} {threshold}",
            normalized_tenant_id,
        )
        return alert

    def process_alerts(self, tenant_id=None):
        """
        Processes the alert queue (FIFO).
        Dequeue Complexity: O(1)
        """
        processed_count = 0

        tenant_ids = (
            [self.ensure_tenant_state(tenant_id)]
            if tenant_id is not None
            else list(self.alerts_queue.keys())
        )

        for normalized_tenant_id in tenant_ids:
            tenant_queue = self.alerts_queue.get(normalized_tenant_id)
            tenant_alerts = self.alerts_config.get(normalized_tenant_id, {})
            tenant_triggered_alerts = self.triggered_alerts.get(
                normalized_tenant_id, []
            )

            while tenant_queue:
                # Pop from the left of the deque (O(1) time)
                event = tenant_queue.popleft()
                stock_id = event["stock_id"]
                current_price = event["price"]
                date = event["date"]

                # If there are active alerts configured for this stock, check them
                if stock_id in tenant_alerts:
                    for alert in tenant_alerts[stock_id]:
                        if alert["status"] != "active":
                            continue

                        triggered = False
                        if (
                            alert["condition"] == "greater_than"
                            and current_price >= alert["threshold"]
                        ):
                            triggered = True
                        elif (
                            alert["condition"] == "less_than"
                            and current_price <= alert["threshold"]
                        ):
                            triggered = True

                        if triggered:
                            # Update status to prevent duplicate firing
                            alert["status"] = "triggered"

                            # Generate the alert message for the feed
                            trigger_msg = f"ALERT: {stock_id} price ({current_price}) is {alert['condition'].replace('_', ' ')} {alert['threshold']} on {date}"

                            tenant_triggered_alerts.insert(
                                0,
                                {
                                    "alert_id": alert["id"],
                                    "message": trigger_msg,
                                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                                    "owner": alert["created_by"],
                                    "tenant_id": normalized_tenant_id,
                                },
                            )

                            # Log to audit stack
                            self.push_audit(
                                f"Alert triggered for {stock_id} at price {current_price}",
                                normalized_tenant_id,
                            )

                processed_count += 1

        return processed_count

    # --- C4: Audit Logs (Stack) ---
    def push_audit(self, action, tenant_id="global"):
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        self.audit_log.append(
            {
                "action": action,
                "timestamp": timestamp,
                "tenant_id": self.normalize_tenant_id(tenant_id),
            }
        )

    def get_recent_logs(self, limit=10, tenant_id="global"):
        """Returns logs in LIFO order. Time Complexity: O(limit)"""
        normalized_tenant_id = self.normalize_tenant_id(tenant_id)
        visible_logs = [
            entry
            for entry in self.audit_log
            if entry.get("tenant_id") in {"global", normalized_tenant_id}
        ]
        return visible_logs[-limit:][::-1]

    def clear_query_logs(self, tenant_id="global"):
        """Removes only query-related audit entries from the stack."""
        normalized_tenant_id = self.normalize_tenant_id(tenant_id)
        original_count = len(self.audit_log)
        self.audit_log = [
            entry
            for entry in self.audit_log
            if "Queried" not in entry["action"]
            or entry.get("tenant_id") not in {"global", normalized_tenant_id}
        ]
        cleared_count = original_count - len(self.audit_log)
        self.push_audit(
            f"Cleared {cleared_count} query log entries from audit stack.",
            normalized_tenant_id,
        )
        return cleared_count

    def get_configured_alerts(self, tenant_id="global"):
        normalized_tenant_id = self.ensure_tenant_state(tenant_id)
        configured_alerts = []
        for stock_alerts in self.alerts_config.get(normalized_tenant_id, {}).values():
            configured_alerts.extend(stock_alerts)
        return configured_alerts

    def get_triggered_alerts(self, tenant_id="global"):
        normalized_tenant_id = self.ensure_tenant_state(tenant_id)
        return list(self.triggered_alerts.get(normalized_tenant_id, []))

    # --- C5: Admin & Multi-Tenant Management ---
    def add_user(self, username, password, role):
        """Adds a user to the hash map. Time Complexity: O(1)"""
        if username in self.users:
            return False, "Username already exists."

        self.users[username] = {
            "id": self.user_counter,
            "username": username,
            "password_hash": generate_password_hash(password),
            "role": role,
        }
        self.user_counter += 1
        self.push_audit(f"Admin created new user: {username} with role {role}")
        return True, "User created."

    def delete_user(self, username):
        """Removes a user. Time Complexity: O(1)"""
        if username in self.users and username != "admin":  # Protect primary admin
            del self.users[username]
            self.push_audit(f"Admin deleted user: {username}")
            return True, "User deleted."
        return False, "Cannot delete user."

    def reset_system(self, tenant_id="global"):
        """Clears tenant-scoped volatile operational data."""
        normalized_tenant_id = self.ensure_tenant_state(tenant_id)
        self.alerts_queue[normalized_tenant_id].clear()
        self.alerts_config[normalized_tenant_id] = {}
        self.triggered_alerts[normalized_tenant_id] = []
        self.alert_counter[normalized_tenant_id] = 1
        self.clear_query_cache()
        self.audit_log = [
            entry
            for entry in self.audit_log
            if entry.get("tenant_id") not in {normalized_tenant_id}
        ]
        self.push_audit("SYSTEM RESET triggered by Admin.", normalized_tenant_id)
