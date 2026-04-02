import datetime
import os
import random
import threading
import time
from functools import wraps

import jwt
from algorithms import StockRelationshipGraph, binary_search_records, merge_sort_records
from auth_service import SupabaseAuthManager

# Import the data structures we built previously
from config import get_jwt_secret
from data_structures import StockDatabase
from flask import Flask, jsonify, request
from flask_cors import CORS
from seed_utils import generate_seed_data
from supabase_client import get_supabase_client, get_supabase_status
from tenant_service import SupabaseTenantManager

app = Flask(__name__)
# Enable CORS so the React frontend can make requests
CORS(app)

# Secret key for JWT signing
app.config["SECRET_KEY"] = get_jwt_secret()

# Initialize our in-memory data structures
db = StockDatabase()
stock_graph = StockRelationshipGraph()

supabase = get_supabase_client()


def build_auth_payload(
    user: dict, active_tenant_id: str | None = None
) -> tuple[str, dict]:
    """Create a JWT and response user payload with switchable tenant context."""
    auth_tenant_id = SupabaseAuthManager.normalize_tenant_id(user.get("tenant_id"))
    scoped_tenant_id = SupabaseAuthManager.normalize_tenant_id(
        active_tenant_id or user.get("active_tenant_id") or auth_tenant_id
    )

    token = jwt.encode(
        {
            "username": user["username"],
            "role": user["role"],
            "tenant_id": auth_tenant_id,
            "auth_tenant_id": auth_tenant_id,
            "active_tenant_id": scoped_tenant_id,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24),
        },
        app.config["SECRET_KEY"],
        algorithm="HS256",
    )

    response_user = {
        **user,
        "tenant_id": auth_tenant_id,
        "auth_tenant_id": auth_tenant_id,
        "active_tenant_id": scoped_tenant_id,
    }
    return token, response_user


def _resolve_seed_generation_seed():
    raw_seed = os.getenv("SEED_DATA_RANDOM_SEED", "").strip()
    return raw_seed or None


def _generate_startup_seed_records():
    seed = _resolve_seed_generation_seed()
    if seed is None:
        print("[seed] Generating seed data for AAPL, MSFT, TSLA (2025)...")
    else:
        print(
            f"[seed] Generating deterministic seed data for AAPL, MSFT, TSLA (2025) using SEED_DATA_RANDOM_SEED='{seed}'..."
        )

    records = generate_seed_data(seed=seed)
    print(f"[seed] Generated {len(records)} seed records.")
    return records


def log_startup_mode():
    """Log the backend storage mode clearly during boot."""
    status = get_supabase_status()

    if status["connected"]:
        print(f"[startup] Connected to Supabase at {status['url']}")
        print("[startup] Storage mode: Supabase + in-memory cache")
        return

    if status["configured"]:
        print("[startup] Supabase credentials found, but connection is unavailable.")
        if status["error"]:
            print(f"[startup] Supabase error: {status['error']}")
    else:
        print("[startup] Supabase is not configured in backend/.env.")

    print("[startup] Storage mode: RAM-only fallback")


# --- STARTUP SEQUENCE ---
def hydrate_and_seed():
    """Hydrates the O(1) Hash Map from Supabase, or seeds if empty."""
    print("[startup] Checking Supabase for historical stock data...")

    try:
        if supabase is None:
            raise RuntimeError(
                "Supabase client is not initialized. Check backend/.env Supabase settings."
            )

        # Step 1: Query Supabase (lightweight existence check)
        check_data = supabase.table("historical_stocks").select("id").limit(1).execute()

        if len(check_data.data) > 0:
            print("[startup] Data found. Hydrating in-memory Hash Map...")
            full_data = supabase.table("historical_stocks").select("*").execute()

            for row in full_data.data:
                db.ingest_stock(row["stock_id"], row["date"], row)

            print(f"[startup] Hydrated {len(full_data.data)} records into RAM.")
        else:
            print("[startup] Supabase is empty. Executing fallback seed script...")
            generated_records = _generate_startup_seed_records()

            for record in generated_records:
                db.ingest_stock(record["stock_id"], record["date"], record)

            print(
                f"[startup] Saving {len(generated_records)} seed records to Supabase..."
            )
            supabase.table("historical_stocks").upsert(
                generated_records,
                on_conflict="stock_id,date",
            ).execute()
            print("[startup] Seed complete and database updated.")

    except Exception as e:
        print(f"[startup] Database connection failed: {e}")
        print("Falling back to pure in-memory mode...")

        # Ultimate fallback: run RAM seed so app does not crash on empty history
        if not db.stocks:
            generated_records = _generate_startup_seed_records()
            for record in generated_records:
                db.ingest_stock(record["stock_id"], record["date"], record)
            print(
                f"[startup] RAM fallback seeded with {len(generated_records)} records."
            )


