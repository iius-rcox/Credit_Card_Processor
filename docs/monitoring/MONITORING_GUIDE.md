# Monitoring & Logging Guide

## Overview
This guide covers the comprehensive monitoring and logging infrastructure implemented for the Credit Card Processor application. The monitoring stack includes health checks, metrics collection, log aggregation, alerting, and visualization.

## Architecture Overview

### Monitoring Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   Prometheus    │    │    Grafana      │
│   (FastAPI)     │────│   (Metrics)     │────│ (Visualization) │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Fluentd      │    │  AlertManager   │    │   Dashboard     │
│ (Log Aggregation)│   │  (Notifications)│    │   (Monitoring)  │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow
1. **Application Metrics**: Collected via Prometheus client library
2. **System Metrics**: Collected via node_exporter and cAdvisor
3. **Health Checks**: Multi-level health monitoring endpoints
4. **Log Aggregation**: Fluentd collects and processes application logs
5. **Alerting**: Prometheus evaluates rules and sends to AlertManager
6. **Notifications**: Email, Slack, Teams, and webhook notifications
7. **Visualization**: Grafana dashboards for monitoring and analysis

## Health Monitoring

### Health Check Endpoints

#### Basic Health Check
```bash
GET /health
```
Returns simple "healthy" status for load balancers.

#### Detailed Health Check
```bash
GET /api/health/detailed
```
Returns comprehensive health information including:
- Database connectivity and performance
- Disk space availability
- Memory and CPU usage
- Cache system status
- File permissions
- External dependencies

#### Critical Health Check
```bash
GET /api/health/critical
```
Returns only critical issues that require immediate attention.

### Health Check Components
1. **Database Health**: Connection tests and query performance
2. **System Resources**: CPU, memory, disk space monitoring
3. **File System**: Critical path permissions and availability
4. **Cache System**: Cache hit rates and error monitoring
5. **External Dependencies**: Third-party service availability

### Health Check Thresholds
- **Memory Usage**: Warning >85%, Critical >95%
- **CPU Usage**: Warning >80%, Critical >95%
- **Disk Space**: Warning <20%, Critical <10%
- **Database Query Time**: Warning >1s, Critical >5s

## Metrics Collection

### Prometheus Integration

The application exposes Prometheus-compatible metrics at `/metrics` endpoint:

```bash
# View raw Prometheus metrics
curl http://localhost:8001/metrics

# View metrics in JSON format
curl http://localhost:8001/api/monitoring/metrics/prometheus
```

### Available Metrics

#### HTTP Request Metrics
- `http_requests_total`: Total HTTP requests by method, endpoint, status
- `http_request_duration_seconds`: Request duration histogram
- `http_requests_in_progress`: Current requests being processed

#### System Metrics
- `system_cpu_usage_percent`: CPU usage percentage
- `system_memory_usage_percent`: Memory usage percentage
- `system_disk_usage_percent`: Disk usage percentage
- `system_disk_free_gb`: Available disk space in GB

#### Application Metrics
- `app_uptime_seconds`: Application uptime
- `database_connections_active`: Active database connections
- `database_query_duration_seconds`: Database query performance
- `cache_hit_ratio`: Cache effectiveness
- `processing_queue_size`: File processing queue backlog

#### Security Metrics
- `auth_attempts_total`: Authentication attempts
- `auth_failures_total`: Failed authentication attempts
- `security_events_total`: Security-related events
- `rate_limit_hits_total`: Rate limiting activations

#### Business Metrics
- `file_uploads_total`: File upload statistics
- `file_processing_duration_seconds`: Processing performance
- `file_upload_failures_total`: Upload error tracking

### Custom Metrics Collection

The application automatically tracks:
- Request/response patterns
- Error rates and types
- Performance bottlenecks
- Resource utilization
- Security events

## Log Management

### Log Categories

#### Application Logs
- **Location**: `./logs/application.log`
- **Content**: General application events and information
- **Rotation**: 10MB files, 10 generations
- **Format**: Structured logging with timestamps, levels, and context

#### Error Logs
- **Location**: `./logs/errors.log`
- **Content**: Error conditions and exceptions
- **Rotation**: 10MB files, 10 generations
- **Format**: Detailed error information with stack traces

