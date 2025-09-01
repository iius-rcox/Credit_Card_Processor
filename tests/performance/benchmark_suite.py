"""
Performance benchmarking suite for Credit Card Processor.

This module provides comprehensive benchmarking capabilities to measure
and track application performance over time.
"""

import asyncio
import time
import psutil
import statistics
import json
import os
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import aiohttp
import concurrent.futures
from pathlib import Path

@dataclass
class BenchmarkResult:
    """Individual benchmark test result"""
    name: str
    duration_ms: float
    success: bool
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

@dataclass
class BenchmarkSuite:
    """Complete benchmark suite results"""
    suite_name: str
    timestamp: str
    total_duration_ms: float
    results: List[BenchmarkResult]
    system_metrics: Dict[str, Any]
    summary: Dict[str, Any]

class PerformanceBenchmark:
    """Main benchmark runner for performance testing"""
    
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.results: List[BenchmarkResult] = []
        self.start_time = None
        self.session = None
        
    async def setup(self):
        """Initialize benchmark session"""
        self.session = aiohttp.ClientSession()
        self.start_time = time.time()
        
        # Warm up the application
        await self._warmup()
        
    async def teardown(self):
        """Clean up benchmark session"""
        if self.session:
            await self.session.close()
    
    async def _warmup(self):
        """Warm up the application before benchmarking"""
        try:
            async with self.session.get(f"{self.base_url}/health") as response:
                await response.text()
        except Exception as e:
            print(f"Warning: Warmup failed - {e}")
    
    async def run_full_suite(self) -> BenchmarkSuite:
        """Run complete benchmark suite"""
        await self.setup()
        
        suite_start = time.time()
        
        try:
            # Core API benchmarks
            await self._benchmark_health_checks()
            await self._benchmark_authentication()
            await self._benchmark_file_uploads()
            await self._benchmark_processing_operations()
            await self._benchmark_monitoring_endpoints()
            await self._benchmark_concurrent_operations()
            
            # System stress tests
            await self._benchmark_memory_usage()
            await self._benchmark_cpu_usage()
            
        finally:
            await self.teardown()
        
        suite_duration = (time.time() - suite_start) * 1000
        
        # Collect system metrics
        system_metrics = self._collect_system_metrics()
        
        # Generate summary
        summary = self._generate_summary()
        
        return BenchmarkSuite(
            suite_name="Credit Card Processor Performance Benchmark",
            timestamp=datetime.now(timezone.utc).isoformat(),
            total_duration_ms=suite_duration,
            results=self.results,
            system_metrics=system_metrics,
            summary=summary
        )
    
    async def _benchmark_health_checks(self):
        """Benchmark health check endpoints"""
        
        # Basic health check
        await self._time_request(
            "GET", "/health", 
            "basic_health_check"
        )
        
        # Detailed health check
        await self._time_request(
            "GET", "/api/health/detailed", 
            "detailed_health_check"
        )
        
        # Critical health check
        await self._time_request(
            "GET", "/api/health/critical", 
            "critical_health_check"
        )
    
    async def _benchmark_authentication(self):
        """Benchmark authentication endpoints"""
        
        # Auth status
        await self._time_request(
            "GET", "/api/auth/status", 
            "auth_status_check"
        )
        
        # Current user (may fail without auth, but we're measuring response time)
        await self._time_request(
            "GET", "/api/auth/current-user", 
            "current_user_check",
            expect_failure=True
        )
    
    async def _benchmark_file_uploads(self):
        """Benchmark file upload performance with various sizes"""
        
        # Test different file sizes
        test_sizes = [
            (1024, "1KB file upload"),           # 1KB
            (10 * 1024, "10KB file upload"),    # 10KB
            (100 * 1024, "100KB file upload"),  # 100KB
            (1024 * 1024, "1MB file upload"),   # 1MB
            (5 * 1024 * 1024, "5MB file upload"), # 5MB
        ]
        
        for size_bytes, test_name in test_sizes:
            await self._benchmark_file_upload(size_bytes, test_name)
    
    async def _benchmark_file_upload(self, size_bytes: int, test_name: str):
        """Benchmark a single file upload"""
        
        # Create test file content
        file_content = b'A' * size_bytes
        
        # Prepare multipart form data
        data = aiohttp.FormData()
        data.add_field('file', file_content, filename='test.pdf', content_type='application/pdf')
        
        start_time = time.time()
        success = False
        error = None
        
        try:
            async with self.session.post(f"{self.base_url}/api/upload/", data=data) as response:
                await response.text()
                success = response.status == 200
                if not success:
                    error = f"HTTP {response.status}"
                    
        except Exception as e:
            error = str(e)
        
        duration_ms = (time.time() - start_time) * 1000
        
        self.results.append(BenchmarkResult(
            name=test_name,
            duration_ms=duration_ms,
            success=success,
            error=error,
            metadata={"file_size_bytes": size_bytes}
        ))
    
    async def _benchmark_processing_operations(self):
        """Benchmark processing-related operations"""
        
        # Session status checks
        await self._time_request(
            "GET", "/api/sessions/test-session/status", 
            "session_status_check",
            expect_failure=True  # May fail if session doesn't exist
        )
        
        # Results retrieval
        await self._time_request(
            "GET", "/api/results/test-session", 
            "results_retrieval",
            expect_failure=True
        )
    
    async def _benchmark_monitoring_endpoints(self):
        """Benchmark monitoring and metrics endpoints"""
        
        # System metrics
        await self._time_request(
            "GET", "/api/monitoring/system", 
            "system_metrics"
        )
        
        # Application metrics
        await self._time_request(
            "GET", "/api/monitoring/application", 
            "application_metrics"
        )
        
        # Combined metrics
        await self._time_request(
            "GET", "/api/monitoring/metrics", 
            "combined_metrics"
        )
        
        # Prometheus metrics
        await self._time_request(
            "GET", "/metrics", 
            "prometheus_metrics"
        )
        
        # Alerts
        await self._time_request(
            "GET", "/api/alerts", 
            "alerts_check"
        )
    
    async def _benchmark_concurrent_operations(self):
        """Benchmark concurrent request handling"""
        
        # Test concurrent health checks
        await self._benchmark_concurrent_requests(
            "GET", "/health", 
            "concurrent_health_checks",
            concurrent_count=10
        )
        
        # Test concurrent metrics requests
        await self._benchmark_concurrent_requests(
            "GET", "/api/monitoring/system", 
            "concurrent_metrics",
            concurrent_count=5
        )
    
    async def _benchmark_concurrent_requests(self, method: str, endpoint: str, 
                                          test_name: str, concurrent_count: int = 10):
        """Benchmark concurrent requests to the same endpoint"""
        
        start_time = time.time()
        
        # Create tasks for concurrent requests
        tasks = []
        for i in range(concurrent_count):
            task = self._single_request(method, endpoint)
            tasks.append(task)
        
        # Execute all requests concurrently
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Count successes and failures
            successes = sum(1 for r in results if isinstance(r, tuple) and r[0])
            failures = concurrent_count - successes
            
            duration_ms = (time.time() - start_time) * 1000
            
            self.results.append(BenchmarkResult(
                name=test_name,
                duration_ms=duration_ms,
                success=failures == 0,
                error=f"{failures} failures out of {concurrent_count}" if failures > 0 else None,
                metadata={
                    "concurrent_requests": concurrent_count,
                    "successful_requests": successes,
                    "failed_requests": failures,
                    "avg_duration_per_request": duration_ms / concurrent_count
                }
            ))
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            self.results.append(BenchmarkResult(
                name=test_name,
                duration_ms=duration_ms,
                success=False,
                error=str(e)
            ))
    
    async def _single_request(self, method: str, endpoint: str) -> tuple:
        """Execute a single HTTP request"""
        try:
            async with self.session.request(method, f"{self.base_url}{endpoint}") as response:
                await response.text()
                return (True, response.status)
        except Exception as e:
            return (False, str(e))
    
    async def _benchmark_memory_usage(self):
        """Benchmark memory usage under load"""
        
        start_time = time.time()
        initial_memory = psutil.virtual_memory().used
        
        # Perform memory-intensive operations
        tasks = []
        for i in range(20):  # Create multiple concurrent requests
            task = self._time_request("GET", "/api/monitoring/metrics", f"memory_test_{i}")
            tasks.append(task)
        
        await asyncio.gather(*tasks, return_exceptions=True)
        
        final_memory = psutil.virtual_memory().used
        memory_increase = final_memory - initial_memory
        duration_ms = (time.time() - start_time) * 1000
        
        self.results.append(BenchmarkResult(
            name="memory_usage_test",
            duration_ms=duration_ms,
            success=True,
            metadata={
                "initial_memory_mb": initial_memory / (1024 * 1024),
                "final_memory_mb": final_memory / (1024 * 1024),
                "memory_increase_mb": memory_increase / (1024 * 1024)
            }
        ))
    
    async def _benchmark_cpu_usage(self):
        """Benchmark CPU usage under load"""
        
        start_time = time.time()
        initial_cpu = psutil.cpu_percent(interval=0.1)
        
        # Create CPU-intensive load
        tasks = []
        for i in range(50):  # Heavy concurrent load
            task = self._time_request("GET", "/api/health/detailed", f"cpu_test_{i}")
            tasks.append(task)
        
        await asyncio.gather(*tasks, return_exceptions=True)
        
        final_cpu = psutil.cpu_percent(interval=0.1)
        duration_ms = (time.time() - start_time) * 1000
        
        self.results.append(BenchmarkResult(
            name="cpu_usage_test",
            duration_ms=duration_ms,
            success=True,
            metadata={
                "initial_cpu_percent": initial_cpu,
                "final_cpu_percent": final_cpu,
                "cpu_increase": final_cpu - initial_cpu
            }
        ))
    
    async def _time_request(self, method: str, endpoint: str, test_name: str, 
                          expect_failure: bool = False) -> BenchmarkResult:
        """Time a single HTTP request"""
        
        start_time = time.time()
        success = False
        error = None
        status_code = None
        
        try:
            async with self.session.request(method, f"{self.base_url}{endpoint}") as response:
                await response.text()
                status_code = response.status
                success = response.status < 400 or expect_failure
                if not success and not expect_failure:
                    error = f"HTTP {response.status}"
                    
        except Exception as e:
            error = str(e)
            success = expect_failure
        
        duration_ms = (time.time() - start_time) * 1000
        
        result = BenchmarkResult(
            name=test_name,
            duration_ms=duration_ms,
            success=success,
            error=error,
            metadata={"status_code": status_code}
        )
        
        self.results.append(result)
        return result
    
    def _collect_system_metrics(self) -> Dict[str, Any]:
        """Collect current system metrics"""
        
        memory = psutil.virtual_memory()
        cpu_percent = psutil.cpu_percent(interval=1)
        disk = psutil.disk_usage('.')
        
        return {
            "memory": {
                "total_gb": memory.total / (1024**3),
                "available_gb": memory.available / (1024**3),
                "used_percent": memory.percent
            },
            "cpu": {
                "percent": cpu_percent,
                "count": psutil.cpu_count()
            },
            "disk": {
                "total_gb": disk.total / (1024**3),
                "free_gb": disk.free / (1024**3),
                "used_percent": (disk.used / disk.total) * 100
            }
        }
    
    def _generate_summary(self) -> Dict[str, Any]:
        """Generate benchmark summary statistics"""
        
        if not self.results:
            return {}
        
        # Filter successful results for timing analysis
        successful_results = [r for r in self.results if r.success]
        all_durations = [r.duration_ms for r in self.results]
        successful_durations = [r.duration_ms for r in successful_results]
        
        summary = {
            "total_tests": len(self.results),
            "successful_tests": len(successful_results),
            "failed_tests": len(self.results) - len(successful_results),
            "success_rate_percent": (len(successful_results) / len(self.results)) * 100,
        }
        
        if successful_durations:
            summary.update({
                "avg_response_time_ms": statistics.mean(successful_durations),
                "median_response_time_ms": statistics.median(successful_durations),
                "min_response_time_ms": min(successful_durations),
                "max_response_time_ms": max(successful_durations),
                "p95_response_time_ms": self._percentile(successful_durations, 95),
                "p99_response_time_ms": self._percentile(successful_durations, 99)
            })
        
        # Performance grades
        if successful_durations:
            avg_time = statistics.mean(successful_durations)
            if avg_time < 100:
                performance_grade = "A"
            elif avg_time < 250:
                performance_grade = "B"
            elif avg_time < 500:
                performance_grade = "C"
            elif avg_time < 1000:
                performance_grade = "D"
            else:
                performance_grade = "F"
            
            summary["performance_grade"] = performance_grade
        
        return summary
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile of a list"""
        sorted_data = sorted(data)
        index = (percentile / 100) * (len(sorted_data) - 1)
        
        if index.is_integer():
            return sorted_data[int(index)]
        else:
            lower_index = int(index)
            upper_index = lower_index + 1
            weight = index - lower_index
            return sorted_data[lower_index] * (1 - weight) + sorted_data[upper_index] * weight

class BenchmarkReporter:
    """Generate benchmark reports"""
    
    @staticmethod
    def save_results(results: BenchmarkSuite, output_dir: str = "tests/performance/results"):
        """Save benchmark results to file"""
        
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"benchmark_results_{timestamp}.json"
        filepath = os.path.join(output_dir, filename)
        
        # Save results as JSON
        with open(filepath, 'w') as f:
            json.dump(asdict(results), f, indent=2)
        
        print(f"Benchmark results saved to: {filepath}")
        return filepath
    
    @staticmethod
    def generate_report(results: BenchmarkSuite) -> str:
        """Generate human-readable benchmark report"""
        
        report = f"""
