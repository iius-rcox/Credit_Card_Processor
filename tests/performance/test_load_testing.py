"""
Load testing suite for Credit Card Processor application.

This module provides comprehensive load testing capabilities using locust
to simulate realistic user behavior and measure system performance under stress.
"""

import os
import time
import random
import json
import tempfile
from typing import Dict, Any, List
from locust import HttpUser, task, between, events
from locust.exception import StopUser
import requests
from faker import Faker

fake = Faker()

class CreditCardProcessorUser(HttpUser):
    """
    Simulates a typical user of the Credit Card Processor application.
    
    This user class represents realistic usage patterns including:
    - Authentication and session management
    - File uploads with various sizes
    - Processing status checks
    - Result downloads and exports
    """
    
    wait_time = between(1, 5)  # Wait 1-5 seconds between tasks
    weight = 10  # Default user weight
    
    def on_start(self):
        """Initialize user session and authenticate"""
        self.username = f"testuser_{fake.user_name()}"
        self.session_id = None
        self.uploaded_files = []
        self.processing_jobs = []
        
        # Authenticate user
        self.authenticate()
        
    def authenticate(self):
        """Simulate user authentication"""
        with self.client.get("/api/auth/status", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Authentication failed: {response.status_code}")
    
    @task(3)
    def check_health(self):
        """Check application health - lightweight operation"""
        with self.client.get("/health", name="health_check") as response:
            pass
    
    @task(5)
    def upload_small_file(self):
        """Upload a small PDF file (< 1MB)"""
        self._upload_file(size_kb=random.randint(100, 1000))
    
    @task(3)
    def upload_medium_file(self):
        """Upload a medium PDF file (1-10MB)"""
        self._upload_file(size_kb=random.randint(1000, 10000))
    
    @task(1)
    def upload_large_file(self):
        """Upload a large PDF file (10-50MB)"""
        self._upload_file(size_kb=random.randint(10000, 50000))
    
    def _upload_file(self, size_kb: int):
        """Upload a test file of specified size"""
        try:
            # Create temporary test file
            test_content = self._generate_pdf_content(size_kb)
            
            files = {
                'file': ('test_document.pdf', test_content, 'application/pdf')
            }
            
            with self.client.post(
                "/api/upload/", 
                files=files,
                name=f"upload_file_{size_kb//1000}MB",
                catch_response=True
            ) as response:
                if response.status_code == 200:
                    result = response.json()
                    self.uploaded_files.append({
                        'session_id': result.get('session_id'),
                        'size_kb': size_kb,
                        'upload_time': time.time()
                    })
                    response.success()
                else:
                    response.failure(f"Upload failed: {response.status_code}")
                    
        except Exception as e:
            self.client.get("/", name="upload_error")  # Record error
    
    def _generate_pdf_content(self, size_kb: int) -> bytes:
        """Generate fake PDF content of specified size"""
        # Simple PDF header and content
        pdf_header = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n'
        
        # Generate content to reach desired size
        content_size = (size_kb * 1024) - len(pdf_header) - 100  # Reserve space for footer
        content = b'A' * max(0, content_size)
        
        pdf_footer = b'\nxref\n0 1\n0000000000 65535 f \ntrailer\n<<\n/Size 1\n>>\nstartxref\n9\n%%EOF'
        
        return pdf_header + content + pdf_footer
    
    @task(4)
    def check_processing_status(self):
        """Check status of uploaded files"""
        if self.uploaded_files:
            file_info = random.choice(self.uploaded_files)
            session_id = file_info['session_id']
            
            with self.client.get(
                f"/api/sessions/{session_id}/status",
                name="check_status"
            ) as response:
                if response.status_code == 200:
                    result = response.json()
                    if result.get('status') == 'completed':
                        # File processing completed, add to processing jobs
                        if session_id not in [job['session_id'] for job in self.processing_jobs]:
                            self.processing_jobs.append({
                                'session_id': session_id,
                                'completed_time': time.time()
                            })
    
    @task(2)
    def start_processing(self):
        """Start processing uploaded files"""
        if self.uploaded_files:
            file_info = random.choice(self.uploaded_files)
            session_id = file_info['session_id']
            
            payload = {
                'processing_type': 'standard',
                'validation_rules': ['required_fields', 'data_types']
            }
            
            with self.client.post(
                f"/api/processing/{session_id}/start",
                json=payload,
                name="start_processing"
            ) as response:
                pass
    
    @task(2)
    def get_results(self):
        """Retrieve processing results"""
        if self.processing_jobs:
            job_info = random.choice(self.processing_jobs)
            session_id = job_info['session_id']
            
            with self.client.get(
                f"/api/results/{session_id}",
                name="get_results"
            ) as response:
                pass
    
    @task(1)
    def export_results(self):
        """Export results in various formats"""
        if self.processing_jobs:
            job_info = random.choice(self.processing_jobs)
            session_id = job_info['session_id']
            format_type = random.choice(['csv', 'json', 'xlsx'])
            
            with self.client.post(
                f"/api/export/{session_id}",
                json={'format': format_type},
                name=f"export_{format_type}"
            ) as response:
                pass
    
    @task(1)
    def get_metrics(self):
        """Check application metrics"""
        with self.client.get("/api/monitoring/metrics", name="get_metrics") as response:
            pass

class AdminUser(HttpUser):
    """
    Simulates admin user behavior with elevated privileges.
    
    Admin users perform different operations including:
    - System monitoring and health checks
    - Alert management
    - Performance metrics review
    """
    
    wait_time = between(2, 8)  # Admin users are less frequent but do more complex operations
    weight = 1  # Fewer admin users
    
    def on_start(self):
        """Initialize admin session"""
        self.username = "admin_user"
        self.authenticate_as_admin()
    
    def authenticate_as_admin(self):
        """Authenticate as admin user"""
        # Simulate admin authentication
        with self.client.get("/api/auth/admin-test", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Admin auth failed: {response.status_code}")
    
    @task(5)
    def check_detailed_health(self):
        """Check detailed system health"""
        with self.client.get("/api/health/detailed", name="admin_health_check") as response:
            pass
    
    @task(3)
    def get_system_metrics(self):
        """Get comprehensive system metrics"""
        with self.client.get("/api/monitoring/system", name="admin_system_metrics") as response:
            pass
    
    @task(3)
    def get_application_metrics(self):
        """Get application performance metrics"""
        with self.client.get("/api/monitoring/application", name="admin_app_metrics") as response:
            pass
    
    @task(2)
    def check_alerts(self):
        """Check current alerts"""
        with self.client.get("/api/alerts", name="admin_check_alerts") as response:
            pass
    
    @task(1)
    def get_prometheus_metrics(self):
        """Get Prometheus metrics"""
        with self.client.get("/metrics", name="admin_prometheus_metrics") as response:
            pass

class HighVolumeUser(HttpUser):
    """
    Simulates high-volume automated API usage.
    
    This user type represents automated systems or batch processing
    that might hit the API with higher frequency and larger files.
    """
    
    wait_time = between(0.1, 1)  # Very short wait times for high volume
    weight = 2  # Limited number of high-volume users
    
    def on_start(self):
        """Initialize high-volume session"""
        self.username = f"batch_user_{fake.user_name()}"
        self.authenticate()
    
    def authenticate(self):
        """Authenticate batch user"""
        with self.client.get("/api/auth/status") as response:
            pass
    
    @task(10)
    def rapid_uploads(self):
        """Simulate rapid file uploads"""
        self._upload_file(size_kb=random.randint(500, 2000))
    
    @task(8)
    def batch_status_checks(self):
        """Rapid status checking"""
        # Simulate checking multiple sessions
        for _ in range(random.randint(3, 7)):
            session_id = f"session_{random.randint(1000, 9999)}"
            with self.client.get(
                f"/api/sessions/{session_id}/status",
                name="batch_status_check"
            ) as response:
                pass
    
    def _upload_file(self, size_kb: int):
        """Upload file for batch processing"""
        test_content = b'A' * (size_kb * 1024)
        files = {
            'file': ('batch_document.pdf', test_content, 'application/pdf')
        }
        
        with self.client.post(
            "/api/upload/",
            files=files,
            name="batch_upload",
            catch_response=True
        ) as response:
            if response.status_code != 200:
                response.failure(f"Batch upload failed: {response.status_code}")

# Performance test event handlers
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Called when load test starts"""
    print("🚀 Starting Credit Card Processor load test")
    print(f"Target host: {environment.host}")
    print("=" * 50)

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when load test stops"""
    print("=" * 50)
    print("🏁 Load test completed")
    
    # Print summary statistics
    stats = environment.stats
    print(f"Total requests: {stats.total.num_requests}")
    print(f"Total failures: {stats.total.num_failures}")
    print(f"Average response time: {stats.total.avg_response_time:.2f}ms")
    print(f"Max response time: {stats.total.max_response_time:.2f}ms")
    print(f"Requests per second: {stats.total.current_rps:.2f}")
    
    if stats.total.num_failures > 0:
        failure_rate = (stats.total.num_failures / stats.total.num_requests) * 100
        print(f"Failure rate: {failure_rate:.2f}%")

# Custom performance metrics collection
response_times = []
error_counts = {}

@events.request_success.add_listener
def on_request_success(request_type, name, response_time, response_length, **kwargs):
    """Track successful requests"""
    response_times.append(response_time)

@events.request_failure.add_listener
def on_request_failure(request_type, name, response_time, response_length, exception, **kwargs):
    """Track failed requests"""
    error_type = type(exception).__name__
    error_counts[error_type] = error_counts.get(error_type, 0) + 1