#### Security Logs
- **Location**: `./logs/security.log`
- **Content**: Authentication, authorization, and security events
- **Rotation**: 10MB files, 10 generations
- **Format**: Security-specific structured format

#### Performance Logs
- **Location**: `./logs/performance.log`
- **Content**: Performance metrics and timing data
- **Rotation**: 10MB files, 5 generations
- **Format**: JSON format for easy parsing

### Log Rotation

Automatic log rotation is configured using:
1. **Python logging handlers**: Built-in rotation
2. **System logrotate**: OS-level rotation for long-term retention
3. **Docker log drivers**: Container-level log management

### Log Aggregation

#### Fluentd Configuration
Logs are collected and processed by Fluentd with:
- **Input Sources**: Application logs, nginx logs, system logs
- **Processing**: Parsing, filtering, and enrichment
- **Output Destinations**: Elasticsearch, Splunk, CloudWatch, or file storage

#### Log Parsing
- **Application logs**: Parsed for structured fields
- **nginx logs**: Standard web server log format
- **JSON logs**: Direct parsing of structured data
- **Multiline logs**: Stack traces and complex entries

## Alerting System

### Alert Types

#### Critical Alerts
- Application down
- Database connectivity failures
- System resource exhaustion (>95% memory/CPU)
- Security breaches
- SSL certificate expiration

#### Warning Alerts
- High resource usage (>80% memory/CPU)
- Elevated error rates (>10%)
- Slow response times (>5s)
- Low disk space (<20%)
- Failed authentication attempts

#### Information Alerts
- Successful deployments
- System maintenance events
- Configuration changes
- Performance milestones

### Alert Routing

#### Notification Channels
1. **Email**: Primary notification method
2. **Slack**: Real-time team notifications
3. **Microsoft Teams**: Enterprise team collaboration
4. **Webhooks**: Integration with other systems

#### Escalation Policy
1. **Initial Alert**: Sent to primary oncall
2. **5-minute escalation**: Sent to backup oncall
3. **15-minute escalation**: Sent to team lead
4. **1-hour escalation**: Sent to management

### Alert Management

#### Alert Acknowledgment
```bash
POST /api/alerts/{alert_id}/acknowledge
```
Acknowledges an alert to prevent further notifications.

#### Alert Resolution
```bash
POST /api/alerts/{alert_id}/resolve
```
Marks an alert as resolved (admin only).

#### Alert Suppression
Alerts can be suppressed during maintenance windows or known issues.

## Visualization

### Grafana Dashboards

#### System Overview Dashboard
- **CPU and Memory Usage**: Real-time resource monitoring
- **Disk Usage**: Storage utilization and trends
- **Network Traffic**: Bandwidth and connection metrics
- **Load Averages**: System performance indicators

#### Application Dashboard
- **Request Metrics**: Request rate, response time, error rate
- **Database Performance**: Query times, connection pools
- **Cache Performance**: Hit rates, response times
- **User Activity**: Authentication, session management

#### Security Dashboard
- **Authentication Events**: Login attempts, failures
- **Security Incidents**: Potential threats and attacks
- **Access Patterns**: User behavior analysis
- **Rate Limiting**: API abuse prevention

#### Business Metrics Dashboard
- **File Processing**: Upload/processing statistics
- **Error Analysis**: Error patterns and trends
- **Performance Trends**: Long-term performance analysis
- **Capacity Planning**: Resource utilization forecasting

### Dashboard Access
- **Grafana URL**: http://localhost:3001 (monitoring stack)
- **Default Login**: admin / admin123 (change in production)
- **Prometheus URL**: http://localhost:9090
- **AlertManager URL**: http://localhost:9093

## Deployment

### Starting the Monitoring Stack

#### Full Stack
```bash
# Start main application and monitoring
docker-compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d
```

#### Monitoring Only
```bash
# Start just the monitoring components
docker-compose -f docker-compose.monitoring.yml up -d
```

### Configuration

