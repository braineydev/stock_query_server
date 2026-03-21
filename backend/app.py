import datetime
import os
import random
import threading
import time
from datetime import timedelta
from functools import wraps

import jwt

# Import the data structures we built previously
from data_structures import StockDatabase
from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import Client, create_client
from supabase_auth import SupabaseAuthManager

app = Flask(__name__)
# Enable CORS so the React frontend can make requests
CORS(app)

# Secret key for JWT signing
app.config["SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "super-secret-educational-key")

# Initialize our in-memory data structures
db = StockDatabase()

# Initialize Supabase for stock hydration/seed write-back
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"⚠️ Failed to initialize Supabase client: {e}")


# --- SEED GENERATION ---
def generate_seed_data():
    """
    Generates initial seed data for 3 stocks (AAPL, MSFT, TSLA) across 2025.
    Returns a list of records suitable for insertion into Supabase.
    """
    print("🌱 Generating seed data for AAPL, MSFT, TSLA (2025)...")

    stocks = ["AAPL", "MSFT", "TSLA"]
    starting_prices = {
        "AAPL": 185.0,
        "MSFT": 380.0,
        "TSLA": 245.0,
    }

    start_date = datetime.datetime(2025, 1, 1)
    end_date = datetime.datetime(2025, 12, 31)
    days_to_simulate = (end_date - start_date).days + 1

    seed_records = []
    record_count = 0

    for stock_id in stocks:
        current_price = starting_prices[stock_id]

        for day_offset in range(days_to_simulate):
            current_date = start_date + timedelta(days=day_offset)

            # Skip weekends
            if current_date.weekday() >= 5:
                continue

            date_str = current_date.strftime("%Y-%m-%d")
            volatility = random.uniform(-0.025, 0.025)

            open_price = current_price
            close_price = current_price * (1 + volatility)
            high_price = max(open_price, close_price) * (1 + random.uniform(0, 0.015))
            low_price = min(open_price, close_price) * (1 - random.uniform(0, 0.015))
            volume = int(random.uniform(50000000, 150000000))

            record = {
                "stock_id": stock_id,
                "date": date_str,
                "open_price": round(open_price, 2),
                "close_price": round(close_price, 2),
                "high_price": round(high_price, 2),
                "low_price": round(low_price, 2),
                "volume": volume,
            }

            seed_records.append(record)
            record_count += 1
            current_price = close_price

    print(f"✅ Generated {record_count} seed records.")
    return seed_records


# --- STARTUP SEQUENCE ---
def hydrate_and_seed():
    """Hydrates the O(1) Hash Map from Supabase, or seeds if empty."""
    print("🔄 Checking Supabase for historical stock data...")

    try:
        if supabase is None:
            raise RuntimeError(
                "Supabase client is not initialized. Check SUPABASE_URL/SUPABASE_KEY."
            )

        # Step 1: Query Supabase (lightweight existence check)
        check_data = supabase.table("historical_stocks").select("id").limit(1).execute()

        if len(check_data.data) > 0:
            print("📦 Data found! Hydrating in-memory Hash Map...")
            full_data = supabase.table("historical_stocks").select("*").execute()

            for row in full_data.data:
                db.ingest_stock(row["stock_id"], row["date"], row)

            print(f"✅ Hydrated {len(full_data.data)} records into RAM.")
        else:
            print("⚠️ Supabase is empty. Executing Fallback Seed Script...")
            generated_records = generate_seed_data()

            for record in generated_records:
                db.ingest_stock(record["stock_id"], record["date"], record)

            print(f"💾 Saving {len(generated_records)} seed records to Supabase...")
            supabase.table("historical_stocks").upsert(
                generated_records,
                on_conflict="stock_id,date",
            ).execute()
            print("✅ Seed complete and database updated!")

    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("Falling back to pure in-memory mode...")

        # Ultimate fallback: run RAM seed so app does not crash on empty history
        if not db.stocks:
            generated_records = generate_seed_data()
            for record in generated_records:
                db.ingest_stock(record["stock_id"], record["date"], record)
            print(f"✅ RAM fallback seeded with {len(generated_records)} records.")


