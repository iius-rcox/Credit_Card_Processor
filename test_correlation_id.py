#!/usr/bin/env python3
"""
Test script to verify correlation ID tracking works end-to-end
"""

import requests
import json
import uuid
from datetime import datetime

# Generate a unique correlation ID for testing
test_correlation_id = f"test-{uuid.uuid4().hex[:8]}-{datetime.now().strftime('%H%M%S')}"

print(f"Testing correlation ID tracking...")
print(f"Generated test correlation ID: {test_correlation_id}")
print("-" * 60)

# Test endpoints
base_url = "http://localhost:8000"
endpoints = [
    "/api/sessions",
    "/api/phase4/sessions",
]

for endpoint in endpoints:
    try:
        url = f"{base_url}{endpoint}"
        headers = {
            "x-correlation-id": test_correlation_id,
            "x-dev-user": "test_user"  # For development auth
        }
        
        print(f"\nTesting endpoint: {endpoint}")
        print(f"Request headers: x-correlation-id={test_correlation_id}")
        
        response = requests.get(url, headers=headers)
        
        # Check if correlation ID is echoed back
        response_correlation_id = response.headers.get('x-correlation-id')
        
        if response_correlation_id == test_correlation_id:
            print(f"✓ Correlation ID correctly returned: {response_correlation_id}")
        else:
            print(f"✗ Correlation ID mismatch!")
            print(f"  Sent: {test_correlation_id}")
            print(f"  Received: {response_correlation_id}")
        
        print(f"Response status: {response.status_code}")
        
    except Exception as e:
        print(f"✗ Error testing {endpoint}: {e}")

print("\n" + "=" * 60)
print("Test complete. Check backend logs for correlation ID in log messages.")
print("Look for log entries with correlation ID:", test_correlation_id)