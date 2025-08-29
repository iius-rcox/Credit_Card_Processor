"""
Credit Card Processor - Monitoring & Observability Strategy
Comprehensive monitoring with Prometheus, Grafana, and Azure Monitor integration
"""

import asyncio
import json
import logging
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Callable
from uuid import UUID

from prometheus_client import (
    Counter, Histogram, Gauge, Summary, Info,
    CollectorRegistry, generate_latest, CONTENT_TYPE_LATEST
)
from opentelemetry import trace, metrics
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.celery import CeleryInstrumentor
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from azure.monitor.opentelemetry.exporter import (
    AzureMonitorTraceExporter,
    AzureMonitorMetricExporter,
    AzureMonitorLogExporter
)
import structlog
from fastapi import FastAPI, Request, Response
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
import aiohttp
from redis import asyncio as aioredis


# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


# ========================================
# 1. METRICS CONFIGURATION
# ========================================

@dataclass
class MetricsConfig:
    """Configuration for metrics collection"""
    enable_prometheus: bool = True
    enable_azure_monitor: bool = True
    enable_opentelemetry: bool = True
    
    # Azure Monitor
    azure_monitor_connection_string: str = ""
    
    # OpenTelemetry
    otlp_endpoint: str = "http://localhost:4317"
    service_name: str = "credit-card-processor"
    service_version: str = "1.0.0"
    environment: str = "production"
    
    # Prometheus
    metrics_port: int = 9090
    metrics_path: str = "/metrics"
    
    # Collection intervals
    metric_export_interval_seconds: int = 60
    trace_export_interval_seconds: int = 30


# ========================================
# 2. PROMETHEUS METRICS
# ========================================

class PrometheusMetrics:
    """Prometheus metrics definitions"""
    
    def __init__(self, registry: Optional[CollectorRegistry] = None):
        self.registry = registry or CollectorRegistry()
        self._initialize_metrics()
    
    def _initialize_metrics(self):
        """Initialize all Prometheus metrics"""
        
        # Request metrics
        self.request_count = Counter(
            'http_requests_total',
            'Total HTTP requests',
            ['method', 'endpoint', 'status'],
            registry=self.registry
        )
        
        self.request_duration = Histogram(
            'http_request_duration_seconds',
            'HTTP request duration in seconds',
            ['method', 'endpoint'],
            buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10),
            registry=self.registry
        )
        
        self.request_size = Summary(
            'http_request_size_bytes',
            'HTTP request size in bytes',
            ['method', 'endpoint'],
            registry=self.registry
        )
        
        self.response_size = Summary(
            'http_response_size_bytes',
            'HTTP response size in bytes',
            ['method', 'endpoint'],
            registry=self.registry
        )
        
        # Processing metrics
        self.processing_sessions_active = Gauge(
            'processing_sessions_active',
            'Number of active processing sessions',
            registry=self.registry
        )
        
        self.pdf_processing_duration = Histogram(
            'pdf_processing_duration_seconds',
            'PDF processing duration in seconds',
            ['document_type', 'status'],
            buckets=(1, 5, 10, 30, 60, 120, 300, 600),
            registry=self.registry
        )
        
        self.pdf_pages_processed = Counter(
            'pdf_pages_processed_total',
            'Total number of PDF pages processed',
            ['document_type'],
            registry=self.registry
        )
        
        self.document_intelligence_requests = Counter(
            'document_intelligence_requests_total',
            'Total Azure Document Intelligence API requests',
            ['operation', 'status'],
            registry=self.registry
        )
        
        self.document_intelligence_latency = Histogram(
            'document_intelligence_latency_seconds',
            'Azure Document Intelligence API latency',
            ['operation'],
            buckets=(0.1, 0.5, 1, 2, 5, 10, 30),
            registry=self.registry
        )
        
        # Database metrics
        self.database_connections_active = Gauge(
            'database_connections_active',
            'Number of active database connections',
            registry=self.registry
        )
        
        self.database_query_duration = Histogram(
            'database_query_duration_seconds',
            'Database query duration in seconds',
            ['operation', 'table'],
            buckets=(0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5),
            registry=self.registry
        )
        
        self.database_transactions = Counter(
            'database_transactions_total',
            'Total database transactions',
            ['status'],
            registry=self.registry
        )
        
        # Celery metrics
        self.celery_tasks_total = Counter(
            'celery_tasks_total',
            'Total Celery tasks',
            ['task_name', 'status'],
            registry=self.registry
        )
        
        self.celery_task_duration = Histogram(
            'celery_task_duration_seconds',
            'Celery task duration in seconds',
            ['task_name'],
            buckets=(1, 5, 10, 30, 60, 300, 600, 1800),
            registry=self.registry
        )
        
        self.celery_queue_length = Gauge(
            'celery_queue_length',
            'Number of tasks in Celery queue',
            ['queue_name'],
            registry=self.registry
        )
        
        # Business metrics
        self.validation_issues = Counter(
            'validation_issues_total',
            'Total validation issues found',
            ['issue_type', 'severity'],
            registry=self.registry
        )
        
        self.issues_resolved = Counter(
            'issues_resolved_total',
            'Total issues resolved',
            ['issue_type', 'resolution_method'],
            registry=self.registry
        )
        
        self.employees_processed = Counter(
            'employees_processed_total',
            'Total employees processed',
            ['status'],
            registry=self.registry
        )
        
        self.total_amount_processed = Counter(
            'total_amount_processed',
            'Total dollar amount processed',
            registry=self.registry
        )
        
        # System metrics
        self.memory_usage = Gauge(
            'memory_usage_bytes',
            'Memory usage in bytes',
            ['type'],
            registry=self.registry
        )
        
        self.cpu_usage_percent = Gauge(
            'cpu_usage_percent',
            'CPU usage percentage',
            registry=self.registry
        )
        
        self.disk_usage_bytes = Gauge(
            'disk_usage_bytes',
            'Disk usage in bytes',
            ['mount_point'],
            registry=self.registry
        )
        
        # Error metrics
        self.errors_total = Counter(
            'errors_total',
            'Total errors',
            ['error_type', 'component'],
            registry=self.registry
        )
        
        self.error_rate = Gauge(
            'error_rate_per_minute',
            'Error rate per minute',
            registry=self.registry
        )
        
        # Cache metrics
        self.cache_hits = Counter(
            'cache_hits_total',
            'Total cache hits',
            ['cache_type'],
            registry=self.registry
        )
        
        self.cache_misses = Counter(
            'cache_misses_total',
            'Total cache misses',
            ['cache_type'],
            registry=self.registry
        )
        
        self.cache_evictions = Counter(
            'cache_evictions_total',
            'Total cache evictions',
            ['cache_type', 'reason'],
            registry=self.registry
        )