#### Environment Variables
```bash
# SMTP Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=alerts@example.com
SMTP_PASSWORD=your-password

# Notification Recipients
ALERT_EMAIL=admin@example.com
SECURITY_EMAIL=security@example.com
DBA_EMAIL=dba@example.com
OPS_EMAIL=ops@example.com
DEV_EMAIL=dev@example.com

# Webhook URLs
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...
MONITORING_WEBHOOK_URL=https://your-monitoring-system.com/webhook
```

#### Grafana Configuration
```bash
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=secure-password
```

### Data Retention

#### Prometheus
- **Short-term**: 30 days in Prometheus
- **Long-term**: Remote write to external storage

#### Logs
- **Application logs**: 30 days local retention
- **Security logs**: 365 days (compliance requirement)
- **Audit logs**: 7 years (configurable)

#### Grafana
- **Dashboard history**: 30 days
- **Annotations**: 90 days

## Troubleshooting

### Common Issues

#### High Memory Usage
1. Check Prometheus retention settings
2. Review log file sizes and rotation
3. Monitor container memory limits
4. Check for memory leaks in application

#### Missing Metrics
1. Verify Prometheus target configuration
2. Check application metrics endpoint
3. Review firewall and network connectivity
4. Validate service discovery

#### Alert Fatigue
1. Review alert thresholds and tune sensitivity
2. Implement proper alert grouping and suppression
3. Use escalation policies effectively
4. Regular alert rule maintenance

#### Log Parsing Issues
1. Check Fluentd configuration syntax
2. Verify log format matches parser
3. Review Fluentd error logs
4. Test parsing rules with sample data

### Monitoring Health Checks

#### Prometheus Health
```bash
curl http://localhost:9090/-/healthy
```

#### Grafana Health
```bash
curl http://localhost:3001/api/health
```

#### AlertManager Health
```bash
curl http://localhost:9093/-/healthy
```

### Performance Optimization

#### Metrics Optimization
- Use appropriate metric types (counters vs gauges)
- Implement proper cardinality control
- Regular cleanup of stale metrics
- Optimize scrape intervals

#### Log Optimization
- Structured logging for better parsing
- Appropriate log levels
- Log sampling for high-volume events
- Efficient log shipping and storage

## Security Considerations

### Access Control
- **Grafana**: Role-based access control
- **Prometheus**: Network-level restrictions
- **AlertManager**: Authentication for webhooks
- **Logs**: Encrypted storage and transmission

### Data Privacy
- **Sensitive Data**: Excluded from logs and metrics
- **PII Protection**: Data anonymization
- **Compliance**: GDPR/CCPA considerations
- **Retention Policies**: Automated data cleanup

### Network Security
- **TLS Encryption**: All inter-service communication
- **Firewall Rules**: Restrict monitoring port access
- **VPN Requirements**: Secure access to dashboards
- **Certificate Management**: Regular rotation

## Maintenance

### Regular Tasks

#### Weekly
- Review alert configurations
- Check disk space usage
- Validate backup procedures
- Update security configurations

#### Monthly
- Performance optimization review
- Dashboard maintenance
- Log retention cleanup
- Capacity planning review

#### Quarterly
- Monitoring stack updates
- Security audit
- Alert rule optimization
- Documentation updates

### Backup Procedures
1. **Configuration Backup**: All monitoring configs
2. **Dashboard Export**: Grafana dashboard backups
3. **Historical Data**: Long-term metrics storage
4. **Alert History**: Alert event archives

## Best Practices

### Monitoring Design
1. **Four Golden Signals**: Latency, traffic, errors, saturation
2. **Use Case Driven**: Monitor what matters to users
3. **Actionable Alerts**: Every alert should require action
4. **Layered Monitoring**: Multiple perspectives on health

### Alert Design
1. **Symptom-based**: Alert on user-visible issues
2. **Appropriate Urgency**: Match alert severity to impact
3. **Clear Context**: Include helpful information
4. **Runbook Links**: Guide responders to solutions

### Dashboard Design
1. **User-focused**: Design for the intended audience
2. **Progressive Detail**: Overview to detailed drill-down
3. **Consistent Layout**: Standard visual patterns
4. **Performance Minded**: Efficient queries and loading