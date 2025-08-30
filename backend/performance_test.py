#!/usr/bin/env python3
"""
Performance Testing Script for Credit Card Processor Backend
Tests API response times, database queries, and memory usage
"""

import time
import asyncio
import json
import statistics
import psutil
import os
import sys
from pathlib import Path
from typing import Dict, List, Any
from concurrent.futures import ThreadPoolExecutor
import memory_profiler
import sqlite3

# Add app to Python path
sys.path.append(str(Path(__file__).parent / "app"))

from fastapi.testclient import TestClient
from app.main import app
from app.database import init_database, get_db
from app.models import ProcessingSession, SessionStatus

class PerformanceProfiler:
    """Performance profiling utilities"""
    
    def __init__(self):
        self.results = {}
        self.process = psutil.Process()
    
    def measure_memory(self, operation_name: str):
        """Measure memory usage for an operation"""
        return memory_profiler.profile(self._memory_wrapper(operation_name))
    
    def _memory_wrapper(self, operation_name: str):
        def wrapper(func):
            def inner(*args, **kwargs):
                mem_before = self.process.memory_info().rss / 1024 / 1024  # MB
                result = func(*args, **kwargs)
                mem_after = self.process.memory_info().rss / 1024 / 1024  # MB
                
                if operation_name not in self.results:
                    self.results[operation_name] = {'memory': []}
                
                self.results[operation_name]['memory'].append({
                    'before_mb': mem_before,
                    'after_mb': mem_after,
                    'delta_mb': mem_after - mem_before
                })
                
                return result
            return inner
        return wrapper

class APIPerformanceTester:
    """Test API endpoint performance"""
    
    def __init__(self):
        self.client = TestClient(app)
        self.profiler = PerformanceProfiler()
        self.results = {}
        
        # Initialize test data
        init_database()
    
    def time_request(self, method: str, url: str, headers: Dict = None, json_data: Dict = None) -> Dict:
        """Time a single API request"""
        start_time = time.perf_counter()
        
        if method.upper() == 'GET':
            response = self.client.get(url, headers=headers or {})
        elif method.upper() == 'POST':
            response = self.client.post(url, headers=headers or {}, json=json_data or {})
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
        
        end_time = time.perf_counter()
        duration_ms = (end_time - start_time) * 1000
        
        return {
            'duration_ms': duration_ms,
            'status_code': response.status_code,
            'response_size': len(response.content),
            'success': 200 <= response.status_code < 300
        }
    
    def run_endpoint_performance_test(self, endpoint: str, method: str = 'GET', 
                                    iterations: int = 100, headers: Dict = None,
                                    json_data: Dict = None) -> Dict:
        """Run performance test on a specific endpoint"""
        print(f"Testing {method} {endpoint} ({iterations} iterations)...")
        
        results = []
        success_count = 0
        
        for i in range(iterations):
            result = self.time_request(method, endpoint, headers, json_data)
            results.append(result)
            if result['success']:
                success_count += 1
        
        durations = [r['duration_ms'] for r in results if r['success']]
        
        if durations:
            stats = {
                'endpoint': endpoint,
                'method': method,
                'iterations': iterations,
                'success_rate': success_count / iterations * 100,
                'avg_response_time_ms': statistics.mean(durations),
                'min_response_time_ms': min(durations),
                'max_response_time_ms': max(durations),
                'median_response_time_ms': statistics.median(durations),
                'p95_response_time_ms': self._percentile(durations, 95),
                'p99_response_time_ms': self._percentile(durations, 99),
                'requests_per_second': 1000 / statistics.mean(durations),
                'std_dev_ms': statistics.stdev(durations) if len(durations) > 1 else 0
            }
        else:
            stats = {
                'endpoint': endpoint,
                'method': method,
                'iterations': iterations,
                'success_rate': 0,
                'error': 'All requests failed'
            }
        
        self.results[f"{method}_{endpoint.replace('/', '_')}"] = stats
        return stats
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile"""
        sorted_data = sorted(data)
        k = (len(sorted_data) - 1) * percentile / 100
        f = int(k)
        c = k - f
        if f == len(sorted_data) - 1:
            return sorted_data[f]
        return sorted_data[f] * (1 - c) + sorted_data[f + 1] * c

class DatabasePerformanceTester:
    """Test database performance"""
    
    def __init__(self, db_path: str = "./data/database.db"):
        self.db_path = db_path
        self.results = {}
    
    def test_query_performance(self, query: str, params: tuple = None, 
                             iterations: int = 100) -> Dict:
        """Test SQL query performance"""
        print(f"Testing database query performance ({iterations} iterations)...")
        
        durations = []
        
        for _ in range(iterations):
            start_time = time.perf_counter()
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)
                results = cursor.fetchall()
            
            end_time = time.perf_counter()
            duration_ms = (end_time - start_time) * 1000
            durations.append(duration_ms)
        
        return {
            'query': query[:100] + "..." if len(query) > 100 else query,
            'iterations': iterations,
            'avg_response_time_ms': statistics.mean(durations),
            'min_response_time_ms': min(durations),
            'max_response_time_ms': max(durations),
            'median_response_time_ms': statistics.median(durations),
            'p95_response_time_ms': self._percentile(durations, 95),
            'queries_per_second': 1000 / statistics.mean(durations)
        }
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile"""
        sorted_data = sorted(data)
        k = (len(sorted_data) - 1) * percentile / 100
        f = int(k)
        c = k - f
        if f == len(sorted_data) - 1:
            return sorted_data[f]
        return sorted_data[f] * (1 - c) + sorted_data[f + 1] * c