# ========================================
# 3. OPENTELEMETRY SETUP
# ========================================

class OpenTelemetrySetup:
    """Configure OpenTelemetry for distributed tracing"""
    
    def __init__(self, config: MetricsConfig):
        self.config = config
        self.tracer_provider = None
        self.meter_provider = None
    
    def initialize(self):
        """Initialize OpenTelemetry providers"""
        
        # Create resource
        resource = Resource.create({
            "service.name": self.config.service_name,
            "service.version": self.config.service_version,
            "deployment.environment": self.config.environment,
        })
        
        # Setup tracing
        self._setup_tracing(resource)
        
        # Setup metrics
        self._setup_metrics(resource)
        
        # Instrument libraries
        self._instrument_libraries()
    
    def _setup_tracing(self, resource: Resource):
        """Setup distributed tracing"""
        
        # Create tracer provider
        self.tracer_provider = TracerProvider(resource=resource)
        
        # Add Azure Monitor exporter
        if self.config.enable_azure_monitor:
            azure_exporter = AzureMonitorTraceExporter(
                connection_string=self.config.azure_monitor_connection_string
            )
            self.tracer_provider.add_span_processor(
                BatchSpanProcessor(azure_exporter)
            )
        
        # Add OTLP exporter
        if self.config.enable_opentelemetry:
            otlp_exporter = OTLPSpanExporter(
                endpoint=self.config.otlp_endpoint,
                insecure=True
            )
            self.tracer_provider.add_span_processor(
                BatchSpanProcessor(otlp_exporter)
            )
        
        # Set global tracer provider
        trace.set_tracer_provider(self.tracer_provider)
    
    def _setup_metrics(self, resource: Resource):
        """Setup metrics collection"""
        
        readers = []
        
        # Add Azure Monitor metric exporter
        if self.config.enable_azure_monitor:
            azure_reader = PeriodicExportingMetricReader(
                AzureMonitorMetricExporter(
                    connection_string=self.config.azure_monitor_connection_string
                ),
                export_interval_millis=self.config.metric_export_interval_seconds * 1000
            )
            readers.append(azure_reader)
        
        # Add OTLP metric exporter
        if self.config.enable_opentelemetry:
            otlp_reader = PeriodicExportingMetricReader(
                OTLPMetricExporter(
                    endpoint=self.config.otlp_endpoint,
                    insecure=True
                ),
                export_interval_millis=self.config.metric_export_interval_seconds * 1000
            )
            readers.append(otlp_reader)
        
        # Create meter provider
        self.meter_provider = MeterProvider(
            resource=resource,
            metric_readers=readers
        )
        
        # Set global meter provider
        metrics.set_meter_provider(self.meter_provider)
    
    def _instrument_libraries(self):
        """Auto-instrument common libraries"""
        
        # Instrument FastAPI
        FastAPIInstrumentor.instrument()
        
        # Instrument SQLAlchemy
        SQLAlchemyInstrumentor().instrument()
        
        # Instrument Redis
        RedisInstrumentor().instrument()
        
        # Instrument Celery
        CeleryInstrumentor().instrument()


