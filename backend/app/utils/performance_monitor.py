"""
Performance monitoring utilities for export operations
Tracks metrics, monitors resource usage, and provides alerting
"""

import asyncio
import logging
import psutil
import time
from contextlib import contextmanager
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetric:
    """Single performance metric record"""
    operation_type: str
    duration_seconds: float
    memory_usage_mb: float
    cpu_usage_percent: float
    record_count: int
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)


class ExportPerformanceMonitor:
    """Monitor export performance metrics and system resources"""
    
    def __init__(self, max_metrics: int = 1000):
        self.metrics: List[PerformanceMetric] = []
        self.max_metrics = max_metrics
        self.alert_thresholds = {
            'duration_seconds': 30.0,
            'memory_usage_mb': 1000.0,
            'cpu_usage_percent': 80.0
        }
        self.performance_alerts = []
    
    @contextmanager
    def monitor_export(self, export_type: str, employee_count: int, metadata: Dict[str, Any] = None):
        """Monitor a single export operation"""
        start_time = time.time()
        process = psutil.Process()
        
        # Capture initial resource usage
        start_memory = process.memory_info().rss / 1024 / 1024  # MB
        start_cpu = process.cpu_percent()
        
        try:
            yield
            
        finally:
            # Calculate final metrics
            duration = time.time() - start_time
            end_memory = process.memory_info().rss / 1024 / 1024  # MB
            memory_delta = end_memory - start_memory
            cpu_usage = process.cpu_percent()
            
            # Create metric record
            metric = PerformanceMetric(
                operation_type=export_type,
                duration_seconds=duration,
                memory_usage_mb=memory_delta,
                cpu_usage_percent=cpu_usage,
                record_count=employee_count,
                timestamp=datetime.now(timezone.utc),
                metadata=metadata or {}
            )
            
            # Store metric
            self.add_metric(metric)
            
            # Check for performance issues
            self._check_performance_alerts(metric)
            
            # Log performance info
            logger.info(
                f"Export performance: {export_type} - "
                f"{duration:.2f}s, {employee_count} records, "
                f"{memory_delta:.1f}MB memory, {cpu_usage:.1f}% CPU"
            )
    
    def add_metric(self, metric: PerformanceMetric):
        """Add a performance metric"""
        self.metrics.append(metric)
        
        # Maintain maximum metrics limit
        if len(self.metrics) > self.max_metrics:
            self.metrics = self.metrics[-self.max_metrics:]
    
    def _check_performance_alerts(self, metric: PerformanceMetric):
        """Check if metric exceeds alert thresholds"""
        alerts = []
        
        if metric.duration_seconds > self.alert_thresholds['duration_seconds']:
            alerts.append(f"Slow export: {metric.duration_seconds:.1f}s")
        
        if metric.memory_usage_mb > self.alert_thresholds['memory_usage_mb']:
            alerts.append(f"High memory usage: {metric.memory_usage_mb:.1f}MB")
        
        if metric.cpu_usage_percent > self.alert_thresholds['cpu_usage_percent']:
            alerts.append(f"High CPU usage: {metric.cpu_usage_percent:.1f}%")
        
        if alerts:
            alert_record = {
                'timestamp': metric.timestamp,
                'operation_type': metric.operation_type,
                'record_count': metric.record_count,
                'alerts': alerts,
                'metric': metric
            }
            self.performance_alerts.append(alert_record)
            
            # Log alert
            logger.warning(f"Performance alert for {metric.operation_type}: {', '.join(alerts)}")
    
    def get_performance_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get performance summary for specified time period"""
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        recent_metrics = [m for m in self.metrics if m.timestamp >= cutoff_time]
        
        if not recent_metrics:
            return {
                'period_hours': hours,
                'total_operations': 0,
                'summary': {}
            }
        
        # Calculate statistics
        durations = [m.duration_seconds for m in recent_metrics]
        memory_usage = [m.memory_usage_mb for m in recent_metrics]
        cpu_usage = [m.cpu_usage_percent for m in recent_metrics]
        record_counts = [m.record_count for m in recent_metrics]
        
        # Group by operation type
        operation_stats = {}
        for metric in recent_metrics:
            op_type = metric.operation_type
            if op_type not in operation_stats:
                operation_stats[op_type] = {
                    'count': 0,
                    'total_records': 0,
                    'total_duration': 0,
                    'max_duration': 0,
                    'max_memory': 0
                }
            
            stats = operation_stats[op_type]
            stats['count'] += 1
            stats['total_records'] += metric.record_count
            stats['total_duration'] += metric.duration_seconds
            stats['max_duration'] = max(stats['max_duration'], metric.duration_seconds)
            stats['max_memory'] = max(stats['max_memory'], metric.memory_usage_mb)
        
        # Calculate averages
        for stats in operation_stats.values():
            if stats['count'] > 0:
                stats['avg_duration'] = stats['total_duration'] / stats['count']
                stats['avg_records_per_operation'] = stats['total_records'] / stats['count']
        
        return {
            'period_hours': hours,
            'total_operations': len(recent_metrics),
            'overall_stats': {
                'avg_duration': sum(durations) / len(durations),
                'max_duration': max(durations),
                'min_duration': min(durations),
                'avg_memory_usage': sum(memory_usage) / len(memory_usage),
                'max_memory_usage': max(memory_usage),
                'avg_cpu_usage': sum(cpu_usage) / len(cpu_usage),
                'max_cpu_usage': max(cpu_usage),
                'total_records_processed': sum(record_counts)
            },
            'operation_stats': operation_stats,
            'recent_alerts': len([a for a in self.performance_alerts 
                                if a['timestamp'] >= cutoff_time])
        }
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get system health status based on recent performance"""
        summary = self.get_performance_summary(hours=1)  # Last hour
        
        if summary['total_operations'] == 0:
            return {'status': 'unknown', 'reason': 'no recent operations'}
        
        stats = summary['overall_stats']
        alerts = summary['recent_alerts']
        
        # Determine health status
        if alerts > 5:
            status = 'unhealthy'
            reason = f'{alerts} performance alerts in last hour'
        elif stats['avg_duration'] > 15:
            status = 'degraded'
            reason = f'slow average performance: {stats["avg_duration"]:.1f}s'
        elif stats['max_memory_usage'] > 500:
            status = 'degraded'
            reason = f'high memory usage: {stats["max_memory_usage"]:.1f}MB'
        else:
            status = 'healthy'
            reason = 'all metrics within normal ranges'
        
        return {
            'status': status,
            'reason': reason,
            'metrics': {
                'operations_last_hour': summary['total_operations'],
                'avg_duration': stats['avg_duration'],
                'max_memory': stats['max_memory_usage'],
                'recent_alerts': alerts
            }
        }
    
    def set_alert_thresholds(self, **thresholds):
        """Update alert thresholds"""
        for key, value in thresholds.items():
            if key in self.alert_thresholds:
                self.alert_thresholds[key] = value
                logger.info(f"Updated alert threshold {key} to {value}")
    
    def clear_metrics(self, keep_hours: int = 0):
        """Clear old metrics, optionally keeping recent ones"""
        if keep_hours > 0:
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=keep_hours)
            self.metrics = [m for m in self.metrics if m.timestamp >= cutoff_time]
            self.performance_alerts = [a for a in self.performance_alerts 
                                     if a['timestamp'] >= cutoff_time]
        else:
            self.metrics.clear()
            self.performance_alerts.clear()
        
        logger.info(f"Cleared performance metrics, kept {len(self.metrics)} recent records")


