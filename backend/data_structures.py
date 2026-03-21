import heapq
import os
import time
from collections import deque
from datetime import datetime, timedelta

from dotenv import load_dotenv
from supabase import Client, create_client

# Load environment variables
load_dotenv()


class StockDatabase:
    def __init__(self):
        # 1. Hash Map: Fast stock retrieval -> O(1)
        # Structure: { stock_id: { date: StockRecord_Dict } }
        self.stocks = {}

        # 2. Queue: Alert event processing (FIFO) -> O(1) enqueue/dequeue
        self.alerts_queue = deque()
        self.active_alerts = []  # Stores user-defined alert thresholds
        self.alerts_config = {}  # Maps stock_id -> list of alert dictionaries
        self.triggered_alerts = (
            []
        )  # Stores alerts that have fired for the dashboard feed
        self.alert_counter = 1

        # 3. Stack: Audit logging (LIFO) -> O(1) push/pop
        self.audit_log = []

        # 4. Max Heap: Ranking stocks (Simulated using Python's min-heap with negative values)
        self.top_stocks = []

        # 5. Hash Map for Users -> O(1) lookup
        self.users = {
            "admin": {
                "id": 1,
                "username": "admin",
                "password": "password123",
                "role": "Admin",
            },
            "auditor": {
                "id": 2,
                "username": "auditor",
                "password": "password123",
                "role": "Auditor",
            },
            "user": {
                "id": 3,
                "username": "user",
                "password": "password123",
                "role": "User",
            },
        }
        self.user_counter = 4

        # 6. Live Market State
        self.live_session = {}
        self.market_open = False
        self.current_simulated_date = datetime.now()

        # 7. The Cold Storage: Supabase Connection
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")
        if url and key:
            self.supabase: Client = create_client(url, key)
            self.db_connected = True
        else:
            self.db_connected = False
            print("⚠️ Supabase keys missing. Running in RAM-only mode.")

    # --- STARTUP: Hydrate Hash Map from Supabase ---
    def hydrate_from_db(self):
        """Startup Task: Loads all historical data from Supabase into the Hash Map."""
        if not self.db_connected:
            return

        print("🚰 Hydrating O(1) Hash Map from Supabase cold storage...")
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

            print(f"✅ Hydration complete! Loaded {count} records into RAM.")
            self.push_audit(f"Hydrated {count} records from Supabase into RAM.")
        except Exception as e:
            print(f"⚠️ Hydration failed: {e}")
            self.push_audit(f"Hydration failed: {e}")

    # --- MARKET CLOSE: Save to Hash Map AND Supabase ---
    def close_market(self):
        """Simulated Market Close: Commits data to Hash Map AND Supabase."""
        if not self.market_open:
            return

        date_str = self.current_simulated_date.strftime("%Y-%m-%d")
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
                print(f"💾 Backed up OHLC data to Supabase for {date_str}")
            except Exception as e:
                print(f"Database backup failed: {e}")

        self.market_open = False
        self.push_audit(f"Market Closed. Saved OHLC data for {date_str}.")
        self.current_simulated_date += timedelta(days=1)

    # --- C1: Ingestion & Query ---
    def ingest_stock(self, stock_id, date, record):
        """Time Complexity: O(1) average case"""
        if stock_id not in self.stocks:
            self.stocks[stock_id] = {}
        self.stocks[stock_id][date] = record

        # Log to audit stack
        self.push_audit(f"Stock data ingested for {stock_id} on {date}")

        # Enqueue alert check
        self.alerts_queue.append(
            {"stock_id": stock_id, "price": record["close_price"], "date": date}
        )
        self.process_alerts()

    def query_stock(self, stock_id, date):
        """Time Complexity: O(1) average case"""
        self.push_audit(f"Queried {stock_id} on {date}")
        return self.stocks.get(stock_id, {}).get(date, None)

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
    def create_alert(self, stock_id, condition, threshold, created_by="User"):
        """Stores a new user-defined alert threshold."""
        if stock_id not in self.alerts_config:
            self.alerts_config[stock_id] = []

        alert = {
            "id": self.alert_counter,
            "stock_id": stock_id,
            "condition": condition.lower(),  # 'greater_than' or 'less_than'
            "threshold": float(threshold),
            "created_by": created_by,
            "status": "active",
        }
        self.alerts_config[stock_id].append(alert)
        self.alert_counter += 1

        # Log to audit stack
        self.push_audit(f"Alert created for {stock_id}: {condition} {threshold}")
        return alert

    def process_alerts(self):
        """
        Processes the alert queue (FIFO).
        Dequeue Complexity: O(1)
        """
        processed_count = 0

        while self.alerts_queue:
            # Pop from the left of the deque (O(1) time)
            event = self.alerts_queue.popleft()
            stock_id = event["stock_id"]
            current_price = event["price"]
            date = event["date"]

            # If there are active alerts configured for this stock, check them
            if stock_id in self.alerts_config:
                for alert in self.alerts_config[stock_id]:
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
                        trigger_msg = f"⚠ ALERT: {stock_id} price ({current_price}) is {alert['condition'].replace('_', ' ')} {alert['threshold']} on {date}"

                        self.triggered_alerts.insert(
                            0,
                            {
                                "alert_id": alert["id"],
                                "message": trigger_msg,
                                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                                "owner": alert["created_by"],
                            },
                        )

                        # Log to audit stack
                        self.push_audit(
                            f"Alert triggered for {stock_id} at price {current_price}"
                        )

            processed_count += 1

        return processed_count

    # --- C4: Audit Logs (Stack) ---
    def push_audit(self, action):
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        self.audit_log.append({"action": action, "timestamp": timestamp})

    def get_recent_logs(self, limit=10):
        """Returns logs in LIFO order. Time Complexity: O(limit)"""
        # Read from the top of the stack
        return self.audit_log[-limit:][::-1]

    # --- C5: Admin & Multi-Tenant Management ---
    def add_user(self, username, password, role):
        """Adds a user to the hash map. Time Complexity: O(1)"""
        if username in self.users:
            return False, "Username already exists."

        self.users[username] = {
            "id": self.user_counter,
            "username": username,
            "password": password,  # In a real app, hash this!
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

    def reset_system(self):
        """Clears all volatile system data (Admin only)."""
        self.stocks.clear()
        self.alerts_queue.clear()
        self.alerts_config.clear()
        self.triggered_alerts.clear()
        self.push_audit("SYSTEM RESET triggered by Admin.")