def run_comprehensive_performance_test():
    """Run comprehensive performance test suite"""
    print("=" * 80)
    print("CREDIT CARD PROCESSOR - COMPREHENSIVE PERFORMANCE ASSESSMENT")
    print("=" * 80)
    
    # Test headers for authentication
    test_headers = {
        "X-Dev-User": "testuser",
        "Content-Type": "application/json"
    }
    
    # Initialize API tester
    api_tester = APIPerformanceTester()
    
    # Test basic endpoints
    print("\n1. BASIC API ENDPOINTS PERFORMANCE")
    print("-" * 50)
    
    endpoints_to_test = [
        ("/health", "GET"),
        ("/", "GET"),
        ("/api/auth/status", "GET"),
        ("/api/auth/current-user", "GET"),
        ("/api/sessions", "GET")
    ]
    
    for endpoint, method in endpoints_to_test:
        headers = test_headers if "api" in endpoint else None
        api_tester.run_endpoint_performance_test(
            endpoint, method, iterations=50, headers=headers
        )
    
    # Test session creation
    print("\n2. SESSION MANAGEMENT PERFORMANCE")
    print("-" * 50)
    
    session_data = {
        "session_name": f"Performance Test Session {time.time()}",
        "processing_options": {
            "validate_amounts": True,
            "auto_resolve": False
        }
    }
    
    api_tester.run_endpoint_performance_test(
        "/api/sessions", "POST", iterations=20, 
        headers=test_headers, json_data=session_data
    )
    
    # Test database performance
    print("\n3. DATABASE QUERY PERFORMANCE")
    print("-" * 50)
    
    db_tester = DatabasePerformanceTester()
    
    # Test common queries
    queries_to_test = [
        ("SELECT COUNT(*) FROM processing_sessions", None),
        ("SELECT * FROM processing_sessions ORDER BY created_at DESC LIMIT 10", None),
        ("SELECT * FROM processing_sessions WHERE status = ?", (SessionStatus.PENDING.value,)),
        ("SELECT ps.*, COUNT(er.revision_id) as revision_count FROM processing_sessions ps LEFT JOIN employee_revisions er ON ps.session_id = er.session_id GROUP BY ps.session_id LIMIT 20", None)
    ]
    
    db_results = {}
    for query, params in queries_to_test:
        result = db_tester.test_query_performance(query, params, iterations=100)
        db_results[f"query_{len(db_results) + 1}"] = result
    
    # Memory usage analysis
    print("\n4. MEMORY USAGE ANALYSIS")
    print("-" * 50)
    
    process = psutil.Process()
    memory_info = process.memory_info()
    
    memory_stats = {
        'current_memory_mb': memory_info.rss / 1024 / 1024,
        'virtual_memory_mb': memory_info.vms / 1024 / 1024,
        'cpu_percent': process.cpu_percent(),
        'num_threads': process.num_threads(),
        'open_files': len(process.open_files())
    }
    
    # Generate comprehensive report
    print("\n5. PERFORMANCE SUMMARY REPORT")
    print("=" * 80)
    
    report = {
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        'system_info': {
            'python_version': sys.version,
            'platform': sys.platform,
            'cpu_count': psutil.cpu_count(),
            'memory_total_mb': psutil.virtual_memory().total / 1024 / 1024
        },
        'api_performance': api_tester.results,
        'database_performance': db_results,
        'memory_usage': memory_stats
    }
    
    # Print summary
    print(f"Test completed at: {report['timestamp']}")
    print(f"System: {report['system_info']['platform']} with {report['system_info']['cpu_count']} CPUs")
    print(f"Total Memory: {report['system_info']['memory_total_mb']:.1f} MB")
    print(f"Current Memory Usage: {memory_stats['current_memory_mb']:.1f} MB")
    print(f"CPU Usage: {memory_stats['cpu_percent']:.1f}%")
    
    print("\nAPI Endpoint Performance Summary:")
    for endpoint, stats in api_tester.results.items():
        if 'avg_response_time_ms' in stats:
            status = "✓ PASS" if stats['avg_response_time_ms'] < 100 else "⚠ SLOW" if stats['avg_response_time_ms'] < 500 else "✗ FAIL"
            print(f"  {endpoint}: {stats['avg_response_time_ms']:.1f}ms avg, {stats['success_rate']:.1f}% success - {status}")
    
    print("\nDatabase Query Performance Summary:")
    for query_name, stats in db_results.items():
        status = "✓ PASS" if stats['avg_response_time_ms'] < 50 else "⚠ SLOW" if stats['avg_response_time_ms'] < 200 else "✗ FAIL"
        print(f"  {query_name}: {stats['avg_response_time_ms']:.1f}ms avg, {stats['queries_per_second']:.1f} QPS - {status}")
    
    # Save detailed report
    report_path = Path("performance_report.json")
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    print(f"\nDetailed report saved to: {report_path.absolute()}")
    
    return report

