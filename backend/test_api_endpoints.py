#!/usr/bin/env python3
"""
API Endpoint Security Testing for Windows Authentication System
Direct testing of FastAPI endpoints
"""

import sys
import os
import requests
import json

def test_api_endpoints():
    """Test API endpoints directly via HTTP"""
    print("🌐 Testing API Endpoints...")
    
    base_url = "http://localhost:8000"
    
    print("Starting FastAPI application for testing...")
    
    # Test health endpoint (should work without auth)
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        print(f"Health endpoint: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"❌ Could not connect to API: {e}")
        print("Please start the FastAPI application with: uvicorn app.main:app --reload")
        return False
    
    # Test current user endpoint without auth (should fail)
    try:
        response = requests.get(f"{base_url}/api/auth/current-user", timeout=5)
        print(f"Current user (no auth): {response.status_code}")
        if response.status_code != 200:
            print(f"  Expected failure: {response.json()}")
    except Exception as e:
        print(f"❌ Error testing no-auth endpoint: {e}")
        
    # Test current user endpoint with auth headers
    auth_headers = {
        'Remote-User': 'rcox'
    }
    
    try:
        response = requests.get(f"{base_url}/api/auth/current-user", headers=auth_headers, timeout=5)
        print(f"Current user (with auth): {response.status_code}")
        if response.status_code == 200:
            print(f"  Success: {response.json()}")
        else:
            print(f"  Error: {response.json()}")
    except Exception as e:
        print(f"❌ Error testing auth endpoint: {e}")
    
    # Test admin endpoint with regular user
    regular_headers = {
        'Remote-User': 'regularuser'
    }
    
    try:
        response = requests.get(f"{base_url}/api/auth/admin-test", headers=regular_headers, timeout=5)
        print(f"Admin test (regular user): {response.status_code}")
        if response.status_code != 200:
            print(f"  Expected failure: {response.json()}")
    except Exception as e:
        print(f"❌ Error testing regular user admin access: {e}")
    
    # Test admin endpoint with admin user
    try:
        response = requests.get(f"{base_url}/api/auth/admin-test", headers=auth_headers, timeout=5)
        print(f"Admin test (admin user): {response.status_code}")
        if response.status_code == 200:
            print(f"  Success: {response.json()}")
        else:
            print(f"  Error: {response.json()}")
    except Exception as e:
        print(f"❌ Error testing admin endpoint: {e}")
    
    # Test auth status endpoint
    try:
        response = requests.get(f"{base_url}/api/auth/status", timeout=5)
        print(f"Auth status (no auth): {response.status_code}")
        if response.status_code == 200:
            print(f"  Response: {response.json()}")
    except Exception as e:
        print(f"❌ Error testing status endpoint: {e}")
    
    return True

if __name__ == "__main__":
    test_api_endpoints()