# ========================================
# 4. CUSTOM METRICS COLLECTOR
# ========================================

class MetricsCollector:
    """Collect and export custom metrics"""
    
    def __init__(
        self,
        prometheus_metrics: PrometheusMetrics,
        config: MetricsConfig
    ):
        self.prometheus = prometheus_metrics
        self.config = config
        self.tracer = trace.get_tracer(__name__)
        self.meter = metrics.get_meter(__name__)
        self._setup_custom_metrics()
    
    def _setup_custom_metrics(self):
        """Setup custom OpenTelemetry metrics"""
        
        # Create custom metrics
        self.processing_counter = self.meter.create_counter(
            "processing_sessions",
            description="Number of processing sessions",
            unit="1"
        )
        
        self.processing_histogram = self.meter.create_histogram(
            "processing_duration",
            description="Processing duration",
            unit="s"
        )
        
        self.error_counter = self.meter.create_counter(
            "application_errors",
            description="Application errors",
            unit="1"
        )
    
    @asynccontextmanager
    async def track_request(self, method: str, endpoint: str):
        """Track HTTP request metrics"""
        start_time = time.time()
        
        with self.tracer.start_as_current_span(f"{method} {endpoint}") as span:
            span.set_attribute("http.method", method)
            span.set_attribute("http.route", endpoint)
            
            try:
                yield span
                status = "success"
            except Exception as e:
                status = "error"
                span.record_exception(e)
                span.set_status(trace.Status(trace.StatusCode.ERROR))
                raise
            finally:
                duration = time.time() - start_time
                
                # Update Prometheus metrics
                self.prometheus.request_count.labels(
                    method=method,
                    endpoint=endpoint,
                    status=status
                ).inc()
                
                self.prometheus.request_duration.labels(
                    method=method,
                    endpoint=endpoint
                ).observe(duration)
    
    async def track_pdf_processing(
        self,
        document_type: str,
        pages: int,
        duration: float,
        status: str
    ):
        """Track PDF processing metrics"""
        
        # Prometheus metrics
        self.prometheus.pdf_processing_duration.labels(
            document_type=document_type,
            status=status
        ).observe(duration)
        
        self.prometheus.pdf_pages_processed.labels(
            document_type=document_type
        ).inc(pages)
        
        # OpenTelemetry metrics
        self.processing_histogram.record(
            duration,
            {"document_type": document_type, "status": status}
        )
    
    async def track_database_query(
        self,
        operation: str,
        table: str,
        duration: float
    ):
        """Track database query metrics"""
        
        self.prometheus.database_query_duration.labels(
            operation=operation,
            table=table
        ).observe(duration)
    
    async def track_validation_issue(
        self,
        issue_type: str,
        severity: str
    ):
        """Track validation issues"""
        
        self.prometheus.validation_issues.labels(
            issue_type=issue_type,
            severity=severity
        ).inc()
        
        # Log structured event
        await logger.info(
            "validation_issue_found",
            issue_type=issue_type,
            severity=severity
        )
    
    async def track_error(
        self,
        error_type: str,
        component: str,
        error_message: str
    ):
        """Track application errors"""
        
        self.prometheus.errors_total.labels(
            error_type=error_type,
            component=component
        ).inc()
        
        self.error_counter.add(
            1,
            {"error_type": error_type, "component": component}
        )
        
        # Log structured error
        await logger.error(
            "application_error",
            error_type=error_type,
            component=component,
            error_message=error_message
        )