if __name__ == "__main__":
    try:
        report = run_comprehensive_performance_test()
        
        # Check if performance meets targets
        print("\n" + "=" * 80)
        print("PERFORMANCE TARGET ASSESSMENT")
        print("=" * 80)
        
        api_targets_met = 0
        api_total = 0
        
        for endpoint, stats in report['api_performance'].items():
            if 'avg_response_time_ms' in stats:
                api_total += 1
                if stats['avg_response_time_ms'] < 100:
                    api_targets_met += 1
        
        db_targets_met = 0
        db_total = 0
        
        for query_name, stats in report['database_performance'].items():
            db_total += 1
            if stats['avg_response_time_ms'] < 50:
                db_targets_met += 1
        
        print(f"API Response Time Targets: {api_targets_met}/{api_total} endpoints < 100ms")
        print(f"Database Query Targets: {db_targets_met}/{db_total} queries < 50ms")
        print(f"Memory Usage: {report['memory_usage']['current_memory_mb']:.1f} MB")
        
        overall_score = ((api_targets_met / api_total) + (db_targets_met / db_total)) / 2 * 100
        print(f"Overall Performance Score: {overall_score:.1f}%")
        
        if overall_score >= 80:
            print("🎉 PERFORMANCE: EXCELLENT - Ready for production")
        elif overall_score >= 60:
            print("✅ PERFORMANCE: GOOD - Some optimization recommended")
        elif overall_score >= 40:
            print("⚠️  PERFORMANCE: NEEDS IMPROVEMENT - Optimization required")
        else:
            print("❌ PERFORMANCE: POOR - Significant optimization needed")
            
    except Exception as e:
        print(f"Performance test failed: {e}")
        sys.exit(1)