# Credit Card Processor Performance Benchmark Report

**Test Suite:** {results.suite_name}
**Timestamp:** {results.timestamp}
**Total Duration:** {results.total_duration_ms:.2f}ms

## Summary Statistics
- **Total Tests:** {results.summary.get('total_tests', 0)}
- **Successful Tests:** {results.summary.get('successful_tests', 0)}
- **Failed Tests:** {results.summary.get('failed_tests', 0)}
- **Success Rate:** {results.summary.get('success_rate_percent', 0):.1f}%
- **Performance Grade:** {results.summary.get('performance_grade', 'N/A')}

## Response Time Statistics
- **Average:** {results.summary.get('avg_response_time_ms', 0):.2f}ms
- **Median:** {results.summary.get('median_response_time_ms', 0):.2f}ms
- **Min:** {results.summary.get('min_response_time_ms', 0):.2f}ms
- **Max:** {results.summary.get('max_response_time_ms', 0):.2f}ms
- **95th Percentile:** {results.summary.get('p95_response_time_ms', 0):.2f}ms
- **99th Percentile:** {results.summary.get('p99_response_time_ms', 0):.2f}ms

## System Metrics
### Memory
- **Total:** {results.system_metrics['memory']['total_gb']:.2f}GB
- **Available:** {results.system_metrics['memory']['available_gb']:.2f}GB
- **Used:** {results.system_metrics['memory']['used_percent']:.1f}%

