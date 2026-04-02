"""
Production-ready Flask app entry point (no debug mode).
This disables Flask's auto-reloader which can cause issues with stale processes.
"""

import os
import sys
from pathlib import Path

# Set working directory to the current backend folder instead of an old machine path.
BACKEND_DIR = Path(__file__).resolve().parent
os.chdir(BACKEND_DIR)
sys.path.insert(0, str(BACKEND_DIR))

# Import and run the app
from app import app

if __name__ == "__main__":
    print("Starting Flask Server (Production Mode - No Debug)")
    print("=" * 60)
    print("Visit: http://127.0.0.1:5000/api/auth/login (POST)")
    print("=" * 60)

    # Run WITHOUT debug mode to avoid reloader issues
    # This will start a clean process without stale routes
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False,  # IMPORTANT: Disable debug to avoid reloader
        use_reloader=False,  # Explicitly disable reloader
        threaded=True,
    )