# ========================================
# 5. HEALTH CHECKS
# ========================================

class HealthCheckService:
    """Comprehensive health check service"""
    
    def __init__(
        self,
        db_session: AsyncSession,
        redis_client: aioredis.Redis,
        config: MetricsConfig
    ):
        self.db_session = db_session
        self.redis = redis_client
        self.config = config
        self.checks = {}
        self._register_checks()
    
    def _register_checks(self):
        """Register health check functions"""
        self.checks = {
            "database": self._check_database,
            "redis": self._check_redis,
            "blob_storage": self._check_blob_storage,
            "document_intelligence": self._check_document_intelligence,
            "celery": self._check_celery
        }
    
    async def _check_database(self) -> Dict[str, Any]:
        """Check database connectivity"""
        try:
            start = time.time()
            result = await self.db_session.execute("SELECT 1")
            latency = (time.time() - start) * 1000
            
            return {
                "status": "healthy",
                "latency_ms": latency,
                "details": "Database connection successful"
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "details": "Database connection failed"
            }
    
    async def _check_redis(self) -> Dict[str, Any]:
        """Check Redis connectivity"""
        try:
            start = time.time()
            await self.redis.ping()
            latency = (time.time() - start) * 1000
            
            info = await self.redis.info()
            
            return {
                "status": "healthy",
                "latency_ms": latency,
                "connected_clients": info.get("connected_clients", 0),
                "used_memory": info.get("used_memory_human", "unknown")
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "details": "Redis connection failed"
            }
    
    async def _check_blob_storage(self) -> Dict[str, Any]:
        """Check Azure Blob Storage connectivity"""
        try:
            # Implementation would check blob storage
            return {
                "status": "healthy",
                "details": "Blob storage accessible"
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }
    
    async def _check_document_intelligence(self) -> Dict[str, Any]:
        """Check Azure Document Intelligence service"""
        try:
            # Implementation would check Document Intelligence
            return {
                "status": "healthy",
                "details": "Document Intelligence service available"
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }
    
    async def _check_celery(self) -> Dict[str, Any]:
        """Check Celery workers"""
        try:
            # Implementation would check Celery workers
            return {
                "status": "healthy",
                "active_workers": 3,
                "queue_length": 0
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }
    
    async def get_health_status(self) -> Dict[str, Any]:
        """Get overall health status"""
        results = {}
        overall_status = "healthy"
        
        for check_name, check_func in self.checks.items():
            result = await check_func()
            results[check_name] = result
            
            if result["status"] == "unhealthy":
                overall_status = "unhealthy"
        
        return {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "checks": results
        }
    
    async def get_readiness_status(self) -> Dict[str, Any]:
        """Check if service is ready to handle requests"""
        critical_checks = ["database", "redis"]
        
        for check_name in critical_checks:
            result = await self.checks[check_name]()
            if result["status"] == "unhealthy":
                return {
                    "ready": False,
                    "reason": f"{check_name} is unhealthy",
                    "details": result
                }
        
        return {
            "ready": True,
            "timestamp": datetime.utcnow().isoformat()
        }


# ========================================
# 6. ALERTING CONFIGURATION
# ========================================

@dataclass
class Alert:
    """Alert definition"""
    name: str
    severity: str  # critical, high, medium, low
    condition: str
    threshold: float
    duration_seconds: int
    description: str
    runbook_url: Optional[str] = None


