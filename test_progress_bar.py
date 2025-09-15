#!/usr/bin/env python3
"""
Test script to verify progress bar functionality
Tests file upload, processing, and real-time progress updates
"""

import requests
import time
import json
import sys
from pathlib import Path
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8001/api"
TEST_FILES = [
    "./.claude/historic/dist/Cardholder Activity Report General-S-89S,ALL.pdf",
    "./.claude/historic/dist/Receipt_Images_Report-Jackie_09-30-2022.pdf"
]

class ProgressBarTester:
    def __init__(self):
        self.session_id = None
        self.auth_token = None
        
    def login(self):
        """Login and get authentication token"""
        print("[AUTH] Logging in...")
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "admin@test.com",
            "password": "TestAdmin123!"
        })
        
        if response.status_code == 200:
            data = response.json()
            self.auth_token = data.get("access_token")
            print("[AUTH] Logged in successfully")
            return True
        else:
            print(f"[AUTH] Login failed: {response.status_code}")
            print(response.text)
            return False
    
    def create_session(self):
        """Create a new processing session"""
        print("\n📁 Creating new session...")
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/sessions",
            headers=headers,
            json={
                "session_name": f"Progress Test {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            }
        )
        
        if response.status_code == 201:
            data = response.json()
            self.session_id = data["session_id"]
            print(f"✅ Session created: {self.session_id}")
            return True
        else:
            print(f"❌ Failed to create session: {response.status_code}")
            print(response.text)
            return False
    
    def upload_files(self):
        """Upload test files"""
        print("\n📤 Uploading files...")
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        files_to_upload = []
        for file_path in TEST_FILES:
            if Path(file_path).exists():
                file_type = "car_file" if "Cardholder" in file_path else "receipt_file"
                with open(file_path, 'rb') as f:
                    files_to_upload.append((file_type, (Path(file_path).name, f.read(), 'application/pdf')))
                print(f"  📎 Prepared: {Path(file_path).name} as {file_type}")
        
        if not files_to_upload:
            print("❌ No test files found")
            return False
        
        response = requests.post(
            f"{BASE_URL}/sessions/{self.session_id}/upload",
            headers=headers,
            files=files_to_upload
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Files uploaded successfully")
            print(f"  CAR files: {data.get('car_count', 0)}")
            print(f"  Receipt files: {data.get('receipt_count', 0)}")
            return True
        else:
            print(f"❌ Upload failed: {response.status_code}")
            print(response.text)
            return False
    
    def start_processing(self):
        """Start processing the uploaded files"""
        print("\n🚀 Starting processing...")
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/sessions/{self.session_id}/process",
            headers=headers,
            json={"use_real_api": False}  # Use mock processing for testing
        )
        
        if response.status_code in [200, 202]:
            print("✅ Processing started")
            return True
        else:
            print(f"❌ Failed to start processing: {response.status_code}")
            print(response.text)
            return False
    
    def monitor_progress(self, duration=60):
        """Monitor progress for specified duration"""
        print(f"\n📊 Monitoring progress for {duration} seconds...")
        print("-" * 60)
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        start_time = time.time()
        last_progress = -1
        
        while time.time() - start_time < duration:
            response = requests.get(
                f"{BASE_URL}/sessions/{self.session_id}/status",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Extract progress data
                status = data.get("status", "unknown")
                progress = data.get("percent_complete", 0)
                total = data.get("total_employees", 0)
                completed = data.get("completed_employees", 0)
                ready = data.get("ready_for_export", 0)
                message = data.get("message", "")
                
                # Only print if progress changed
                if progress != last_progress or status in ["completed", "error", "failed"]:
                    timestamp = datetime.now().strftime("%H:%M:%S")
                    
                    # Build progress bar visualization
                    bar_width = 40
                    filled = int(bar_width * progress / 100)
                    bar = "█" * filled + "░" * (bar_width - filled)
                    
                    print(f"[{timestamp}] [{bar}] {progress:3}% | {status:12} | {completed}/{total} processed | {ready} ready")
                    
                    if message:
                        print(f"           Message: {message}")
                    
                    last_progress = progress
                    
                    # Check for completion
                    if status in ["completed", "error", "failed"]:
                        print("-" * 60)
                        if status == "completed":
                            print(f"✅ Processing completed successfully!")
                            print(f"   Total processed: {completed}")
                            print(f"   Ready for export: {ready}")
                        else:
                            print(f"❌ Processing {status}")
                            if data.get("error"):
                                print(f"   Error: {data['error']}")
                        return status == "completed"
            else:
                print(f"⚠️  Failed to get status: {response.status_code}")
            
            time.sleep(5)  # Poll every 5 seconds
        
        print("-" * 60)
        print("⏱️  Monitoring timeout reached")
        return False
    
    def run_test(self):
        """Run the complete test"""
        print("=" * 60)
        print("CREDIT CARD PROCESSOR - PROGRESS BAR TEST")
        print("=" * 60)
        
        # Step 1: Login
        if not self.login():
            return False
        
        # Step 2: Create session
        if not self.create_session():
            return False
        
        # Step 3: Upload files
        if not self.upload_files():
            return False
        
        # Step 4: Start processing
        if not self.start_processing():
            return False
        
        # Step 5: Monitor progress
        success = self.monitor_progress(duration=120)
        
        print("\n" + "=" * 60)
        if success:
            print("✅ TEST PASSED: Progress bar updated correctly during processing")
        else:
            print("❌ TEST FAILED: Progress bar did not update as expected")
        print("=" * 60)
        
        return success

if __name__ == "__main__":
    tester = ProgressBarTester()
    success = tester.run_test()
    sys.exit(0 if success else 1)