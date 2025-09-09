"""
Minimal metrics module for Credit Card Processor.
Provides basic metrics functionality without complex monitoring setup.
"""

from typing import Dict, Any
from datetime import datetime, timezone


class MetricsCollector:
    """
    Minimal metrics collector that provides basic functionality.
    """
    
    def __init__(self):
        self.enabled = False
        
    def increment(self, name: str, value: int = 1, tags: Dict[str, str] = None):
        """Increment a counter metric (no-op)."""
        pass
        
    def histogram(self, name: str, value: float, tags: Dict[str, str] = None):
        """Record a histogram metric (no-op).""" 
        pass
        
    def gauge(self, name: str, value: float, tags: Dict[str, str] = None):
        """Set a gauge metric (no-op)."""
        pass
        
    def record_http_request(self, method: str = None, endpoint: str = None, path: str = None, status_code: int = None, duration: float = None, **kwargs):
        """Record HTTP request metric (no-op)."""
        pass


# Global metrics collector instance
metrics_collector = MetricsCollector()


def get_prometheus_metrics() -> str:
    """
    Get metrics in Prometheus format.
    
    Returns:
        Empty metrics string for minimal implementation.
    """
    return """# TYPE app_info gauge
app_info{version="dev",name="credit_card_processor"} 1
# TYPE app_uptime_seconds gauge
app_uptime_seconds 0
"""


def get_metrics_content_type() -> str:
    """
    Get the content type for metrics responses.
    
    Returns:
        Content type string for Prometheus metrics.
    """
    return "text/plain; version=0.0.4; charset=utf-8"


def record_request_metrics(method: str, path: str, status_code: int, duration: float):
    """
    Record HTTP request metrics.
    
    Args:
        method: HTTP method
        path: Request path
        status_code: Response status code
        duration: Request duration in seconds
    """
    # No-op for minimal implementation
    pass


def record_database_metrics(operation: str, duration: float, success: bool = True):
    """
    Record database operation metrics.
    
    Args:
        operation: Database operation name
        duration: Operation duration in seconds
        success: Whether operation was successful
    """
    # No-op for minimal implementation
    pass


# Export main functions
__all__ = [
    'metrics_collector',
    'get_prometheus_metrics',
    'get_metrics_content_type',
    'record_request_metrics',
    'record_database_metrics'
]