class AlertManager:
    """Manage alerting rules and notifications"""
    
    def __init__(self):
        self.alerts = self._define_alerts()
    
    def _define_alerts(self) -> List[Alert]:
        """Define alerting rules"""
        return [
            # Availability alerts
            Alert(
                name="high_error_rate",
                severity="critical",
                condition="error_rate_per_minute > threshold",
                threshold=10,
                duration_seconds=300,
                description="Error rate exceeds 10 errors per minute for 5 minutes",
                runbook_url="https://wiki/runbooks/high-error-rate"
            ),
            Alert(
                name="service_down",
                severity="critical",
                condition="up == 0",
                threshold=0,
                duration_seconds=60,
                description="Service is down for more than 1 minute"
            ),
            
            # Performance alerts
            Alert(
                name="high_response_time",
                severity="high",
                condition="http_request_duration_seconds > threshold",
                threshold=5,
                duration_seconds=300,
                description="Response time exceeds 5 seconds for 5 minutes"
            ),
            Alert(
                name="database_slow_queries",
                severity="medium",
                condition="database_query_duration_seconds > threshold",
                threshold=1,
                duration_seconds=600,
                description="Database queries taking longer than 1 second"
            ),
            
            # Resource alerts
            Alert(
                name="high_memory_usage",
                severity="high",
                condition="memory_usage_percent > threshold",
                threshold=90,
                duration_seconds=300,
                description="Memory usage exceeds 90% for 5 minutes"
            ),
            Alert(
                name="high_cpu_usage",
                severity="medium",
                condition="cpu_usage_percent > threshold",
                threshold=80,
                duration_seconds=600,
                description="CPU usage exceeds 80% for 10 minutes"
            ),
            
            # Business alerts
            Alert(
                name="processing_failures",
                severity="high",
                condition="processing_failure_rate > threshold",
                threshold=0.1,
                duration_seconds=1800,
                description="Processing failure rate exceeds 10%"
            ),
            Alert(
                name="high_validation_issues",
                severity="medium",
                condition="validation_issue_rate > threshold",
                threshold=0.3,
                duration_seconds=3600,
                description="Validation issue rate exceeds 30%"
            ),
            
            # Queue alerts
            Alert(
                name="celery_queue_backlog",
                severity="high",
                condition="celery_queue_length > threshold",
                threshold=100,
                duration_seconds=600,
                description="Celery queue has more than 100 pending tasks"
            )
        ]
    
    def get_prometheus_rules(self) -> str:
        """Generate Prometheus alerting rules"""
        rules = []
        
        for alert in self.alerts:
            rule = f"""
- alert: {alert.name}
  expr: {alert.condition.replace('threshold', str(alert.threshold))}
  for: {alert.duration_seconds}s
  labels:
    severity: {alert.severity}
  annotations:
    summary: "{alert.description}"
    description: "{alert.description}"
    runbook_url: "{alert.runbook_url or ''}"
"""
            rules.append(rule)
        
        return "\n".join(rules)


# ========================================
# 7. LOGGING CONFIGURATION
# ========================================

class LoggingSetup:
    """Configure structured logging"""
    
    def __init__(self, config: MetricsConfig):
        self.config = config
    
    def configure_logging(self):
        """Configure application logging"""
        
        # Configure root logger
        logging.basicConfig(
            level=logging.INFO,
            format='%(message)s',
            handlers=[
                logging.StreamHandler(),
                AzureLogHandler() if self.config.enable_azure_monitor else None
            ]
        )
        
        # Configure structlog
        structlog.configure(
            processors=[
                structlog.stdlib.filter_by_level,
                structlog.stdlib.add_logger_name,
                structlog.stdlib.add_log_level,
                structlog.stdlib.PositionalArgumentsFormatter(),
                structlog.processors.TimeStamper(fmt="iso"),
                structlog.processors.StackInfoRenderer(),
                structlog.processors.format_exc_info,
                structlog.processors.UnicodeDecoder(),
                self._add_trace_context,
                structlog.processors.JSONRenderer()
            ],
            context_class=dict,
            logger_factory=structlog.stdlib.LoggerFactory(),
            cache_logger_on_first_use=True,
        )
    
    def _add_trace_context(self, logger, method_name, event_dict):
        """Add tracing context to logs"""
        span = trace.get_current_span()
        if span:
            span_context = span.get_span_context()
            event_dict["trace_id"] = format(span_context.trace_id, "032x")
            event_dict["span_id"] = format(span_context.span_id, "016x")
        return event_dict


class AzureLogHandler(logging.Handler):
    """Custom handler for Azure Monitor logs"""
    
    def __init__(self):
        super().__init__()
        # Initialize Azure Monitor log exporter
        self.exporter = AzureMonitorLogExporter()
    
    def emit(self, record):
        """Send log record to Azure Monitor"""
        # Implementation would send logs to Azure Monitor
        pass


# ========================================
# 8. FASTAPI INTEGRATION
# ========================================

