"""Test Flask server using Python requests library."""

import json
import os
import time

import requests

DEMO_PASSWORD = os.getenv(
    "DEMO_ADMIN_PASSWORD",
    os.getenv("DEMO_DEFAULT_PASSWORD", "change-this-demo-password"),
)

print("Testing Flask server connectivity...")
print("=" * 60)

time.sleep(1)  # Give server time to start

try:
    # Test the login endpoint
    response = requests.post(
        "http://127.0.0.1:5000/api/auth/login",
        json={"username": "admin", "password": DEMO_PASSWORD},
        timeout=5,
    )

    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    if response.status_code == 200:
        print("\n✓✓✓ SUCCESS! Backend login works! ✓✓✓")
    else:
        print("\n✗ Got response but with error code")

except requests.exceptions.ConnectionError as e:
    print(f"✗ Cannot connect to server: {e}")
except Exception as e:
    print(f"✗ Error: {e}")
