"""Kill all processes listening on port 5000."""

import subprocess
import sys

try:
    # Get PID listening on port 5000
    result = subprocess.run(
        "netstat -ano | findstr :5000 | findstr LISTENING",
        shell=True,
        capture_output=True,
        text=True,
    )

    for line in result.stdout.strip().split("\n"):
        if line.strip():
            parts = line.split()
            pid = parts[-1]
            print(f"Killing PID {pid}...")
            subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)

    print("✓ Killed all processes on port 5000")
    print("You can now restart the Flask server")
except Exception as e:
    print(f"Error: {e}")
