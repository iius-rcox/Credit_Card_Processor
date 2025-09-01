"""
Locust load testing configuration for Credit Card Processor.

This file defines load testing scenarios that can be executed with:
    locust -f tests/performance/locustfile.py --host http://localhost:8001

Different test scenarios can be run with:
    locust -f tests/performance/locustfile.py --host http://localhost:8001 --tag baseline
    locust -f tests/performance/locustfile.py --host http://localhost:8001 --tag stress
    locust -f tests/performance/locustfile.py --host http://localhost:8001 --tag spike
"""

from locust import HttpUser, task, between, tag
import random
import json

# Import user classes from load testing module
from .test_load_testing import CreditCardProcessorUser, AdminUser, HighVolumeUser

# Define load testing scenarios through user mix and configuration

class BaselineUser(CreditCardProcessorUser):
    """Baseline load testing - normal user behavior"""
    wait_time = between(2, 5)
    weight = 10

    @tag("baseline")
    @task(5)
    def normal_upload(self):
        """Normal file upload pattern"""
        self._upload_file(size_kb=random.randint(500, 2000))

    @tag("baseline")  
    @task(3)
    def check_status(self):
        """Check processing status"""
        super().check_processing_status()

    @tag("baseline")
    @task(2)
    def health_check(self):
        """Health monitoring"""
        super().check_health()

class StressTestUser(CreditCardProcessorUser):
    """Stress testing - heavy load simulation"""
    wait_time = between(0.5, 2)
    weight = 15

    @tag("stress")
    @task(8)
    def heavy_upload(self):
        """Heavy file upload load"""
        self._upload_file(size_kb=random.randint(1000, 5000))

    @tag("stress")
    @task(6)
    def rapid_status_check(self):
        """Rapid status checking"""
        super().check_processing_status()

    @tag("stress")
    @task(4)
    def processing_operations(self):
        """Processing operations under stress"""
        super().start_processing()

class SpikeTestUser(CreditCardProcessorUser):
    """Spike testing - sudden traffic bursts"""
    wait_time = between(0.1, 1)
    weight = 20

    @tag("spike")
    @task(10)
    def burst_upload(self):
        """Burst file uploads"""
        self._upload_file(size_kb=random.randint(2000, 10000))

    @tag("spike")
    @task(8)
    def burst_requests(self):
        """Burst API requests"""
        endpoints = [
            "/health",
            "/api/auth/status", 
            "/api/monitoring/system"
        ]
        endpoint = random.choice(endpoints)
        self.client.get(endpoint)

class EnduranceTestUser(CreditCardProcessorUser):
    """Endurance testing - sustained load over time"""
    wait_time = between(1, 3)
    weight = 8

    @tag("endurance")
    @task(4)
    def sustained_upload(self):
        """Sustained file upload pattern"""
        self._upload_file(size_kb=random.randint(1000, 3000))

    @tag("endurance")
    @task(3)
    def sustained_processing(self):
        """Sustained processing operations"""
        super().start_processing()

    @tag("endurance")
    @task(2)
    def sustained_monitoring(self):
        """Sustained monitoring checks"""
        super().get_metrics()

class SecurityTestUser(HttpUser):
    """Security-focused load testing"""
    wait_time = between(1, 4)
    weight = 2

    @tag("security")
    @task(3)
    def auth_attempts(self):
        """Authentication load testing"""
        self.client.get("/api/auth/status")

    @tag("security")
    @task(2)
    def rate_limit_test(self):
        """Test rate limiting behavior"""
        # Rapid requests to trigger rate limiting
        for _ in range(5):
            self.client.get("/api/monitoring/metrics")

# Load testing configurations for different scenarios

# Baseline Load Test Configuration
# Target: 10-20 concurrent users, normal behavior
# Duration: 10 minutes
# Command: locust -f tests/performance/locustfile.py --host http://localhost:8001 --tag baseline -u 15 -r 2 -t 10m

# Stress Test Configuration  
# Target: 50-100 concurrent users, heavy load
# Duration: 15 minutes
# Command: locust -f tests/performance/locustfile.py --host http://localhost:8001 --tag stress -u 75 -r 5 -t 15m

# Spike Test Configuration
# Target: Sudden increase to 200+ users
# Duration: 5 minutes peak, 15 minutes total
# Command: locust -f tests/performance/locustfile.py --host http://localhost:8001 --tag spike -u 250 -r 25 -t 15m

# Endurance Test Configuration
# Target: 30-50 concurrent users, sustained load
# Duration: 60 minutes
# Command: locust -f tests/performance/locustfile.py --host http://localhost:8001 --tag endurance -u 40 -r 2 -t 60m

# Mixed Load Test (All user types)
# Target: Realistic mix of user behaviors
# Duration: 20 minutes
# Command: locust -f tests/performance/locustfile.py --host http://localhost:8001 -u 100 -r 5 -t 20m