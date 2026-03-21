"""Hard restart: Kill all Python on this machine and restart cleanly."""

import os
import subprocess
import sys
import time

print("HARD RESTART: Killing all Flask processes")

# Kill all python.exe processes
try:
    subprocess.run("taskkill /IM python.exe /F 2>nul", shell=True)
    print("Killed python processes")
except:
    pass

time.sleep(2)

# Check if port 5000 is free
result = subprocess.run(
    "netstat -ano | findstr :5000", shell=True, capture_output=True, text=True
)
if "LISTENING" in result.stdout:
    print("WARNING: Port 5000 still in use:")
    print(result.stdout)
else:
    print("✓ Port 5000 is now free")

print("\nStarting fresh Flask server...")
os.chdir(r"c:\Users\mbenj\OneDrive\Documents\STUDY\COMP SCIENCE 2.1\DSA\sqsgmn\backend")

# Start the server
subprocess.Popen([sys.executable, "app.py"])
print("Flask server started")
print("Waiting 3 seconds for server to initialize...")
time.sleep(3)

print("\nTesting server...")
result = subprocess.run(
    "curl http://127.0.0.1:5000/", shell=True, capture_output=True, text=True
)
print(f"Response: {result.stdout}")
