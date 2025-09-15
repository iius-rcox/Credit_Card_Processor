#!/usr/bin/env python
"""
Test script to identify which import is blocking
"""

import sys
import time

def test_import(module_name):
    print(f"Testing import: {module_name}...", end="", flush=True)
    start = time.time()
    try:
        exec(f"from app.{module_name} import *")
        elapsed = time.time() - start
        print(f" OK ({elapsed:.2f}s)")
        return True
    except Exception as e:
        elapsed = time.time() - start
        print(f" FAILED ({elapsed:.2f}s): {e}")
        return False

# Test imports in order
modules = [
    "config",
    "database", 
    "logging_config",
    "middleware",
    "auth",
    "api.sessions",
    "api.upload",
    "api.processing",
    "api.results",
    "api.export",
    "api.delta",
    "api.phase4_endpoints",
    "api.export_tracking",
    "websocket",
    "cache",
    "monitoring",
    "metrics",
    "alerting"
]

print("Testing app module imports...")
print("-" * 50)

for module in modules:
    if not test_import(module):
        print(f"\nStopping at failed module: {module}")
        sys.exit(1)

print("-" * 50)
print("All modules imported successfully!")

# Now try importing the full app
print("\nTesting full app import...")
try:
    from app.main import app
    print("SUCCESS: App imported!")
except Exception as e:
    print(f"FAILED: {e}")