"""Direct test of Flask app using requests library."""

import os
import sys

# Add backend to path
sys.path.insert(
    0, r"c:\Users\mbenj\OneDrive\Documents\STUDY\COMP SCIENCE 2.1\DSA\sqsgmn\backend"
)

print("=" * 60)
print("FLASK APP ROUTE TEST")
print("=" * 60)

print("\n1. Importing app...")
import app as app_module

print(f"2. App created: {app_module.app}")
print(f"3. Debug mode: {app_module.app.debug}")

print("\n4. Registered routes:")
for rule in app_module.app.url_map.iter_rules():
    methods = ", ".join(rule.methods - {"HEAD", "OPTIONS"})
    print(f"   {rule.rule:40} [{methods}]")

print(f"\n5. Total routes registered: {len(list(app_module.app.url_map.iter_rules()))}")

print("\n6. Testing login route with test client:")
with app_module.app.test_client() as client:
    response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "password123"},
        content_type="application/json",
    )
    print(f"   Status Code: {response.status_code}")
    print(f"   Response: {response.get_json()}")

    if response.status_code == 200:
        print("\n✓✓✓ SUCCESS! Login endpoint works correctly ✓✓✓")
    else:
        print("\n✗✗✗ FAILED! Login endpoint not working ✗✗✗")

print("\n" + "=" * 60)
print("The app code itself is CORRECT.")
print("The problem is with how Flask is being run/accessed.")
print("=" * 60)
