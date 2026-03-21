"""Diagnostic script to check Flask app startup."""

import sys

sys.path.insert(
    0, r"c:\Users\mbenj\OneDrive\Documents\STUDY\COMP SCIENCE 2.1\DSA\sqsgmn\backend"
)

print("=== Starting Flask App Diagnostic ===")
print("1. Importing Flask...")
from flask import Flask

print("2. Importing data_structures...")
from data_structures import StockDatabase

print("3. Importing app module...")
import app as app_module

print("4. Checking registered routes:")
for rule in app_module.app.url_map.iter_rules():
    print(f"   - {rule.rule} [{', '.join(rule.methods - {'HEAD', 'OPTIONS'})}]")

print(f"\n5. Total routes: {len(list(app_module.app.url_map.iter_rules()))}")

print("\n6. Testing route directly:")
with app_module.app.test_client() as client:
    response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "password123"},
        content_type="application/json",
    )
    print(f"   Status: {response.status_code}")
    print(f"   Data: {response.get_json()}")

print("\n=== Diagnostic Complete ===")
