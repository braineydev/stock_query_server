"""
Production-ready Flask app entry point (no debug mode).
This disables Flask's auto-reloader which can cause issues with stale processes.
"""

import os
import sys

# Set working directory
os.chdir(r"c:\Users\mbenj\OneDrive\Documents\STUDY\COMP SCIENCE 2.1\DSA\sqsgmn\backend")
sys.path.insert(0, os.getcwd())

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