class ExportMetrics:
    """Collect and expose export-specific metrics"""
    
    def __init__(self):
        self.export_counts = {
            'total_exports': 0,
            'delta_exports': 0,
            'full_exports': 0,
            'failed_exports': 0,
            'pvault_exports': 0,
            'exception_exports': 0
        }
        self.export_history = []
        self.largest_export_size = 0
        self.total_duration = 0.0
    
    def record_export(self, 
                     export_type: str, 
                     export_format: str,
                     employee_count: int, 
                     duration: float, 
                     success: bool,
                     session_id: str = None):
        """Record export metrics"""
        
        # Update counters
        self.export_counts['total_exports'] += 1
        
        if success:
            if export_type == 'delta':
                self.export_counts['delta_exports'] += 1
            else:
                self.export_counts['full_exports'] += 1
            
            if export_format == 'pvault':
                self.export_counts['pvault_exports'] += 1
            elif export_format == 'exceptions':
                self.export_counts['exception_exports'] += 1
            
            # Update statistics
            self.largest_export_size = max(self.largest_export_size, employee_count)
            self.total_duration += duration
            
        else:
            self.export_counts['failed_exports'] += 1
        
        # Record in history
        export_record = {
            'timestamp': datetime.now(timezone.utc),
            'export_type': export_type,
            'export_format': export_format,
            'employee_count': employee_count,
            'duration': duration,
            'success': success,
            'session_id': session_id
        }
        
        self.export_history.append(export_record)
        
        # Keep only recent history (last 1000 exports)
        if len(self.export_history) > 1000:
            self.export_history = self.export_history[-1000:]
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get complete metrics summary"""
        successful_exports = (self.export_counts['total_exports'] - 
                            self.export_counts['failed_exports'])
        
        avg_duration = (self.total_duration / successful_exports 
                       if successful_exports > 0 else 0)
        
        failure_rate = (self.export_counts['failed_exports'] / 
                       max(self.export_counts['total_exports'], 1))
        
        return {
            'counts': self.export_counts.copy(),
            'statistics': {
                'success_rate': 1 - failure_rate,
                'failure_rate': failure_rate,
                'avg_duration_seconds': avg_duration,
                'largest_export_size': self.largest_export_size,
                'total_successful_exports': successful_exports
            },
            'recent_exports': self.export_history[-10:] if self.export_history else []
        }
    
    def get_health_status(self) -> Dict[str, str]:
        """Get export system health based on metrics"""
        if self.export_counts['total_exports'] == 0:
            return {'status': 'unknown', 'reason': 'no exports recorded'}
        
        failure_rate = (self.export_counts['failed_exports'] / 
                       self.export_counts['total_exports'])
        
        successful_exports = (self.export_counts['total_exports'] - 
                            self.export_counts['failed_exports'])
        avg_duration = (self.total_duration / successful_exports 
                       if successful_exports > 0 else 0)
        
        if failure_rate > 0.15:
            return {
                'status': 'unhealthy', 
                'reason': f'high failure rate: {failure_rate:.1%}'
            }
        elif failure_rate > 0.05:
            return {
                'status': 'degraded',
                'reason': f'elevated failure rate: {failure_rate:.1%}'
            }
        elif avg_duration > 30:
            return {
                'status': 'degraded',
                'reason': f'slow performance: {avg_duration:.1f}s average'
            }
        else:
            return {
                'status': 'healthy',
                'reason': 'all metrics within normal ranges'
            }


# Global instances
performance_monitor = ExportPerformanceMonitor()
export_metrics = ExportMetrics()


async def check_performance_alerts():
    """Check for performance issues and send alerts if needed"""
    health = performance_monitor.get_health_status()
    export_health = export_metrics.get_health_status()
    
    # Log health status
    logger.info(f"Performance health: {health['status']} - {health['reason']}")
    logger.info(f"Export health: {export_health['status']} - {export_health['reason']}")
    
    # Send alerts for unhealthy status
    if health['status'] == 'unhealthy':
        await send_performance_alert('CRITICAL', 'Performance system unhealthy', health)
    elif health['status'] == 'degraded':
        await send_performance_alert('WARNING', 'Performance degraded', health)
    
    if export_health['status'] == 'unhealthy':
        await send_performance_alert('CRITICAL', 'Export system unhealthy', export_health)


async def send_performance_alert(level: str, message: str, details: Dict[str, Any]):
    """Send performance alert (implement based on your alerting system)"""
    alert_data = {
        'level': level,
        'message': message,
        'details': details,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'service': 'export-system'
    }
    
    # Log the alert
    logger.warning(f"Performance alert [{level}]: {message}", extra=alert_data)
    
    # TODO: Implement actual alerting (email, Slack, etc.)
    # For now, just log the alert
    pass