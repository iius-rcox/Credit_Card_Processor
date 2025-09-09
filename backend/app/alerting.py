"""
Minimal alerting module for Credit Card Processor.
Provides basic alerting functionality without complex alert management.
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone
import asyncio
import logging

logger = logging.getLogger(__name__)


class AlertManager:
    """
    Minimal alert manager that provides basic functionality.
    """
    
    def __init__(self):
        self.enabled = False
        self.alerts = []
        
    def create_alert(
        self, 
        severity: str, 
        title: str, 
        description: str, 
        tags: Optional[Dict[str, str]] = None
    ):
        """
        Create an alert.
        
        Args:
            severity: Alert severity (info, warning, error, critical)
            title: Alert title
            description: Alert description
            tags: Additional alert tags
        """
        alert = {
            "severity": severity,
            "title": title,
            "description": description,
            "tags": tags or {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "active"
        }
        
        # Log the alert instead of storing it
        log_level = {
            "info": logging.INFO,
            "warning": logging.WARNING, 
            "error": logging.ERROR,
            "critical": logging.CRITICAL
        }.get(severity.lower(), logging.WARNING)
        
        logger.log(log_level, f"ALERT [{severity.upper()}]: {title} - {description}")
        
    def get_active_alerts(self):
        """Get list of active alerts."""
        return []
        
    def resolve_alert(self, alert_id: str):
        """Resolve an alert by ID."""
        pass
        
    def get_alert_stats(self):
        """Get alert statistics."""
        return {
            "total_alerts": 0,
            "active_alerts": 0,
            "resolved_alerts": 0,
            "alert_rate": 0.0
        }


# Global alert manager instance
alert_manager = AlertManager()


async def run_alert_processing():
    """
    Run background alert processing.
    
    This is a minimal implementation that does nothing.
    """
    logger.info("Alert processing started (minimal implementation)")
    
    # Minimal background task that just sleeps
    while True:
        await asyncio.sleep(60)  # Sleep for 1 minute
        # No actual processing in minimal implementation


def send_alert(severity: str, message: str, details: Optional[Dict[str, Any]] = None):
    """
    Send an alert with specified severity.
    
    Args:
        severity: Alert severity level
        message: Alert message
        details: Additional alert details
    """
    alert_manager.create_alert(
        severity=severity,
        title=message,
        description=f"Details: {details}" if details else message,
        tags=details or {}
    )


def alert_on_error(error: Exception, context: str = ""):
    """
    Create an alert for an error.
    
    Args:
        error: Exception that occurred
        context: Additional context about where the error occurred
    """
    send_alert(
        severity="error",
        message=f"Error in {context}: {str(error)}",
        details={"error_type": type(error).__name__, "context": context}
    )


# Export main functions
__all__ = [
    'alert_manager',
    'run_alert_processing',
    'send_alert',
    'alert_on_error'
]