# Run right after db initialization
log_startup_mode()
hydrate_and_seed()


# --- MARKET SIMULATOR LOOP ---
_sim_config = {"mode": "demo"}

_SIM_PROFILES = {
    "demo": {"tick_seconds": 3, "drift": 0.004, "vol_min": 8000, "vol_max": 50000},
    "normal": {"tick_seconds": 10, "drift": 0.0008, "vol_min": 1000, "vol_max": 8000},
}


def market_simulator_loop():
    """Live market simulator: updates one real-day candle and closes it at 4 PM EAT."""
    while True:
        profile = _SIM_PROFILES.get(_sim_config["mode"], _SIM_PROFILES["demo"])
        tick_seconds = profile["tick_seconds"]
        try:
            # If no historical stocks loaded yet, wait and retry.
            if not db.stocks:
                time.sleep(tick_seconds)
                continue

            market_now = db.get_market_now()
            market_date = market_now.strftime("%Y-%m-%d")

            # Once real time reaches market close, persist today's candle once.
            if db.market_close_reached(market_now):
                if (
                    db.market_open
                    and db.current_market_date == market_date
                    and db.last_closed_date != market_date
                ):
                    db.close_market(market_date)
                time.sleep(tick_seconds)
                continue

            # Before close, keep a live candle open for the current real market date.
            if (
                not db.market_open
                or not db.live_session
                or db.current_market_date != market_date
            ):
                if not db.open_market_day(market_date):
                    time.sleep(tick_seconds)
                    continue

            # Apply a small random-walk tick to each stock.
            for symbol, point in db.live_session.items():
                current = float(point["close_price"])
                drift = random.uniform(-profile["drift"], profile["drift"])
                next_price = max(0.01, current * (1 + drift))

                point["close_price"] = round(next_price, 2)
                point["high_price"] = round(
                    max(float(point["high_price"]), next_price), 2
                )
                point["low_price"] = round(
                    min(float(point["low_price"]), next_price), 2
                )
                point["volume"] = int(point.get("volume", 0)) + random.randint(
                    profile["vol_min"], profile["vol_max"]
                )

                # Feed the alerts queue from live engine ticks.
                for tenant_id, tenant_alerts in db.alerts_config.items():
                    if symbol not in tenant_alerts:
                        continue

                    db.alerts_queue[db.ensure_tenant_state(tenant_id)].append(
                        {
                            "stock_id": symbol,
                            "price": point["close_price"],
                            "date": market_date,
                        }
                    )

            # Process all queued alert events (FIFO).
            db.process_alerts()

        except Exception as e:
            print(f"[simulator] market_simulator_loop error: {e}")

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
            auth_tenant_id = data.get("auth_tenant_id") or data.get("tenant_id")
            current_user = SupabaseAuthManager.get_user_by_username(
                data["username"], auth_tenant_id
            )
            if not current_user:
                raise Exception("User not found")
            current_user["tenant_id"] = SupabaseAuthManager.normalize_tenant_id(
                current_user.get("tenant_id") or auth_tenant_id
            )
            current_user["auth_tenant_id"] = current_user["tenant_id"]
            current_user["active_tenant_id"] = SupabaseAuthManager.normalize_tenant_id(
                data.get("active_tenant_id") or current_user["tenant_id"]
            )
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


