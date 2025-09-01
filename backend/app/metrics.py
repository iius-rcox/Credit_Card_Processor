"""
Prometheus metrics integration for production monitoring.

This module provides Prometheus-compatible metrics collection for:
- HTTP request metrics (rate, duration, error rate)
- System resource metrics integration
- Application-specific business metrics
- Custom gauge and counter metrics for monitoring
"""

import time
import psutil
from typing import Dict, Any
from prometheus_client import Counter, Histogram, Gauge, Info, generate_latest, CONTENT_TYPE_LATEST
from datetime import datetime, timezone

# HTTP Metrics
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code', 'username']
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

http_requests_in_progress = Gauge(
    'http_requests_in_progress',
    'Current HTTP requests being processed',
    ['method', 'endpoint']
)

# System Metrics
system_cpu_usage_percent = Gauge(
    'system_cpu_usage_percent',
    'Current CPU usage percentage'
)

system_memory_usage_percent = Gauge(
    'system_memory_usage_percent',
    'Current memory usage percentage'
)

system_disk_usage_percent = Gauge(
    'system_disk_usage_percent',
    'Current disk usage percentage'
)

system_disk_free_gb = Gauge(
    'system_disk_free_gb',
    'Available disk space in GB'
)

# Application Metrics
app_uptime_seconds = Gauge(
    'app_uptime_seconds',
    'Application uptime in seconds'
)

app_info = Info(
    'app_info',
    'Application information'
)

database_connections_active = Gauge(
    'database_connections_active',
    'Active database connections'
)

