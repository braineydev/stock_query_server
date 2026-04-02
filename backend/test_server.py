"""Quick test script to verify Flask server is running correctly."""

import os

import requests

DEMO_PASSWORD = os.getenv(
    "DEMO_ADMIN_PASSWORD",
    os.getenv("DEMO_DEFAULT_PASSWORD", "change-this-demo-password"),
)

try:
    response = requests.post(
        "http://127.0.0.1:5000/api/auth/login",
        json={"username": "admin", "password": DEMO_PASSWORD},
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    if response.status_code == 200:
        print("\n✓ Backend is working correctly!")
    else:
        print("\n✗ Backend returned an error")
except requests.exceptions.ConnectionError:
    print("✗ Cannot connect to backend. Make sure Flask is running on port 5000")
except Exception as e:
    print(f"✗ Error: {e}")