@app.route("/api/health/supabase", methods=["GET"])
def supabase_health_check():
    """Returns the current Supabase configuration/connection state."""
    status = get_supabase_status()
    http_status = 200 if status["connected"] else 503
    return jsonify(status), http_status


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
    tenant_id = data.get("tenant_id")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    auth_result = SupabaseAuthManager.authenticate_user(username, password, tenant_id)
    if auth_result.get("success"):
        user = auth_result["user"]
        token, response_user = build_auth_payload(user, tenant_id)

        db.push_audit(
            f"User '{username}' logged in.", response_user["active_tenant_id"]
        )

        return (
            jsonify(
                {
                    "token": token,
                    "user": response_user,
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
        users_list = SupabaseAuthManager.list_all_users(
            current_user.get("active_tenant_id")
        )
        return jsonify(users_list), 200

    if request.method == "POST":
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400

        result = SupabaseAuthManager.create_user(
            data.get("username", "").strip(),
            data.get("password", ""),
            data.get("role", "USER"),
            data.get("tenant_id") or current_user.get("active_tenant_id"),
        )
        if result.get("success"):
            return jsonify({"message": "User created successfully"}), 201
        return jsonify({"error": result.get("error", "Failed to create user")}), 400


@app.route("/api/admin/tenants", methods=["GET", "POST"])
@token_required
@role_required(["SUPER_ADMIN"])
def manage_tenants(current_user):
    """Super-admin only: View or create tenants."""
    if request.method == "GET":
        tenants = SupabaseTenantManager.list_tenants()
        return jsonify(tenants), 200

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    result = SupabaseTenantManager.create_tenant(
        data.get("id", ""),
        data.get("name", ""),
        data.get("status", "active"),
    )
    if result.get("success"):
        return jsonify(result["tenant"]), 201
    return jsonify({"error": result.get("error", "Failed to create tenant")}), 400


@app.route("/api/admin/switch-tenant", methods=["POST"])
@token_required
@role_required(["SUPER_ADMIN"])
def switch_tenant_context(current_user):
    """Super-admin only: switch active tenant context without changing identity."""
    data = request.get_json() or {}
    requested_tenant_id = SupabaseAuthManager.normalize_tenant_id(data.get("tenant_id"))

    tenant = SupabaseTenantManager.get_tenant(requested_tenant_id)
    if not tenant:
        return jsonify({"error": f"Tenant '{requested_tenant_id}' does not exist"}), 404
    if (tenant.get("status") or "").lower() != "active":
        return jsonify({"error": "Only active tenants can be selected"}), 400

    token, response_user = build_auth_payload(current_user, requested_tenant_id)
    db.push_audit(
        f"Super admin switched active tenant context to '{requested_tenant_id}'.",
        requested_tenant_id,
    )
    return jsonify({"token": token, "user": response_user}), 200


@app.route("/api/admin/reset", methods=["POST"])
@token_required
@role_required(["ADMIN", "SUPER_ADMIN"])
def reset_system_data(current_user):
    """Admin-only: Resets all stock and alert data."""
    db.reset_system(current_user.get("active_tenant_id"))
    return (
        jsonify({"message": "Operational data has been reset for the current tenant."}),
        200,
    )


@app.route("/api/admin/simulator-mode", methods=["GET", "POST"])
@token_required
@role_required(["ADMIN", "SUPER_ADMIN"])
def manage_simulator_mode(current_user):
    """Admin-only: Get or set the live market simulator speed mode."""
    if request.method == "GET":
        return jsonify({"mode": _sim_config["mode"]}), 200

    data = request.get_json() or {}
    mode = data.get("mode", "")
    if mode not in _SIM_PROFILES:
        return (
            jsonify({"error": f"Invalid mode. Choose from: {list(_SIM_PROFILES)}"}),
            400,
        )

    _sim_config["mode"] = mode
    db.push_audit(
        f"Simulator mode changed to '{mode}' by {current_user['username']}.",
        current_user.get("active_tenant_id"),
    )
    return jsonify({"mode": _sim_config["mode"]}), 200


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
    logs = db.get_recent_logs(limit, current_user.get("active_tenant_id"))

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

    cache_before = db.get_cache_stats()

    # 2. Performance Tracking: Start benchmark timer
    start_time = time.perf_counter()

    # 3. Query the Hash Map
    result = db.query_stock(stock_id, date)

    # Performance Tracking: End benchmark timer
    end_time = time.perf_counter()
    execution_time_ms = (end_time - start_time) * 1000
    cache_after = db.get_cache_stats()
    cache_hit = cache_after["hits"] > cache_before["hits"]
    cache_miss = cache_after["misses"] > cache_before["misses"]

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
                    "cache": {
                        "enabled": True,
                        "status": (
                            "hit" if cache_hit else ("miss" if cache_miss else "bypass")
                        ),
                        "hot_stock": db.is_hot_stock(stock_id),
                    },
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

    history = []
    for date, point in db.stocks[stock_id].items():
        history.append(
            {
                "date": date,
                "open_price": point["open_price"],
                "close_price": point["close_price"],
                "high_price": point["high_price"],
                "low_price": point["low_price"],
                "volume": point["volume"],
            }
        )

    sorted_history = merge_sort_records(history, key="date", reverse=False)
    selected_history = sorted_history[-limit:]

    return jsonify({"stock_id": stock_id, "data": selected_history}), 200


@app.route("/api/stocks/history/search", methods=["GET"])
def search_stock_history():
    """Find a stock record by date using merge sort + binary search."""
    stock_id = request.args.get("stock_id", "").upper()
    date = request.args.get("date", "")

    if not stock_id or not date:
        return (
            jsonify({"error": "'stock_id' and 'date' query parameters are required."}),
            400,
        )

    if stock_id not in db.stocks:
        return jsonify({"error": f"Stock {stock_id} not found."}), 404

    history = [
        {"date": point_date, **point}
        for point_date, point in db.stocks[stock_id].items()
    ]
    sorted_history = merge_sort_records(history, key="date", reverse=False)
    match, index = binary_search_records(sorted_history, key="date", target=date)

    if match is None:
        return (
            jsonify(
                {
                    "error": f"No data found for {stock_id} on {date}.",
                    "meta": {
                        "complexity_note": "Merge Sort O(n log n) + Binary Search O(log n)"
                    },
                }
            ),
            404,
        )

    db.push_audit(
        f"Binary searched {stock_id} history for {date}.",
        tenant_id="global",
    )

    return (
        jsonify(
            {
                "stock_id": stock_id,
                "date": date,
                "index": index,
                "data": match,
                "meta": {
                    "complexity_note": "Merge Sort O(n log n) + Binary Search O(log n)"
                },
            }
        ),
        200,
    )


@app.route("/api/stocks/history/sorted", methods=["GET"])
def get_stock_history_sorted():
    """Return stock history sorted by date using explicit merge sort."""
    stock_id = request.args.get("stock_id", "").upper()
    order = request.args.get("order", "asc").lower()
    limit = request.args.get("limit", default=90, type=int)

    if not stock_id:
        return jsonify({"error": "'stock_id' query parameter is required."}), 400
    if stock_id not in db.stocks:
        return jsonify({"error": f"Stock {stock_id} not found."}), 404
    if limit <= 0:
        return jsonify({"error": "'limit' must be greater than 0."}), 400
    if order not in {"asc", "desc"}:
        return jsonify({"error": "'order' must be either 'asc' or 'desc'."}), 400

    history = [
        {"date": point_date, **point}
        for point_date, point in db.stocks[stock_id].items()
    ]
    sorted_history = merge_sort_records(
        history,
        key="date",
        reverse=(order == "desc"),
    )

    return (
        jsonify(
            {
                "stock_id": stock_id,
                "order": order,
                "data": sorted_history[:limit],
                "meta": {"complexity_note": "Merge Sort Complexity: O(n log n)"},
            }
        ),
        200,
    )


@app.route("/api/stocks/graph/rebuild", methods=["POST"])
def rebuild_stock_graph():
    """Build the stock relationship graph from historical price co-movement."""
    payload = request.get_json(silent=True) or {}
    min_overlap = int(payload.get("min_overlap", 30))
    correlation_threshold = float(payload.get("correlation_threshold", 0.45))

    if min_overlap < 2:
        return jsonify({"error": "'min_overlap' must be at least 2."}), 400
    if correlation_threshold < -1 or correlation_threshold > 1:
        return (
            jsonify({"error": "'correlation_threshold' must be between -1 and 1."}),
            400,
        )

    summary = stock_graph.rebuild_from_stock_data(
        db.stocks,
        min_overlap=min_overlap,
        correlation_threshold=correlation_threshold,
    )
    db.push_audit("Rebuilt stock relationship graph.", tenant_id="global")

    return (
        jsonify(
            {
                "message": "Stock relationship graph rebuilt successfully.",
                "graph": {
                    **summary,
                    "nodes": stock_graph.nodes(),
                },
                "meta": {
                    "complexity_note": "Graph construction is approximately O(S^2 * D)"
                },
            }
        ),
        200,
    )


@app.route("/api/stocks/graph/traverse", methods=["GET"])
def traverse_stock_graph():
    """Traverse stock graph using BFS or DFS from a starting stock symbol."""
    start = request.args.get("start", "").upper()
    method = request.args.get("method", "bfs").lower()
    max_depth = request.args.get("max_depth", default=2, type=int)

    if not start:
        return jsonify({"error": "'start' query parameter is required."}), 400
    if method not in {"bfs", "dfs"}:
        return jsonify({"error": "'method' must be 'bfs' or 'dfs'."}), 400
    if max_depth < 0:
        return jsonify({"error": "'max_depth' must be 0 or greater."}), 400

    if not stock_graph.adjacency:
        stock_graph.rebuild_from_stock_data(db.stocks)

    traversal = (
        stock_graph.bfs(start, max_depth=max_depth)
        if method == "bfs"
        else stock_graph.dfs(start, max_depth=max_depth)
    )

    if not traversal["visited_order"]:
        return (
            jsonify(
                {
                    "error": f"Start stock '{start}' is not present in the graph.",
                    "available_nodes": stock_graph.nodes(),
                }
            ),
            404,
        )

    db.push_audit(
        f"Traversed stock graph using {method.upper()} from {start}.",
        tenant_id="global",
    )

    return (
        jsonify(
            {
                "traversal": traversal,
                "graph": {
                    "node_count": len(stock_graph.adjacency),
                    "edge_count": stock_graph.edge_count(),
                },
                "meta": {
                    "complexity_note": "Traversal Complexity: O(V + E)",
                },
            }
        ),
        200,
    )


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

    alert = db.create_alert(
        stock_id,
        condition,
        threshold,
        created_by,
        current_user.get("active_tenant_id"),
    )

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

    tenant_id = current_user.get("active_tenant_id")
    user_configured_alerts = []
    user_triggered_feed = []

    # Filter configured alerts
    for alert in db.get_configured_alerts(tenant_id):
        if is_admin or alert.get("created_by") == current_user["username"]:
            user_configured_alerts.append(alert)

    # Filter triggered feed
    for trigger in db.get_triggered_alerts(tenant_id):
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
    - Real market date
    """
    market_status = "OPEN" if db.market_open else "CLOSED"
    market_date = db.current_market_date or db.get_market_date()

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
                    "date": market_date,
                    "meta": {
                        "source": "Historical (Market Closed)",
                        "note": "This is the latest available data from the Hash Map.",
                        "timezone": db.market_timezone,
                        "market_close": f"{db.market_close_hour:02d}:{db.market_close_minute:02d}",
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
                "date": market_date,
                "meta": {
                    "source": "Live RAM Ticker (Write-Behind Cache)",
                    "note": "Real-time data from the market simulator thread.",
                    "timezone": db.market_timezone,
                    "market_close": f"{db.market_close_hour:02d}:{db.market_close_minute:02d}",
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


# ==========================================
# VARIANT C5: HOT CACHE & BENCHMARK ENDPOINTS
# ==========================================


@app.route("/api/stocks/cache/stats", methods=["GET"])
def get_cache_stats():
    """Expose hot-query cache metrics for documentation and diagnostics."""
    return jsonify(db.get_cache_stats()), 200


@app.route("/api/stocks/cache/benchmark", methods=["GET"])
def benchmark_cache_layer():
    """Run a simple read-heavy benchmark comparing uncached vs cached lookups."""
    iterations = request.args.get("iterations", default=2000, type=int)
    if iterations <= 0 or iterations > 50000:
        return jsonify({"error": "'iterations' must be between 1 and 50000."}), 400

    raw_stock_ids = request.args.get("stock_ids", default="")
    stock_ids = [
        stock_id.strip().upper()
        for stock_id in raw_stock_ids.split(",")
        if stock_id.strip()
    ] or None

    result = db.benchmark_query_workload(iterations=iterations, stock_ids=stock_ids)
    if not result.get("success"):
        return jsonify({"error": result.get("error", "Benchmark failed.")}), 400

    return jsonify(result), 200


if __name__ == "__main__":
    auth_ok, auth_msg = SupabaseAuthManager.init_db()
    print(f"Auth backend status: {auth_msg}")
    tenant_ok, tenant_msg = SupabaseTenantManager.init_db()
    print(f"Tenant backend status: {tenant_msg}")

    # Run the Flask app on port 5000
    app.run(debug=False, host="0.0.0.0", port=5000, use_reloader=False)