# Run right after db initialization
hydrate_and_seed()


# --- MARKET SIMULATOR LOOP ---
def market_simulator_loop():
    """Live market simulator: continuously updates live_session with small price ticks."""
    tick_seconds = 3

    while True:
        try:
            # If no historical stocks loaded yet, wait and retry.
            if not db.stocks:
                time.sleep(tick_seconds)
                continue

            # Initialize/open market session from latest known close per stock.
            if not db.market_open or not db.live_session:
                db.live_session = {}
                for symbol, dates_dict in db.stocks.items():
                    if not dates_dict:
                        continue
                    latest_date = max(dates_dict.keys())
                    latest = dates_dict[latest_date]
                    last_close = float(latest["close_price"])
                    db.live_session[symbol] = {
                        "open_price": round(last_close, 2),
                        "close_price": round(last_close, 2),
                        "high_price": round(last_close, 2),
                        "low_price": round(last_close, 2),
                        "volume": int(latest.get("volume", 0)),
                    }
                db.market_open = True

            # Apply a small random-walk tick to each stock.
            tick_date = db.current_simulated_date.strftime("%Y-%m-%d")
            for symbol, point in db.live_session.items():
                current = float(point["close_price"])
                drift = random.uniform(-0.004, 0.004)  # ±0.4% per tick
                next_price = max(0.01, current * (1 + drift))

                point["close_price"] = round(next_price, 2)
                point["high_price"] = round(
                    max(float(point["high_price"]), next_price), 2
                )
                point["low_price"] = round(
                    min(float(point["low_price"]), next_price), 2
                )
                point["volume"] = int(point.get("volume", 0)) + random.randint(
                    8000, 50000
                )

                # Feed the alerts queue from live engine ticks.
                db.alerts_queue.append(
                    {
                        "stock_id": symbol,
                        "price": point["close_price"],
                        "date": tick_date,
                    }
                )

            # Process all queued alert events (FIFO).
            db.process_alerts()

            # Advance simulated date to keep the ticker date moving.
            db.current_simulated_date += timedelta(days=1)

        except Exception as e:
            print(f"⚠️ market_simulator_loop error: {e}")

        time.sleep(tick_seconds)


# Start the live market simulator thread
simulator_thread = threading.Thread(target=market_simulator_loop, daemon=True)
simulator_thread.start()


# --- HELPER: Validation ---
def validate_stock_payload(data):
    """Validates incoming stock data to prevent invalid state."""
    required_fields = [
        "stock_id",
        "date",
        "open_price",
        "close_price",
        "high_price",
        "low_price",
        "volume",
    ]
    for field in required_fields:
        if field not in data:
            return False, f"Missing required field: {field}"

    # Ensure prices are positive numbers
    try:
        if any(
            float(data[f]) < 0
            for f in ["open_price", "close_price", "high_price", "low_price", "volume"]
        ):
            return False, "Prices and volume must be positive values."
    except ValueError:
        return False, "Prices and volume must be valid numbers."

    return True, "Valid"


# --- HELPER: JWT Decorators ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"error": "Token is missing!"}), 401

        try:
            # Expecting "Bearer <token>"
            token = token.split(" ")[1]
            data = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
            current_user = SupabaseAuthManager.get_user_by_username(data["username"])
            if not current_user:
                raise Exception("User not found")
        except Exception:
            return jsonify({"error": "Token is invalid or expired!"}), 401

        return f(current_user, *args, **kwargs)

    return decorated


def role_required(allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated(current_user, *args, **kwargs):
            user_role = (current_user.get("role") or "").upper()
            normalized_allowed = {role.upper() for role in allowed_roles}
            if user_role not in normalized_allowed:
                return (
                    jsonify({"error": "Unauthorized: Insufficient role permissions."}),
                    403,
                )
            return f(current_user, *args, **kwargs)

        return decorated

    return decorator


# ==========================================
# DEBUG: Simple health check
# ==========================================


@app.route("/", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "ok", "message": "Flask server is running"}), 200


# ==========================================
# VARIANT C4: AUTHENTICATION ENDPOINTS
# ==========================================


