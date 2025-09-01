"""
Advanced monitoring and health check system for production environments.

This module provides comprehensive monitoring capabilities including:
- Detailed health checks for all system components
- Performance metrics collection and analysis
- System resource monitoring
- Custom alert conditions
- Structured logging for monitoring systems
"""

import os
import sys
import time
import psutil
import logging
import asyncio
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass, asdict
from pathlib import Path
from collections import defaultdict, deque
from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from .database import engine
from .config import settings
from .cache import get_cache_stats

# Configure monitoring logger
monitoring_logger = logging.getLogger('monitoring')

@dataclass
class HealthCheckResult:
    """Individual health check result"""
    name: str
    status: str  # 'healthy', 'degraded', 'unhealthy'
    message: str
    details: Dict[str, Any]
    duration_ms: float
    timestamp: str
    critical: bool = False

@dataclass
class SystemMetrics:
    """System resource metrics"""
    cpu_percent: float
    memory_percent: float
    memory_available_mb: float
    disk_usage_percent: float
    disk_free_gb: float
    load_average: Tuple[float, float, float]
    process_count: int
    timestamp: str

@dataclass
class ApplicationMetrics:
    """Application-specific metrics"""
    active_sessions: int
    total_requests: int
    error_rate_percent: float
    avg_response_time_ms: float
    cache_hit_rate_percent: float
    database_connections: int
    uptime_seconds: int
    timestamp: str

