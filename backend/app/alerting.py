"""
Alerting and notification system for production monitoring.

This module provides:
- Alert condition evaluation and triggering
- Multiple notification channels (email, Slack, webhooks)
- Alert suppression and escalation logic
- Alert history and acknowledgment tracking
"""

import json
import asyncio
import aiohttp
import logging
import smtplib
from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timezone, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dataclasses import dataclass, asdict
from collections import defaultdict

from .config import settings
from .monitoring import check_alert_conditions

# Configure alerting logger
alerting_logger = logging.getLogger('alerting')

@dataclass
class Alert:
    """Individual alert representation"""
    id: str
    severity: str  # 'critical', 'warning', 'info'
    component: str
    title: str
    message: str
    metric_value: Optional[float]
    threshold: Optional[float]
    timestamp: str
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[str] = None
    resolved: bool = False
    resolved_at: Optional[str] = None
    notification_sent: bool = False
    escalation_level: int = 0

@dataclass
class NotificationChannel:
    """Notification channel configuration"""
    name: str
    type: str  # 'email', 'slack', 'webhook', 'teams'
    config: Dict[str, Any]
    enabled: bool = True
    severity_filter: List[str] = None  # None means all severities

class AlertManager:
    """Manages alert lifecycle and notifications"""
    
    def __init__(self):
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
        self.suppressed_alerts: Set[str] = set()
        self.notification_channels: List[NotificationChannel] = []
        self.alert_rules = self._load_alert_rules()
        self._setup_notification_channels()
        
    def _load_alert_rules(self) -> Dict[str, Any]:
        """Load alert rules configuration"""
        return {
            'suppression_window': 300,  # 5 minutes
            'escalation_intervals': [300, 900, 3600],  # 5min, 15min, 1hour
            'auto_resolve_timeout': 3600,  # 1 hour
            'max_alerts_per_component': 10
        }
        
    def _setup_notification_channels(self):
        """Setup notification channels from configuration"""
        
        # Email channel
        if hasattr(settings, 'smtp_host') and settings.smtp_host:
            email_config = {
                'smtp_host': getattr(settings, 'smtp_host', ''),
                'smtp_port': getattr(settings, 'smtp_port', 587),
                'smtp_user': getattr(settings, 'smtp_user', ''),
                'smtp_password': getattr(settings, 'smtp_password', ''),
                'smtp_tls': getattr(settings, 'smtp_tls', True),
                'from_address': getattr(settings, 'smtp_user', 'noreply@example.com'),
                'to_addresses': getattr(settings, 'alert_email', 'admin@example.com').split(',')
            }
            
            self.notification_channels.append(
                NotificationChannel(
                    name='email',
                    type='email',
                    config=email_config,
                    severity_filter=['critical', 'warning']
                )
            )
        
        # Slack channel
        slack_webhook = getattr(settings, 'slack_webhook_url', '')
        if slack_webhook:
            slack_config = {
                'webhook_url': slack_webhook,
                'channel': '#alerts',
                'username': 'Credit Card Processor',
                'icon_emoji': ':warning:'
            }
            
            self.notification_channels.append(
                NotificationChannel(
                    name='slack',
                    type='slack',
                    config=slack_config,
                    severity_filter=['critical', 'warning']
                )
            )
        
        # Microsoft Teams channel
        teams_webhook = getattr(settings, 'teams_webhook_url', '')
        if teams_webhook:
            teams_config = {
                'webhook_url': teams_webhook
            }
            
            self.notification_channels.append(
                NotificationChannel(
                    name='teams',
                    type='teams',
                    config=teams_config,
                    severity_filter=['critical']
                )
            )
        
        # Generic webhook channel
        monitoring_webhook = getattr(settings, 'monitoring_webhook_url', '')
        if monitoring_webhook:
            webhook_config = {
                'webhook_url': monitoring_webhook,
                'method': 'POST',
                'headers': {'Content-Type': 'application/json'}
            }
            
            self.notification_channels.append(
                NotificationChannel(
                    name='monitoring_webhook',
                    type='webhook',
                    config=webhook_config
                )
            )
    
    async def check_and_process_alerts(self):
        """Main alert processing loop"""
        try:
            # Get current alert conditions
            current_conditions = await check_alert_conditions()
            
            # Process new alerts
            for condition in current_conditions:
                await self._process_alert_condition(condition)
            
            # Check for alerts that should be auto-resolved
            await self._auto_resolve_alerts(current_conditions)
            
            # Handle alert escalations
            await self._handle_escalations()
            
        except Exception as e:
            alerting_logger.error(f"Error in alert processing: {e}")
    
    async def _process_alert_condition(self, condition: Dict[str, Any]):
        """Process a single alert condition"""
        try:
            alert_id = self._generate_alert_id(condition)
            
            # Check if alert is suppressed
            if alert_id in self.suppressed_alerts:
                return
            
            # Check if alert already exists
            if alert_id in self.active_alerts:
                # Update existing alert
                existing_alert = self.active_alerts[alert_id]
                existing_alert.metric_value = condition.get('metric_value')
                existing_alert.timestamp = condition['timestamp']
                return
            
            # Create new alert
            alert = Alert(
                id=alert_id,
                severity=condition['severity'],
                component=condition['component'],
                title=f"{condition['component'].title()} Alert",
                message=condition['message'],
                metric_value=condition.get('metric_value'),
                threshold=condition.get('threshold'),
                timestamp=condition['timestamp']
            )
            
            # Add to active alerts
            self.active_alerts[alert_id] = alert
            self.alert_history.append(alert)
            
            alerting_logger.info(f"New alert created: {alert_id} - {alert.message}")
            
            # Send notifications
            await self._send_alert_notifications(alert)
            
        except Exception as e:
            alerting_logger.error(f"Error processing alert condition: {e}")
    
    def _generate_alert_id(self, condition: Dict[str, Any]) -> str:
        """Generate unique alert ID"""
        component = condition['component']
        message_hash = hash(condition['message']) % 10000
        return f"{component}_{message_hash}"
    
    async def _auto_resolve_alerts(self, current_conditions: List[Dict[str, Any]]):
        """Auto-resolve alerts that are no longer active"""
        current_alert_ids = {
            self._generate_alert_id(condition) for condition in current_conditions
        }
        
        alerts_to_resolve = []
        for alert_id, alert in self.active_alerts.items():
            if alert_id not in current_alert_ids:
                # Check if alert should be auto-resolved
                alert_age = datetime.now(timezone.utc) - datetime.fromisoformat(
                    alert.timestamp.replace('Z', '+00:00')
                )
                
                if alert_age.total_seconds() > self.alert_rules['auto_resolve_timeout']:
                    alerts_to_resolve.append(alert_id)
        
        # Resolve alerts
        for alert_id in alerts_to_resolve:
            await self.resolve_alert(alert_id, 'system', 'Auto-resolved')
    
    async def _handle_escalations(self):
        """Handle alert escalations based on time and acknowledgment"""
        for alert_id, alert in self.active_alerts.items():
            if alert.acknowledged or alert.resolved:
                continue
                
            alert_age = datetime.now(timezone.utc) - datetime.fromisoformat(
                alert.timestamp.replace('Z', '+00:00')
            )
            
            escalation_intervals = self.alert_rules['escalation_intervals']
            
            for level, interval in enumerate(escalation_intervals):
                if (alert_age.total_seconds() > interval and 
                    alert.escalation_level <= level):
                    
                    alert.escalation_level = level + 1
                    await self._send_escalation_notification(alert, level + 1)
    
    async def _send_alert_notifications(self, alert: Alert):
        """Send notifications for a new alert"""
        for channel in self.notification_channels:
            if not channel.enabled:
                continue
                
            # Check severity filter
            if (channel.severity_filter and 
                alert.severity not in channel.severity_filter):
                continue
            
            try:
                await self._send_notification(channel, alert)
                alerting_logger.info(f"Sent alert notification via {channel.name}")
                
            except Exception as e:
                alerting_logger.error(f"Failed to send notification via {channel.name}: {e}")
        
        alert.notification_sent = True
    
    async def _send_escalation_notification(self, alert: Alert, escalation_level: int):
        """Send escalation notification"""
        escalation_alert = Alert(
            id=f"{alert.id}_escalation_{escalation_level}",
            severity='critical',  # Escalations are always critical
            component=alert.component,
            title=f"ESCALATION Level {escalation_level}: {alert.title}",
            message=f"Alert has not been acknowledged for {escalation_level * 5} minutes: {alert.message}",
            metric_value=alert.metric_value,
            threshold=alert.threshold,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
        
        # Send to critical severity channels only
        critical_channels = [
            ch for ch in self.notification_channels 
            if ch.enabled and (
                not ch.severity_filter or 'critical' in ch.severity_filter
            )
        ]
        
        for channel in critical_channels:
            try:
                await self._send_notification(channel, escalation_alert, is_escalation=True)
            except Exception as e:
                alerting_logger.error(f"Failed to send escalation notification: {e}")
    
    async def _send_notification(self, channel: NotificationChannel, alert: Alert, 
                               is_escalation: bool = False):
        """Send notification through specific channel"""
        if channel.type == 'email':
            await self._send_email_notification(channel, alert, is_escalation)
        elif channel.type == 'slack':
            await self._send_slack_notification(channel, alert, is_escalation)
        elif channel.type == 'teams':
            await self._send_teams_notification(channel, alert, is_escalation)
        elif channel.type == 'webhook':
            await self._send_webhook_notification(channel, alert, is_escalation)
    
    async def _send_email_notification(self, channel: NotificationChannel, 
                                     alert: Alert, is_escalation: bool = False):
        """Send email notification"""
        config = channel.config
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = config['from_address']
        msg['To'] = ', '.join(config['to_addresses'])
        
        subject_prefix = "🚨 ESCALATION: " if is_escalation else ""
        emoji = "🔴" if alert.severity == 'critical' else "🟡" if alert.severity == 'warning' else "🔵"
        msg['Subject'] = f"{subject_prefix}{emoji} {alert.title}"
        
        # Create email body
        body = f"""
Credit Card Processor Alert

Severity: {alert.severity.upper()}
Component: {alert.component}
Time: {alert.timestamp}

Message: {alert.message}

"""
        
        if alert.metric_value is not None:
            body += f"Current Value: {alert.metric_value}\n"
        if alert.threshold is not None:
            body += f"Threshold: {alert.threshold}\n"
        
        body += f"""
Alert ID: {alert.id}

This is an automated alert from the Credit Card Processor monitoring system.
"""
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Send email
        try:
            with smtplib.SMTP(config['smtp_host'], config['smtp_port']) as server:
                if config['smtp_tls']:
                    server.starttls()
                if config['smtp_user'] and config['smtp_password']:
                    server.login(config['smtp_user'], config['smtp_password'])
                server.send_message(msg)
                
        except Exception as e:
            alerting_logger.error(f"Failed to send email notification: {e}")
            raise
    
    async def _send_slack_notification(self, channel: NotificationChannel, 
                                     alert: Alert, is_escalation: bool = False):
        """Send Slack notification"""
        config = channel.config
        
        # Choose color based on severity
        color_map = {
            'critical': '#ff0000',  # Red
            'warning': '#ffaa00',   # Orange
            'info': '#0099ff'       # Blue
        }
        color = color_map.get(alert.severity, '#808080')
        
        # Create Slack message
        title_prefix = "🚨 ESCALATION: " if is_escalation else ""
        emoji = "🔴" if alert.severity == 'critical' else "🟡" if alert.severity == 'warning' else "🔵"
        
        payload = {
            "channel": config.get('channel', '#alerts'),
            "username": config.get('username', 'Credit Card Processor'),
            "icon_emoji": config.get('icon_emoji', ':warning:'),
            "attachments": [
                {
                    "color": color,
                    "title": f"{title_prefix}{emoji} {alert.title}",
                    "text": alert.message,
                    "fields": [
                        {
                            "title": "Severity",
                            "value": alert.severity.upper(),
                            "short": True
                        },
                        {
                            "title": "Component",
                            "value": alert.component,
                            "short": True
                        },
                        {
                            "title": "Time",
                            "value": alert.timestamp,
                            "short": True
                        },
                        {
                            "title": "Alert ID",
                            "value": alert.id,
                            "short": True
                        }
                    ],
                    "footer": "Credit Card Processor Monitoring",
                    "ts": int(datetime.now(timezone.utc).timestamp())
                }
            ]
        }
        
        # Add metric info if available
        if alert.metric_value is not None:
            payload["attachments"][0]["fields"].append({
                "title": "Current Value",
                "value": str(alert.metric_value),
                "short": True
            })
        
        if alert.threshold is not None:
            payload["attachments"][0]["fields"].append({
                "title": "Threshold",
                "value": str(alert.threshold),
                "short": True
            })
        
        # Send to Slack
        async with aiohttp.ClientSession() as session:
            async with session.post(config['webhook_url'], json=payload) as response:
                if response.status != 200:
                    raise Exception(f"Slack webhook returned {response.status}")
    
    async def _send_teams_notification(self, channel: NotificationChannel, 
                                     alert: Alert, is_escalation: bool = False):
        """Send Microsoft Teams notification"""
        config = channel.config
        
        # Choose theme color based on severity
        theme_color_map = {
            'critical': 'FF0000',    # Red
            'warning': 'FFAA00',     # Orange
            'info': '0099FF'         # Blue
        }
        theme_color = theme_color_map.get(alert.severity, '808080')
        
        title_prefix = "🚨 ESCALATION: " if is_escalation else ""
        emoji = "🔴" if alert.severity == 'critical' else "🟡" if alert.severity == 'warning' else "🔵"
        
        # Create Teams message
        payload = {
            "@type": "MessageCard",
            "@context": "https://schema.org/extensions",
            "themeColor": theme_color,
            "summary": f"Credit Card Processor Alert: {alert.title}",
            "sections": [
                {
                    "activityTitle": f"{title_prefix}{emoji} {alert.title}",
                    "activitySubtitle": "Credit Card Processor Alert",
                    "activityImage": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Warning_icon.svg/1200px-Warning_icon.svg.png",
                    "facts": [
                        {
                            "name": "Severity",
                            "value": alert.severity.upper()
                        },
                        {
                            "name": "Component",
                            "value": alert.component
                        },
                        {
                            "name": "Time",
                            "value": alert.timestamp
                        },
                        {
                            "name": "Message",
                            "value": alert.message
                        },
                        {
                            "name": "Alert ID",
                            "value": alert.id
                        }
                    ]
                }
            ]
        }
        
        # Add metric info if available
        if alert.metric_value is not None:
            payload["sections"][0]["facts"].append({
                "name": "Current Value",
                "value": str(alert.metric_value)
            })
        
        if alert.threshold is not None:
            payload["sections"][0]["facts"].append({
                "name": "Threshold",
                "value": str(alert.threshold)
            })
        
        # Send to Teams
        async with aiohttp.ClientSession() as session:
            async with session.post(config['webhook_url'], json=payload) as response:
                if response.status != 200:
                    raise Exception(f"Teams webhook returned {response.status}")
    
    async def _send_webhook_notification(self, channel: NotificationChannel, 
                                       alert: Alert, is_escalation: bool = False):
        """Send generic webhook notification"""
        config = channel.config
        
        payload = {
            "alert": asdict(alert),
            "is_escalation": is_escalation,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": "credit-card-processor"
        }
        
        headers = config.get('headers', {'Content-Type': 'application/json'})
        method = config.get('method', 'POST')
        
        async with aiohttp.ClientSession() as session:
            async with session.request(
                method, 
                config['webhook_url'], 
                json=payload, 
                headers=headers
            ) as response:
                if response.status not in [200, 201, 202]:
                    raise Exception(f"Webhook returned {response.status}")
    
    async def acknowledge_alert(self, alert_id: str, acknowledged_by: str, 
                              notes: str = None) -> bool:
        """Acknowledge an alert"""
        if alert_id not in self.active_alerts:
            return False
        
        alert = self.active_alerts[alert_id]
        alert.acknowledged = True
        alert.acknowledged_by = acknowledged_by
        alert.acknowledged_at = datetime.now(timezone.utc).isoformat()
        
        alerting_logger.info(f"Alert {alert_id} acknowledged by {acknowledged_by}")
        return True
    
    async def resolve_alert(self, alert_id: str, resolved_by: str, 
                          notes: str = None) -> bool:
        """Resolve an alert"""
        if alert_id not in self.active_alerts:
            return False
        
        alert = self.active_alerts[alert_id]
        alert.resolved = True
        alert.resolved_at = datetime.now(timezone.utc).isoformat()
        
        # Remove from active alerts
        del self.active_alerts[alert_id]
        
        alerting_logger.info(f"Alert {alert_id} resolved by {resolved_by}")
        return True
    
    def suppress_alert(self, alert_pattern: str, duration_minutes: int = None):
        """Suppress alerts matching a pattern"""
        if duration_minutes:
            # TODO: Implement time-based suppression
            pass
        self.suppressed_alerts.add(alert_pattern)
        alerting_logger.info(f"Alert pattern '{alert_pattern}' suppressed")
    
    def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get all active alerts"""
        return [asdict(alert) for alert in self.active_alerts.values()]
    
    def get_alert_summary(self) -> Dict[str, Any]:
        """Get alert summary statistics"""
        active_by_severity = defaultdict(int)
        active_by_component = defaultdict(int)
        
        for alert in self.active_alerts.values():
            active_by_severity[alert.severity] += 1
            active_by_component[alert.component] += 1
        
        return {
            'total_active': len(self.active_alerts),
            'by_severity': dict(active_by_severity),
            'by_component': dict(active_by_component),
            'suppressed_patterns': len(self.suppressed_alerts),
            'notification_channels': len(self.notification_channels)
        }

# Global alert manager instance
alert_manager = AlertManager()

async def run_alert_processing():
    """Background task for alert processing"""
    while True:
        try:
            await alert_manager.check_and_process_alerts()
            await asyncio.sleep(60)  # Check every minute
        except Exception as e:
            alerting_logger.error(f"Error in alert processing loop: {e}")
            await asyncio.sleep(30)  # Shorter sleep on error