@app.route("/api/auth/login", methods=["POST"])
def login():
    """Authenticates a user and returns a JWT."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    auth_result = SupabaseAuthManager.authenticate_user(username, password)
    if auth_result.get("success"):
        user = auth_result["user"]
        token = jwt.encode(
            {
                "username": user["username"],
                "role": user["role"],
                "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24),
            },
            app.config["SECRET_KEY"],
            algorithm="HS256",
        )

        db.push_audit(f"User '{username}' logged in.")

        return (
            jsonify(
                {
                    "token": token,
                    "user": user,
                }
            ),
            200,
        )

    error_message = auth_result.get("error", "Invalid credentials")
    status_code = 401 if error_message == "Invalid username or password" else 500
    return jsonify({"error": error_message}), status_code


# ==========================================
# VARIANT C5: ADMIN & AUDIT ENDPOINTS
# ==========================================


@app.route("/api/admin/users", methods=["GET", "POST"])
@token_required
@role_required(["ADMIN", "SUPER_ADMIN"])
def manage_users(current_user):
    """Admin-only: View or create users."""
    if request.method == "GET":
        users_list = SupabaseAuthManager.list_all_users()
        return jsonify(users_list), 200

    if request.method == "POST":
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400

        result = SupabaseAuthManager.create_user(
            data.get("username", "").strip(),
            data.get("password", ""),
            data.get("role", "USER"),
        )
        if result.get("success"):
            return jsonify({"message": "User created successfully"}), 201
        return jsonify({"error": result.get("error", "Failed to create user")}), 400


@app.route("/api/admin/reset", methods=["POST"])
@token_required
@role_required(["ADMIN", "SUPER_ADMIN"])
def reset_system_data(current_user):
    """Admin-only: Resets all stock and alert data."""
    db.reset_system()
    return jsonify({"message": "System data has been completely reset."}), 200


@app.route("/api/logs", methods=["GET"])
@token_required
@role_required(["ADMIN", "SUPER_ADMIN", "AUDITOR"])
def get_audit_logs(current_user):
    """
    Admin/Auditor only: Retrieves the audit log.
    Demonstrates Stack (LIFO) retrieval.
    """
    limit = request.args.get("limit", default=50, type=int)

    # Retrieves from the top of the stack
    logs = db.get_recent_logs(limit)

    return (
        jsonify(
            {
                "logs": logs,
                "meta": {"complexity_note": "Stack Pop/Read Complexity: O(1)"},
            }
        ),
        200,
    )


# ==========================================
# VARIANT C1: INGESTION & QUERY ENDPOINTS
# ==========================================


@app.route("/api/stocks/ingest", methods=["POST"])
def ingest_stock_data():
    """
    Ingests daily stock data into the Hash Map.
    Time Complexity: O(1)
    """
    data = request.get_json()

    # 1. Error Handling: Missing data or invalid prices
    if not data:
        return jsonify({"error": "No data provided"}), 400

    is_valid, error_msg = validate_stock_payload(data)
    if not is_valid:
        return jsonify({"error": error_msg}), 400

    stock_id = data["stock_id"].upper()
    date = data["date"]

    record = {
        "open_price": float(data["open_price"]),
        "close_price": float(data["close_price"]),
        "high_price": float(data["high_price"]),
        "low_price": float(data["low_price"]),
        "volume": float(data["volume"]),
    }

    # 2. Ingest into Data Structure
    db.ingest_stock(stock_id, date, record)

    return (
        jsonify(
            {
                "message": f"Successfully ingested data for {stock_id} on {date}",
                "status": "success",
            }
        ),
        201,
    )


@app.route("/api/stocks/query", methods=["GET"])
def query_stock_data():
    """
    Retrieves stock data for a specific stock ID and date.
    Time Complexity: O(1)
    """
    stock_id = request.args.get("stock_id")
    date = request.args.get("date")

    # 1. Error Handling: Missing query parameters
    if not stock_id or not date:
        return (
            jsonify({"error": "Both 'stock_id' and 'date' parameters are required."}),
            400,
        )

    stock_id = stock_id.upper()

    # 2. Performance Tracking: Start benchmark timer
    start_time = time.perf_counter()

    # 3. Query the Hash Map
    result = db.query_stock(stock_id, date)

    # Performance Tracking: End benchmark timer
    end_time = time.perf_counter()
    execution_time_ms = (end_time - start_time) * 1000

    # 4. Error Handling: Unknown stock or date
    if result is None:
        return (
            jsonify(
                {
                    "error": f"No data found for {stock_id} on {date}.",
                    "complexity_note": "Lookup Complexity: O(1)",
                }
            ),
            404,
        )

    return (
        jsonify(
            {
                "stock_id": stock_id,
                "date": date,
                "data": result,
                "meta": {
                    "execution_time_ms": round(execution_time_ms, 4),
                    "complexity_note": "Lookup Complexity: O(1)",
                },
            }
        ),
        200,
    )


@app.route("/api/stocks/history", methods=["GET"])
def get_stock_history():
    """Returns chronological price history for a stock (for dashboard charting)."""
    stock_id = request.args.get("stock_id", "").upper()
    limit = request.args.get("limit", default=90, type=int)

    if not stock_id:
        return jsonify({"error": "'stock_id' query parameter is required."}), 400

    if stock_id not in db.stocks:
        return jsonify({"error": f"Stock {stock_id} not found."}), 404

    if limit <= 0:
        return jsonify({"error": "'limit' must be greater than 0."}), 400

    sorted_dates = sorted(db.stocks[stock_id].keys())
    selected_dates = sorted_dates[-limit:]

    history = [
        {
            "date": date,
            "open_price": db.stocks[stock_id][date]["open_price"],
            "close_price": db.stocks[stock_id][date]["close_price"],
            "high_price": db.stocks[stock_id][date]["high_price"],
            "low_price": db.stocks[stock_id][date]["low_price"],
            "volume": db.stocks[stock_id][date]["volume"],
        }
        for date in selected_dates
    ]

    return jsonify({"stock_id": stock_id, "data": history}), 200


# ==========================================
# VARIANT C2: ROLLING METRICS ANALYTICS
# ==========================================


@app.route("/api/stocks/analytics", methods=["GET"])
def get_stock_analytics():
    """
    Retrieves rolling metrics (average, max, min) for a stock.
    Demonstrates Deque and Heap algorithms.
    """
    stock_id = request.args.get("stock_id")
    window_size = request.args.get("window_size", type=int)
    metric_type = request.args.get("metric_type")

    # 1. Input Validation
    if not all([stock_id, window_size, metric_type]):
        return (
            jsonify(
                {
                    "error": "Missing parameters. Required: stock_id, window_size, metric_type"
                }
            ),
            400,
        )

    if window_size <= 0:
        return jsonify({"error": "Window size must be greater than 0."}), 400

    stock_id = stock_id.upper()
    metric_type = metric_type.lower()

    # 2. Performance Tracking
    start_time = time.perf_counter()

    # 3. Algorithm Execution
    results, msg = db.calculate_rolling_metrics(stock_id, window_size, metric_type)

    end_time = time.perf_counter()
    execution_time_ms = (end_time - start_time) * 1000

    # 4. Error Handling
    if results is None:
        return jsonify({"error": msg}), 400

    # Determine the educational Big-O note to return to the frontend
    complexity = "O(N)" if metric_type == "average" else "O(N log K)"
    data_structure = (
        "Deque"
        if metric_type == "average"
        else ("MaxHeap" if metric_type == "maximum" else "MinHeap")
    )

    return (
        jsonify(
            {
                "stock_id": stock_id,
                "metric_type": metric_type,
                "window_size": window_size,
                "data": results,
                "meta": {
                    "execution_time_ms": round(execution_time_ms, 4),
                    "complexity_note": f"Algorithm Complexity: {complexity} using {data_structure}",
                },
            }
        ),
        200,
    )


# ==========================================
# VARIANT C3: SECURE ALERT MANAGEMENT ENDPOINTS
# ==========================================


@app.route("/api/alerts", methods=["POST"])
@token_required
def create_new_alert(current_user):
    """
    Creates a new price alert securely tagged to the logged-in user.
    """
    data = request.get_json() or {}

    required_fields = ["stock_id", "condition", "threshold"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    stock_id = data["stock_id"].upper()
    condition = data["condition"]

    if condition not in ["greater_than", "less_than"]:
        return (
            jsonify({"error": "Condition must be 'greater_than' or 'less_than'"}),
            400,
        )

    try:
        threshold = float(data["threshold"])
    except (ValueError, TypeError):
        return jsonify({"error": "Threshold must be a valid number"}), 400

    # Force created_by from authenticated JWT user (ignore frontend value)
    created_by = current_user["username"]

    alert = db.create_alert(stock_id, condition, threshold, created_by)

    return (
        jsonify(
            {
                "message": f"Alert successfully created for {stock_id}",
                "alert": alert,
                "meta": {"complexity_note": "Insertion Complexity: O(1)"},
            }
        ),
        201,
    )


@app.route("/api/alerts", methods=["GET"])
@token_required
def get_all_alerts(current_user):
    """
    Retrieves alerts. Admins see all; standard users only see their own.
    """
    role = (current_user.get("role") or "").upper()
    is_admin = role in ["ADMIN", "SUPER_ADMIN", "SUPER ADMIN"]

    user_configured_alerts = []
    user_triggered_feed = []

    # Filter configured alerts
    for stock_alerts in db.alerts_config.values():
        for alert in stock_alerts:
            if is_admin or alert.get("created_by") == current_user["username"]:
                user_configured_alerts.append(alert)

    # Filter triggered feed
    for trigger in db.triggered_alerts:
        if is_admin or trigger.get("owner") == current_user["username"]:
            user_triggered_feed.append(trigger)

    return (
        jsonify(
            {
                "configured_alerts": user_configured_alerts,
                "triggered_feed": user_triggered_feed,
                "meta": {"complexity_note": "Queue Dequeue Complexity: O(1)"},
            }
        ),
        200,
    )


# --- Helper endpoint to get all stocks for the dashboard ---
@app.route("/api/stocks/live", methods=["GET"])
def get_live_market():
    """
    Returns the current live market data from the in-memory Hash Map.
    Includes:
    - Current prices for all active stocks (live_session)
    - Market status (OPEN or CLOSED)
    - Simulated date
    """
    market_status = "OPEN" if db.market_open else "CLOSED"
    simulated_date = db.current_simulated_date.strftime("%Y-%m-%d")

    # If market is closed, return latest prices from historical data
    if not db.market_open or not db.live_session:
        # Get the most recent data for each stock
        live_data = {}
        for stock_id, dates_dict in db.stocks.items():
            if dates_dict:
                # Get the latest date's data
                latest_date = max(dates_dict.keys())
                live_data[stock_id] = dates_dict[latest_date]
        return (
            jsonify(
                {
                    "data": live_data,
                    "status": market_status,
                    "date": simulated_date,
                    "meta": {
                        "source": "Historical (Market Closed)",
                        "note": "This is the latest available data from the Hash Map.",
                    },
                }
            ),
            200,
        )

    # Market is OPEN: Return live_session data
    return (
        jsonify(
            {
                "data": db.live_session,
                "status": market_status,
                "date": simulated_date,
                "meta": {
                    "source": "Live RAM Ticker (Write-Behind Cache)",
                    "note": "Real-time data from the market simulator thread.",
                },
            }
        ),
        200,
    )


@app.route("/api/stocks/summary", methods=["GET"])
def get_stocks_summary():
    """Returns a high-level summary of stored stocks for the Dashboard."""
    summary = {}
    for stock_id, dates in db.stocks.items():
        summary[stock_id] = {
            "total_records": len(dates),
            "latest_date": max(dates.keys()) if dates else None,
        }
    return jsonify(summary), 200


if __name__ == "__main__":
    auth_ok, auth_msg = SupabaseAuthManager.init_db()
    print(f"Auth backend status: {auth_msg}")

    # Run the Flask app on port 5000
    app.run(debug=False, host="0.0.0.0", port=5000, use_reloader=False)