### CPU
- **Usage:** {results.system_metrics['cpu']['percent']:.1f}%
- **Cores:** {results.system_metrics['cpu']['count']}

### Disk
- **Total:** {results.system_metrics['disk']['total_gb']:.2f}GB
- **Free:** {results.system_metrics['disk']['free_gb']:.2f}GB
- **Used:** {results.system_metrics['disk']['used_percent']:.1f}%

## Individual Test Results
"""
        
        # Add individual test results
        for result in results.results:
            status = "✅ PASS" if result.success else "❌ FAIL"
            report += f"- **{result.name}**: {status} - {result.duration_ms:.2f}ms"
            if result.error:
                report += f" (Error: {result.error})"
            report += "\n"
        
        return report

async def run_benchmark():
    """Run the complete benchmark suite"""
    
    print("🚀 Starting Credit Card Processor Performance Benchmark")
    print("=" * 60)
    
    benchmark = PerformanceBenchmark()
    results = await benchmark.run_full_suite()
    
    # Save results
    results_file = BenchmarkReporter.save_results(results)
    
    # Generate and save report
    report = BenchmarkReporter.generate_report(results)
    
    report_file = results_file.replace('.json', '_report.md')
    with open(report_file, 'w') as f:
        f.write(report)
    
    print("=" * 60)
    print("📊 Benchmark completed!")
    print(f"Results saved to: {results_file}")
    print(f"Report saved to: {report_file}")
    print()
    print("📈 Quick Summary:")
    print(f"Success Rate: {results.summary.get('success_rate_percent', 0):.1f}%")
    print(f"Average Response Time: {results.summary.get('avg_response_time_ms', 0):.2f}ms")
    print(f"Performance Grade: {results.summary.get('performance_grade', 'N/A')}")
    
    return results

if __name__ == "__main__":
    asyncio.run(run_benchmark())