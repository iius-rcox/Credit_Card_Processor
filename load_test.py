#!/usr/bin/env python3
"""
Load Testing Script for Credit Card Processor
Tests API endpoints under concurrent load and measures performance
"""

import asyncio
import time
import json
import statistics
import httpx
import logging
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
import psutil
import subprocess
import os

@dataclass
class LoadTestConfig:
    """Load test configuration"""
    base_url: str = "http://localhost:8000"
    concurrent_users: int = 10
    requests_per_user: int = 20
    ramp_up_time: int = 5  # seconds
    test_duration: int = 60  # seconds
    timeout: int = 30  # seconds

@dataclass
class TestResult:
    """Individual test result"""
    endpoint: str
    method: str
    status_code: int
    response_time_ms: float
    success: bool
    error: str = None

class LoadTester:
    """Load testing utility for API endpoints"""
    
    def __init__(self, config: LoadTestConfig):
        self.config = config
        self.results: List[TestResult] = []
        self.start_time = 0
        self.end_time = 0
        
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
        
    def log(self, message: str, level: str = 'INFO'):
        """Log message with timestamp"""
        if level == 'INFO':
            self.logger.info(message)
        elif level == 'WARNING':
            self.logger.warning(message)
        elif level == 'ERROR':
            self.logger.error(message)
    
    async def make_request(self, client: httpx.AsyncClient, method: str, 
                          endpoint: str, headers: Dict = None, 
                          json_data: Dict = None) -> TestResult:
        """Make a single HTTP request and measure performance"""
        start_time = time.perf_counter()
        
        try:
            if method.upper() == 'GET':
                response = await client.get(endpoint, headers=headers or {})
            elif method.upper() == 'POST':
                response = await client.post(endpoint, headers=headers or {}, json=json_data or {})
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            end_time = time.perf_counter()
            response_time = (end_time - start_time) * 1000
            
            return TestResult(
                endpoint=endpoint,
                method=method,
                status_code=response.status_code,
                response_time_ms=response_time,
                success=200 <= response.status_code < 300,
                error=None if 200 <= response.status_code < 300 else f"HTTP {response.status_code}"
            )
            
        except Exception as e:
            end_time = time.perf_counter()
            response_time = (end_time - start_time) * 1000
            
            return TestResult(
                endpoint=endpoint,
                method=method,
                status_code=0,
                response_time_ms=response_time,
                success=False,
                error=str(e)
            )
    
    async def simulate_user(self, user_id: int, test_scenarios: List[Dict]) -> List[TestResult]:
        """Simulate a single user performing multiple requests"""
        user_results = []
        
        async with httpx.AsyncClient(
            base_url=self.config.base_url,
            timeout=self.config.timeout,
            limits=httpx.Limits(max_connections=100)
        ) as client:
            
            for i in range(self.config.requests_per_user):
                # Select test scenario (round robin)
                scenario = test_scenarios[i % len(test_scenarios)]
                
                result = await self.make_request(
                    client=client,
                    method=scenario['method'],
                    endpoint=scenario['endpoint'],
                    headers=scenario.get('headers'),
                    json_data=scenario.get('json_data')
                )
                
                user_results.append(result)
                
                # Small delay between requests
                await asyncio.sleep(0.1)
        
        return user_results
    
    async def run_load_test(self, test_scenarios: List[Dict]) -> Dict[str, Any]:
        """Run the complete load test"""
        self.log(f"Starting load test with {self.config.concurrent_users} users, "
                f"{self.config.requests_per_user} requests each")
        
        # Monitor system resources
        process = psutil.Process()
        system_before = {
            'cpu_percent': psutil.cpu_percent(),
            'memory_mb': psutil.virtual_memory().used / 1024 / 1024,
            'process_memory_mb': process.memory_info().rss / 1024 / 1024
        }
        
        self.start_time = time.perf_counter()
        
        # Create tasks for concurrent users
        tasks = []
        for user_id in range(self.config.concurrent_users):
            # Stagger user start times for ramp-up
            delay = (user_id * self.config.ramp_up_time) / self.config.concurrent_users
            
            task = asyncio.create_task(
                self.simulate_user_with_delay(user_id, test_scenarios, delay)
            )
            tasks.append(task)
        
        # Wait for all tasks to complete
        all_results = await asyncio.gather(*tasks)
        
        self.end_time = time.perf_counter()
        
        # Flatten results
        for user_results in all_results:
            self.results.extend(user_results)
        
        # Monitor system resources after test
        system_after = {
            'cpu_percent': psutil.cpu_percent(),
            'memory_mb': psutil.virtual_memory().used / 1024 / 1024,
            'process_memory_mb': process.memory_info().rss / 1024 / 1024
        }
        
        # Generate report
        return self.generate_report(system_before, system_after)
    
    async def simulate_user_with_delay(self, user_id: int, test_scenarios: List[Dict], 
                                      delay: float) -> List[TestResult]:
        """Simulate user with initial delay for ramp-up"""
        await asyncio.sleep(delay)
        return await self.simulate_user(user_id, test_scenarios)
    
    def generate_report(self, system_before: Dict, system_after: Dict) -> Dict[str, Any]:
        """Generate comprehensive load test report"""
        total_duration = self.end_time - self.start_time
        
        # Overall statistics
        successful_requests = [r for r in self.results if r.success]
        failed_requests = [r for r in self.results if not r.success]
        
        response_times = [r.response_time_ms for r in successful_requests]
        
        # Per-endpoint statistics
        endpoint_stats = {}
        for result in self.results:
            key = f"{result.method} {result.endpoint}"
            if key not in endpoint_stats:
                endpoint_stats[key] = {
                    'total_requests': 0,
                    'successful_requests': 0,
                    'failed_requests': 0,
                    'response_times': []
                }
            
            endpoint_stats[key]['total_requests'] += 1
            if result.success:
                endpoint_stats[key]['successful_requests'] += 1
                endpoint_stats[key]['response_times'].append(result.response_time_ms)
            else:
                endpoint_stats[key]['failed_requests'] += 1
        
        # Calculate per-endpoint metrics
        for endpoint, stats in endpoint_stats.items():
            if stats['response_times']:
                times = stats['response_times']
                stats.update({
                    'avg_response_time_ms': statistics.mean(times),
                    'min_response_time_ms': min(times),
                    'max_response_time_ms': max(times),
                    'median_response_time_ms': statistics.median(times),
                    'p95_response_time_ms': self._percentile(times, 95),
                    'p99_response_time_ms': self._percentile(times, 99),
                    'success_rate': stats['successful_requests'] / stats['total_requests'] * 100,
                    'requests_per_second': len(times) / total_duration
                })
        
        # Overall metrics
        report = {
            'test_configuration': {
                'concurrent_users': self.config.concurrent_users,
                'requests_per_user': self.config.requests_per_user,
                'total_requests': len(self.results),
                'test_duration_seconds': total_duration,
                'ramp_up_time': self.config.ramp_up_time
            },
            'overall_performance': {
                'total_requests': len(self.results),
                'successful_requests': len(successful_requests),
                'failed_requests': len(failed_requests),
                'success_rate_percent': len(successful_requests) / len(self.results) * 100 if self.results else 0,
                'avg_response_time_ms': statistics.mean(response_times) if response_times else 0,
                'min_response_time_ms': min(response_times) if response_times else 0,
                'max_response_time_ms': max(response_times) if response_times else 0,
                'median_response_time_ms': statistics.median(response_times) if response_times else 0,
                'p95_response_time_ms': self._percentile(response_times, 95) if response_times else 0,
                'p99_response_time_ms': self._percentile(response_times, 99) if response_times else 0,
                'requests_per_second': len(successful_requests) / total_duration,
                'errors': list(set(r.error for r in failed_requests if r.error))
            },
            'endpoint_performance': endpoint_stats,
            'system_resources': {
                'before': system_before,
                'after': system_after,
                'cpu_change': system_after['cpu_percent'] - system_before['cpu_percent'],
                'memory_change_mb': system_after['memory_mb'] - system_before['memory_mb'],
                'process_memory_change_mb': system_after['process_memory_mb'] - system_before['process_memory_mb']
            },
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        
        return report
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile value"""
        if not data:
            return 0
        sorted_data = sorted(data)
        k = (len(sorted_data) - 1) * percentile / 100
        f = int(k)
        c = k - f
        if f == len(sorted_data) - 1:
            return sorted_data[f]
        return sorted_data[f] * (1 - c) + sorted_data[f + 1] * c

def check_service_health(base_url: str) -> bool:
    """Check if the service is running"""
    try:
        import requests
        response = requests.get(f"{base_url}/health", timeout=5)
        return response.status_code == 200
    except:
        return False

async def main():
    """Main load testing function"""
    print("=" * 80)
    print("CREDIT CARD PROCESSOR - LOAD TESTING")
    print("=" * 80)
    
    # Configuration
    config = LoadTestConfig(
        base_url="http://localhost:8000",
        concurrent_users=5,  # Start with lighter load
        requests_per_user=10,
        ramp_up_time=2,
        test_duration=30
    )
    
    # Check if service is running
    print("Checking service availability...")
    if not check_service_health(config.base_url):
        print("❌ Service is not available. Please start the backend service first.")
        print("   Run: cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000")
        return
    
    print("✅ Service is available")
    
    # Test scenarios
    test_scenarios = [
        {
            'method': 'GET',
            'endpoint': '/health',
        },
        {
            'method': 'GET',
            'endpoint': '/',
        },
        {
            'method': 'GET',
            'endpoint': '/api/auth/status',
            'headers': {'X-Dev-User': 'loadtest'}
        },
        # Add more scenarios as needed
    ]
    
    # Initialize load tester
    tester = LoadTester(config)
    
    print(f"Starting load test:")
    print(f"  - Users: {config.concurrent_users}")
    print(f"  - Requests per user: {config.requests_per_user}")
    print(f"  - Total requests: {config.concurrent_users * config.requests_per_user}")
    print(f"  - Ramp-up time: {config.ramp_up_time}s")
    
    try:
        # Run load test
        report = await tester.run_load_test(test_scenarios)
        
        # Save detailed report
        report_filename = f"load_test_report_{int(time.time())}.json"
        with open(report_filename, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        # Print summary
        print("\n" + "=" * 80)
        print("LOAD TEST RESULTS SUMMARY")
        print("=" * 80)
        
        overall = report['overall_performance']
        config_info = report['test_configuration']
        
        print(f"Test Duration: {config_info['test_duration_seconds']:.2f}s")
        print(f"Total Requests: {overall['total_requests']}")
        print(f"Successful: {overall['successful_requests']} ({overall['success_rate_percent']:.1f}%)")
        print(f"Failed: {overall['failed_requests']}")
        print(f"Requests/sec: {overall['requests_per_second']:.2f}")
        
        print(f"\nResponse Time Statistics:")
        print(f"  Average: {overall['avg_response_time_ms']:.1f}ms")
        print(f"  Median: {overall['median_response_time_ms']:.1f}ms")
        print(f"  95th percentile: {overall['p95_response_time_ms']:.1f}ms")
        print(f"  99th percentile: {overall['p99_response_time_ms']:.1f}ms")
        print(f"  Min: {overall['min_response_time_ms']:.1f}ms")
        print(f"  Max: {overall['max_response_time_ms']:.1f}ms")
        
        # System resources
        resources = report['system_resources']
        print(f"\nSystem Resource Impact:")
        print(f"  CPU change: {resources['cpu_change']:.1f}%")
        print(f"  Memory change: {resources['memory_change_mb']:.1f} MB")
        
        # Endpoint breakdown
        print(f"\nPer-Endpoint Performance:")
        for endpoint, stats in report['endpoint_performance'].items():
            if 'avg_response_time_ms' in stats:
                status = "✅ GOOD" if stats['avg_response_time_ms'] < 100 else "⚠️  SLOW" if stats['avg_response_time_ms'] < 500 else "❌ POOR"
                print(f"  {endpoint}: {stats['avg_response_time_ms']:.1f}ms avg, "
                      f"{stats['success_rate']:.1f}% success, "
                      f"{stats['requests_per_second']:.1f} RPS - {status}")
        
        # Performance assessment
        print(f"\nPerformance Assessment:")
        avg_response = overall['avg_response_time_ms']
        success_rate = overall['success_rate_percent']
        rps = overall['requests_per_second']
        
        performance_score = 0
        if avg_response < 50: performance_score += 25
        elif avg_response < 100: performance_score += 20
        elif avg_response < 200: performance_score += 15
        elif avg_response < 500: performance_score += 10
        
        if success_rate >= 99: performance_score += 25
        elif success_rate >= 95: performance_score += 20
        elif success_rate >= 90: performance_score += 15
        elif success_rate >= 80: performance_score += 10
        
        if rps >= 100: performance_score += 25
        elif rps >= 50: performance_score += 20
        elif rps >= 25: performance_score += 15
        elif rps >= 10: performance_score += 10
        
        if overall['p95_response_time_ms'] < 200: performance_score += 25
        elif overall['p95_response_time_ms'] < 500: performance_score += 20
        elif overall['p95_response_time_ms'] < 1000: performance_score += 15
        elif overall['p95_response_time_ms'] < 2000: performance_score += 10
        
        print(f"Overall Score: {performance_score}/100")
        
        if performance_score >= 80:
            print("🎉 EXCELLENT: System performs well under load")
        elif performance_score >= 60:
            print("✅ GOOD: Acceptable performance with minor optimizations needed")
        elif performance_score >= 40:
            print("⚠️  FAIR: Performance needs improvement")
        else:
            print("❌ POOR: Significant performance issues detected")
        
        # Error summary
        if overall['errors']:
            print(f"\nErrors encountered:")
            for error in overall['errors']:
                print(f"  - {error}")
        
        print(f"\nDetailed report saved to: {report_filename}")
        
    except KeyboardInterrupt:
        print("\n❌ Load test interrupted by user")
    except Exception as e:
        print(f"❌ Load test failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())