def setup_monitoring(app: FastAPI, config: MetricsConfig):
    """Setup monitoring for FastAPI application"""
    
    # Initialize Prometheus metrics
    prometheus_metrics = PrometheusMetrics()
    
    # Initialize OpenTelemetry
    otel_setup = OpenTelemetrySetup(config)
    otel_setup.initialize()
    
    # Initialize metrics collector
    collector = MetricsCollector(prometheus_metrics, config)
    
    # Add middleware for request tracking
    @app.middleware("http")
    async def track_requests(request: Request, call_next):
        """Track all HTTP requests"""
        
        method = request.method
        path = request.url.path
        
        async with collector.track_request(method, path) as span:
            # Track request size
            if request.headers.get("content-length"):
                size = int(request.headers["content-length"])
                prometheus_metrics.request_size.labels(
                    method=method,
                    endpoint=path
                ).observe(size)
            
            # Process request
            response = await call_next(request)
            
            # Track response size
            if response.headers.get("content-length"):
                size = int(response.headers["content-length"])
                prometheus_metrics.response_size.labels(
                    method=method,
                    endpoint=path
                ).observe(size)
            
            # Add trace ID to response headers
            span_context = span.get_span_context()
            response.headers["X-Trace-ID"] = format(span_context.trace_id, "032x")
            
            return response
    
    # Add metrics endpoint
    @app.get("/metrics", include_in_schema=False)
    async def metrics():
        """Prometheus metrics endpoint"""
        return PlainTextResponse(
            generate_latest(prometheus_metrics.registry),
            media_type=CONTENT_TYPE_LATEST
        )
    
    # Add health check endpoints
    @app.get("/health", include_in_schema=False)
    async def health_check(
        health_service: HealthCheckService = Depends()
    ):
        """Health check endpoint"""
        return await health_service.get_health_status()
    
    @app.get("/ready", include_in_schema=False)
    async def readiness_check(
        health_service: HealthCheckService = Depends()
    ):
        """Readiness check endpoint"""
        return await health_service.get_readiness_status()
    
    return prometheus_metrics, collector


# ========================================
# 9. DASHBOARD CONFIGURATION
# ========================================

def get_grafana_dashboard() -> Dict[str, Any]:
    """Generate Grafana dashboard configuration"""
    return {
        "dashboard": {
            "title": "Credit Card Processor Monitoring",
            "panels": [
                # Request metrics
                {
                    "title": "Request Rate",
                    "targets": [
                        {
                            "expr": "rate(http_requests_total[5m])",
                            "legendFormat": "{{method}} {{endpoint}}"
                        }
                    ]
                },
                {
                    "title": "Response Time (p95)",
                    "targets": [
                        {
                            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
                            "legendFormat": "{{endpoint}}"
                        }
                    ]
                },
                
                # Processing metrics
                {
                    "title": "Active Processing Sessions",
                    "targets": [
                        {
                            "expr": "processing_sessions_active"
                        }
                    ]
                },
                {
                    "title": "PDF Processing Duration",
                    "targets": [
                        {
                            "expr": "histogram_quantile(0.95, rate(pdf_processing_duration_seconds_bucket[5m]))",
                            "legendFormat": "{{document_type}}"
                        }
                    ]
                },
                
                # Error metrics
                {
                    "title": "Error Rate",
                    "targets": [
                        {
                            "expr": "rate(errors_total[5m])",
                            "legendFormat": "{{error_type}}"
                        }
                    ]
                },
                
                # Resource metrics
                {
                    "title": "Memory Usage",
                    "targets": [
                        {
                            "expr": "memory_usage_bytes / 1024 / 1024 / 1024",
                            "legendFormat": "{{type}}"
                        }
                    ]
                },
                {
                    "title": "CPU Usage",
                    "targets": [
                        {
                            "expr": "cpu_usage_percent"
                        }
                    ]
                },
                
                # Business metrics
                {
                    "title": "Validation Issues",
                    "targets": [
                        {
                            "expr": "rate(validation_issues_total[1h])",
                            "legendFormat": "{{issue_type}}"
                        }
                    ]
                },
                {
                    "title": "Processing Success Rate",
                    "targets": [
                        {
                            "expr": "rate(employees_processed_total{status='finished'}[1h]) / rate(employees_processed_total[1h])"
                        }
                    ]
                }
            ]
        }
    }


if __name__ == "__main__":
    # Example usage
    config = MetricsConfig(
        enable_prometheus=True,
        enable_azure_monitor=True,
        azure_monitor_connection_string="InstrumentationKey=xxx"
    )
    
    # Setup logging
    logging_setup = LoggingSetup(config)
    logging_setup.configure_logging()
    
    # Generate Prometheus alerting rules
    alert_manager = AlertManager()
    print(alert_manager.get_prometheus_rules())