database_query_duration_seconds = Histogram(
    'database_query_duration_seconds',
    'Database query duration in seconds',
    ['query_type'],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

database_connection_errors_total = Counter(
    'database_connection_errors_total',
    'Total database connection errors'
)

# Cache Metrics
cache_operations_total = Counter(
    'cache_operations_total',
    'Total cache operations',
    ['operation', 'result']
)

cache_hit_ratio = Gauge(
    'cache_hit_ratio',
    'Cache hit ratio (0-1)'
)

# Security Metrics
auth_attempts_total = Counter(
    'auth_attempts_total',
    'Total authentication attempts',
    ['result', 'method']
)

auth_failures_total = Counter(
    'auth_failures_total',
    'Total authentication failures',
    ['reason']
)

security_events_total = Counter(
    'security_events_total',
    'Total security events',
    ['type', 'severity']
)

rate_limit_hits_total = Counter(
    'rate_limit_hits_total',
    'Total rate limit hits',
    ['endpoint']
)

# File Processing Metrics
file_uploads_total = Counter(
    'file_uploads_total',
    'Total file uploads',
    ['status', 'file_type']
)

file_upload_size_bytes = Histogram(
    'file_upload_size_bytes',
    'File upload size in bytes',
    buckets=[1024, 10240, 102400, 1048576, 10485760, 104857600]  # 1KB to 100MB
)

file_processing_duration_seconds = Histogram(
    'file_processing_duration_seconds',
    'File processing duration in seconds',
    ['processing_type'],
    buckets=[1.0, 5.0, 10.0, 30.0, 60.0, 300.0, 600.0]  # 1s to 10min
)

processing_queue_size = Gauge(
    'processing_queue_size',
    'Current processing queue size'
)

file_upload_failures_total = Counter(
    'file_upload_failures_total',
    'Total file upload failures',
    ['error_type']
)

# SSL Certificate Metrics
ssl_certificate_expiry_timestamp = Gauge(
    'ssl_certificate_expiry_timestamp',
    'SSL certificate expiry time as unix timestamp'
)

# Application startup time for uptime calculation
app_start_time = time.time()

# Set application info
app_info.info({
    'version': '1.0.0',
    'python_version': '3.11',
    'service': 'credit-card-processor'
})

class MetricsCollector:
    """Collects and updates metrics for Prometheus"""
    
    def __init__(self):
        self.start_time = time.time()
        
    def update_system_metrics(self):
        """Update system resource metrics"""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=0.1)
            system_cpu_usage_percent.set(cpu_percent)
            
            # Memory usage
            memory = psutil.virtual_memory()
            system_memory_usage_percent.set(memory.percent)
            
            # Disk usage
            disk = psutil.disk_usage('.')
            disk_usage_percent = (disk.used / disk.total) * 100
            disk_free_gb = disk.free / (1024**3)
            
            system_disk_usage_percent.set(disk_usage_percent)
            system_disk_free_gb.set(disk_free_gb)
            
            # Application uptime
            uptime = time.time() - app_start_time
            app_uptime_seconds.set(uptime)
            
        except Exception as e:
            # Don't let metrics collection break the application
            pass
    
    def update_database_metrics(self, engine):
        """Update database-related metrics"""
        try:
            if hasattr(engine.pool, 'checkedout'):
                active_connections = engine.pool.checkedout()
                database_connections_active.set(active_connections)
        except Exception:
            pass
    
    def update_cache_metrics(self, cache_stats: Dict[str, Any]):
        """Update cache-related metrics"""
        try:
            hits = cache_stats.get('hits', 0)
            misses = cache_stats.get('misses', 0)
            total_ops = hits + misses
            
            if total_ops > 0:
                hit_ratio = hits / total_ops
                cache_hit_ratio.set(hit_ratio)
                
            # Update operation counters
            cache_operations_total.labels(operation='hit', result='success')._value._value = hits
            cache_operations_total.labels(operation='miss', result='success')._value._value = misses
            
        except Exception:
            pass
    
    def record_http_request(self, method: str, endpoint: str, status_code: int, 
                           duration: float, username: str = 'anonymous'):
        """Record HTTP request metrics"""
        try:
            http_requests_total.labels(
                method=method,
                endpoint=endpoint,
                status_code=str(status_code),
                username=username
            ).inc()
            
            http_request_duration_seconds.labels(
                method=method,
                endpoint=endpoint
            ).observe(duration)
            
        except Exception:
            pass
    
    def record_auth_attempt(self, success: bool, method: str, failure_reason: str = None):
        """Record authentication attempt metrics"""
        try:
            result = 'success' if success else 'failure'
            auth_attempts_total.labels(result=result, method=method).inc()
            
            if not success and failure_reason:
                auth_failures_total.labels(reason=failure_reason).inc()
                
        except Exception:
            pass
    
    def record_security_event(self, event_type: str, severity: str = 'info'):
        """Record security event metrics"""
        try:
            security_events_total.labels(type=event_type, severity=severity).inc()
        except Exception:
            pass
    
    def record_file_upload(self, success: bool, file_size: int, file_type: str = 'unknown'):
        """Record file upload metrics"""
        try:
            status = 'success' if success else 'failure'
            file_uploads_total.labels(status=status, file_type=file_type).inc()
            
            if success:
                file_upload_size_bytes.observe(file_size)
            
        except Exception:
            pass
    
    def record_file_processing(self, duration: float, processing_type: str = 'general'):
        """Record file processing metrics"""
        try:
            file_processing_duration_seconds.labels(
                processing_type=processing_type
            ).observe(duration)
        except Exception:
            pass
    
    def record_rate_limit_hit(self, endpoint: str):
        """Record rate limit hit"""
        try:
            rate_limit_hits_total.labels(endpoint=endpoint).inc()
        except Exception:
            pass

# Global metrics collector instance
metrics_collector = MetricsCollector()

def get_prometheus_metrics() -> str:
    """
    Get Prometheus-formatted metrics
    
    Returns:
        str: Prometheus metrics in text format
    """
    try:
        # Update system metrics before generating output
        metrics_collector.update_system_metrics()
        
        # Generate and return metrics
        return generate_latest()
    except Exception:
        # Return empty metrics if collection fails
        return ""

def get_metrics_content_type() -> str:
    """
    Get the content type for Prometheus metrics
    
    Returns:
        str: Content type header value
    """
    return CONTENT_TYPE_LATEST