class PerformanceTracker:
    """Tracks application performance metrics over time"""
    
    def __init__(self, max_history: int = 1000):
        self.max_history = max_history
        self.request_times = deque(maxlen=max_history)
        self.error_counts = defaultdict(int)
        self.total_requests = 0
        self.start_time = time.time()
        
    def record_request(self, duration_ms: float, status_code: int):
        """Record a request for performance tracking"""
        self.request_times.append(duration_ms)
        self.total_requests += 1
        if status_code >= 400:
            self.error_counts[status_code] += 1
            
    def get_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics"""
        if not self.request_times:
            return {
                'avg_response_time_ms': 0.0,
                'error_rate_percent': 0.0,
                'total_requests': self.total_requests,
                'uptime_seconds': int(time.time() - self.start_time)
            }
            
        avg_response = sum(self.request_times) / len(self.request_times)
        total_errors = sum(self.error_counts.values())
        error_rate = (total_errors / self.total_requests * 100) if self.total_requests > 0 else 0
        
        return {
            'avg_response_time_ms': round(avg_response, 2),
            'error_rate_percent': round(error_rate, 2),
            'total_requests': self.total_requests,
            'uptime_seconds': int(time.time() - self.start_time),
            'error_breakdown': dict(self.error_counts)
        }

# Global performance tracker
performance_tracker = PerformanceTracker()

class HealthChecker:
    """Comprehensive health checking system"""
    
    def __init__(self):
        self.health_checks = {
            'database': self._check_database,
            'disk_space': self._check_disk_space,
            'memory': self._check_memory,
            'cpu': self._check_cpu,
            'cache': self._check_cache,
            'file_permissions': self._check_file_permissions,
            'external_dependencies': self._check_external_dependencies
        }
        
    async def run_all_checks(self, include_non_critical: bool = True) -> Dict[str, Any]:
        """Run all health checks and return comprehensive status"""
        results = []
        overall_status = 'healthy'
        critical_issues = 0
        
        for check_name, check_func in self.health_checks.items():
            start_time = time.time()
            try:
                result = await check_func()
                duration_ms = (time.time() - start_time) * 1000
                
                health_result = HealthCheckResult(
                    name=check_name,
                    status=result['status'],
                    message=result['message'],
                    details=result.get('details', {}),
                    duration_ms=round(duration_ms, 2),
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    critical=result.get('critical', False)
                )
                
                results.append(health_result)
                
                # Update overall status
                if result['status'] == 'unhealthy':
                    if result.get('critical', False):
                        overall_status = 'unhealthy'
                        critical_issues += 1
                    elif overall_status == 'healthy':
                        overall_status = 'degraded'
                elif result['status'] == 'degraded' and overall_status == 'healthy':
                    overall_status = 'degraded'
                    
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                monitoring_logger.error(f"Health check '{check_name}' failed: {e}")
                
                error_result = HealthCheckResult(
                    name=check_name,
                    status='unhealthy',
                    message=f"Health check failed: {str(e)}",
                    details={'exception': str(e)},
                    duration_ms=round(duration_ms, 2),
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    critical=True
                )
                results.append(error_result)
                overall_status = 'unhealthy'
                critical_issues += 1
        
        # Filter results if requested
        if not include_non_critical:
            results = [r for r in results if r.critical or r.status != 'healthy']
        
        return {
            'status': overall_status,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'checks': [asdict(r) for r in results],
            'summary': {
                'total_checks': len(results),
                'healthy': len([r for r in results if r.status == 'healthy']),
                'degraded': len([r for r in results if r.status == 'degraded']),
                'unhealthy': len([r for r in results if r.status == 'unhealthy']),
                'critical_issues': critical_issues
            }
        }
    
    async def _check_database(self) -> Dict[str, Any]:
        """Check database connectivity and performance"""
        try:
            start_time = time.time()
            
            # Test basic connectivity
            async with engine.connect() as conn:
                result = await conn.execute(text("SELECT 1"))
                result.fetchone()
            
            query_time = (time.time() - start_time) * 1000
            
            # Check pool status
            pool_info = {}
            if hasattr(engine.pool, 'size'):
                pool_info = {
                    'size': engine.pool.size(),
                    'checked_in': engine.pool.checkedin(),
                    'checked_out': engine.pool.checkedout(),
                    'overflow': engine.pool.overflow(),
                    'invalid': engine.pool.invalid()
                }
            
            # Determine status based on query time and pool usage
            if query_time > 5000:  # 5 seconds
                status = 'unhealthy'
                message = f"Database query slow: {query_time:.2f}ms"
            elif query_time > 1000:  # 1 second
                status = 'degraded'
                message = f"Database query performance degraded: {query_time:.2f}ms"
            else:
                status = 'healthy'
                message = f"Database responsive: {query_time:.2f}ms"
            
            return {
                'status': status,
                'message': message,
                'details': {
                    'query_time_ms': round(query_time, 2),
                    'pool_info': pool_info,
                    'engine_url': str(engine.url).split('@')[0] + '@***'  # Hide credentials
                },
                'critical': True
            }
            
        except SQLAlchemyError as e:
            return {
                'status': 'unhealthy',
                'message': f"Database connectivity failed: {str(e)}",
                'details': {'error_type': type(e).__name__},
                'critical': True
            }
    
    async def _check_disk_space(self) -> Dict[str, Any]:
        """Check available disk space"""
        try:
            # Check application data directory
            data_path = Path('./data').resolve()
            if not data_path.exists():
                data_path = Path('.')
                
            disk_usage = psutil.disk_usage(str(data_path))
            free_gb = disk_usage.free / (1024**3)
            used_percent = (disk_usage.used / disk_usage.total) * 100
            
            # Status thresholds
            if free_gb < 1.0:  # Less than 1GB free
                status = 'unhealthy'
                message = f"Critical: Only {free_gb:.1f}GB disk space remaining"
                critical = True
            elif used_percent > 90:  # Over 90% used
                status = 'degraded'
                message = f"Warning: Disk {used_percent:.1f}% full ({free_gb:.1f}GB free)"
                critical = False
            else:
                status = 'healthy'
                message = f"Disk space OK: {free_gb:.1f}GB free ({used_percent:.1f}% used)"
                critical = False
            
            return {
                'status': status,
                'message': message,
                'details': {
                    'free_gb': round(free_gb, 2),
                    'used_percent': round(used_percent, 1),
                    'total_gb': round(disk_usage.total / (1024**3), 2),
                    'path': str(data_path)
                },
                'critical': critical
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f"Disk space check failed: {str(e)}",
                'details': {'error': str(e)},
                'critical': False
            }
    
    async def _check_memory(self) -> Dict[str, Any]:
        """Check memory usage"""
        try:
            memory = psutil.virtual_memory()
            process = psutil.Process()
            process_memory_mb = process.memory_info().rss / (1024**2)
            
            # Status thresholds
            if memory.percent > 95:
                status = 'unhealthy'
                message = f"Critical: Memory usage at {memory.percent:.1f}%"
                critical = True
            elif memory.percent > 85:
                status = 'degraded'
                message = f"Warning: High memory usage {memory.percent:.1f}%"
                critical = False
            else:
                status = 'healthy'
                message = f"Memory usage normal: {memory.percent:.1f}%"
                critical = False
            
            return {
                'status': status,
                'message': message,
                'details': {
                    'system_memory_percent': round(memory.percent, 1),
                    'system_available_mb': round(memory.available / (1024**2), 1),
                    'process_memory_mb': round(process_memory_mb, 1),
                    'total_memory_gb': round(memory.total / (1024**3), 2)
                },
                'critical': critical
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f"Memory check failed: {str(e)}",
                'details': {'error': str(e)},
                'critical': False
            }
    
    async def _check_cpu(self) -> Dict[str, Any]:
        """Check CPU usage"""
        try:
            # Get CPU usage over a short interval
            cpu_percent = psutil.cpu_percent(interval=1)
            load_avg = psutil.getloadavg() if hasattr(psutil, 'getloadavg') else (0, 0, 0)
            cpu_count = psutil.cpu_count()
            
            # Status thresholds
            if cpu_percent > 95:
                status = 'unhealthy'
                message = f"Critical: CPU usage at {cpu_percent:.1f}%"
                critical = True
            elif cpu_percent > 80:
                status = 'degraded'
                message = f"Warning: High CPU usage {cpu_percent:.1f}%"
                critical = False
            else:
                status = 'healthy'
                message = f"CPU usage normal: {cpu_percent:.1f}%"
                critical = False
            
            return {
                'status': status,
                'message': message,
                'details': {
                    'cpu_percent': round(cpu_percent, 1),
                    'load_average': [round(x, 2) for x in load_avg],
                    'cpu_count': cpu_count
                },
                'critical': critical
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f"CPU check failed: {str(e)}",
                'details': {'error': str(e)},
                'critical': False
            }
    
    async def _check_cache(self) -> Dict[str, Any]:
        """Check cache system health"""
        try:
            cache_stats = get_cache_stats()
            
            # Calculate hit rate
            total_operations = cache_stats.get('hits', 0) + cache_stats.get('misses', 0)
            hit_rate = (cache_stats.get('hits', 0) / total_operations * 100) if total_operations > 0 else 0
            
            # Status based on hit rate and errors
            errors = cache_stats.get('errors', 0)
            if errors > 10:
                status = 'degraded'
                message = f"Cache has {errors} errors, hit rate: {hit_rate:.1f}%"
            elif hit_rate < 50 and total_operations > 100:
                status = 'degraded'
                message = f"Low cache hit rate: {hit_rate:.1f}%"
            else:
                status = 'healthy'
                message = f"Cache healthy: {hit_rate:.1f}% hit rate"
            
            return {
                'status': status,
                'message': message,
                'details': {
                    'hit_rate_percent': round(hit_rate, 1),
                    'total_operations': total_operations,
                    **cache_stats
                },
                'critical': False
            }
            
        except Exception as e:
            return {
                'status': 'degraded',
                'message': f"Cache check failed: {str(e)}",
                'details': {'error': str(e)},
                'critical': False
            }
    
    async def _check_file_permissions(self) -> Dict[str, Any]:
        """Check critical file permissions"""
        try:
            critical_paths = [
                './data',
                './logs',
                './data/database.db'
            ]
            
            issues = []
            for path_str in critical_paths:
                path = Path(path_str)
                if path.exists():
                    if not os.access(path, os.R_OK):
                        issues.append(f"No read access to {path}")
                    if path.is_dir() and not os.access(path, os.W_OK):
                        issues.append(f"No write access to {path}")
                    elif path.is_file() and str(path).endswith('.db') and not os.access(path, os.W_OK):
                        issues.append(f"No write access to {path}")
            
            if issues:
                return {
                    'status': 'unhealthy',
                    'message': f"File permission issues: {'; '.join(issues)}",
                    'details': {'issues': issues},
                    'critical': True
                }
            else:
                return {
                    'status': 'healthy',
                    'message': "File permissions OK",
                    'details': {'checked_paths': critical_paths},
                    'critical': False
                }
                
        except Exception as e:
            return {
                'status': 'degraded',
                'message': f"File permission check failed: {str(e)}",
                'details': {'error': str(e)},
                'critical': False
            }
    
    async def _check_external_dependencies(self) -> Dict[str, Any]:
        """Check external dependencies if any"""
        try:
            # For now, this is a placeholder for future external dependencies
            # like Redis, external APIs, etc.
            
            return {
                'status': 'healthy',
                'message': "No external dependencies to check",
                'details': {'dependencies_checked': 0},
                'critical': False
            }
            
        except Exception as e:
            return {
                'status': 'degraded',
                'message': f"External dependency check failed: {str(e)}",
                'details': {'error': str(e)},
                'critical': False
            }

# Global health checker instance
health_checker = HealthChecker()

def get_system_metrics() -> SystemMetrics:
    """Get current system resource metrics"""
    try:
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('.')
        load_avg = psutil.getloadavg() if hasattr(psutil, 'getloadavg') else (0.0, 0.0, 0.0)
        
        return SystemMetrics(
            cpu_percent=psutil.cpu_percent(interval=0.1),
            memory_percent=memory.percent,
            memory_available_mb=memory.available / (1024**2),
            disk_usage_percent=(disk.used / disk.total) * 100,
            disk_free_gb=disk.free / (1024**3),
            load_average=load_avg,
            process_count=len(psutil.pids()),
            timestamp=datetime.now(timezone.utc).isoformat()
        )
    except Exception as e:
        monitoring_logger.error(f"Failed to collect system metrics: {e}")
        # Return default metrics in case of error
        return SystemMetrics(
            cpu_percent=0.0,
            memory_percent=0.0,
            memory_available_mb=0.0,
            disk_usage_percent=0.0,
            disk_free_gb=0.0,
            load_average=(0.0, 0.0, 0.0),
            process_count=0,
            timestamp=datetime.now(timezone.utc).isoformat()
        )

def get_application_metrics() -> ApplicationMetrics:
    """Get current application metrics"""
    try:
        perf_metrics = performance_tracker.get_metrics()
        cache_stats = get_cache_stats()
        
        # Calculate cache hit rate
        total_cache_ops = cache_stats.get('hits', 0) + cache_stats.get('misses', 0)
        cache_hit_rate = (cache_stats.get('hits', 0) / total_cache_ops * 100) if total_cache_ops > 0 else 0
        
        # Database connections (approximate)
        db_connections = 0
        if hasattr(engine.pool, 'checkedout'):
            db_connections = engine.pool.checkedout()
        
        return ApplicationMetrics(
            active_sessions=0,  # TODO: Implement session tracking
            total_requests=perf_metrics['total_requests'],
            error_rate_percent=perf_metrics['error_rate_percent'],
            avg_response_time_ms=perf_metrics['avg_response_time_ms'],
            cache_hit_rate_percent=cache_hit_rate,
            database_connections=db_connections,
            uptime_seconds=perf_metrics['uptime_seconds'],
            timestamp=datetime.now(timezone.utc).isoformat()
        )
    except Exception as e:
        monitoring_logger.error(f"Failed to collect application metrics: {e}")
        return ApplicationMetrics(
            active_sessions=0,
            total_requests=0,
            error_rate_percent=0.0,
            avg_response_time_ms=0.0,
            cache_hit_rate_percent=0.0,
            database_connections=0,
            uptime_seconds=0,
            timestamp=datetime.now(timezone.utc).isoformat()
        )

async def check_alert_conditions() -> List[Dict[str, Any]]:
    """Check for conditions that should trigger alerts"""
    alerts = []
    
    try:
        # Get current metrics
        system_metrics = get_system_metrics()
        app_metrics = get_application_metrics()
        health_status = await health_checker.run_all_checks(include_non_critical=False)
        
        # Check for critical conditions
        if system_metrics.memory_percent > 90:
            alerts.append({
                'severity': 'critical',
                'component': 'system',
                'message': f"Memory usage critical: {system_metrics.memory_percent:.1f}%",
                'metric_value': system_metrics.memory_percent,
                'threshold': 90,
                'timestamp': system_metrics.timestamp
            })
        
        if system_metrics.disk_free_gb < 1.0:
            alerts.append({
                'severity': 'critical',
                'component': 'system',
                'message': f"Disk space critical: {system_metrics.disk_free_gb:.1f}GB remaining",
                'metric_value': system_metrics.disk_free_gb,
                'threshold': 1.0,
                'timestamp': system_metrics.timestamp
            })
        
        if app_metrics.error_rate_percent > 10:
            alerts.append({
                'severity': 'warning',
                'component': 'application',
                'message': f"High error rate: {app_metrics.error_rate_percent:.1f}%",
                'metric_value': app_metrics.error_rate_percent,
                'threshold': 10,
                'timestamp': app_metrics.timestamp
            })
        
        if app_metrics.avg_response_time_ms > 5000:
            alerts.append({
                'severity': 'warning',
                'component': 'application',
                'message': f"Slow response time: {app_metrics.avg_response_time_ms:.1f}ms",
                'metric_value': app_metrics.avg_response_time_ms,
                'threshold': 5000,
                'timestamp': app_metrics.timestamp
            })
        
        # Check health status
        if health_status['status'] == 'unhealthy':
            alerts.append({
                'severity': 'critical',
                'component': 'health_check',
                'message': f"Health check failed: {health_status['summary']['critical_issues']} critical issues",
                'metric_value': health_status['summary']['critical_issues'],
                'threshold': 0,
                'timestamp': health_status['timestamp']
            })
        
    except Exception as e:
        monitoring_logger.error(f"Failed to check alert conditions: {e}")
        alerts.append({
            'severity': 'critical',
            'component': 'monitoring',
            'message': f"Monitoring system error: {str(e)}",
            'metric_value': None,
            'threshold': None,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
    
    return alerts