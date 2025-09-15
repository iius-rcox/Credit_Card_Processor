"""
Graceful degradation system for handling database unavailability

This module provides fallback strategies for when database operations fail,
ensuring the system remains partially functional during outages.
"""

import logging
import json
import time
import threading
from enum import Enum
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime, timezone
from pathlib import Path
from .config import settings

logger = logging.getLogger(__name__)


class DegradationLevel(Enum):
    """System degradation levels"""
    NORMAL = "normal"           # Full functionality
    DEGRADED = "degraded"       # Limited functionality with fallbacks
    CRITICAL = "critical"       # Minimal functionality only
    OFFLINE = "offline"         # System unavailable


@dataclass
class DegradationState:
    """Current system degradation state"""
    level: DegradationLevel = DegradationLevel.NORMAL
    reason: str = ""
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    affected_operations: List[str] = field(default_factory=list)
    fallback_data: Dict[str, Any] = field(default_factory=dict)
    recovery_attempts: int = 0
    last_recovery_attempt: Optional[datetime] = None


class DegradationManager:
    """
    Manages system degradation states and fallback strategies
    """
    
    def __init__(self):
        self._state = DegradationState()
        self._lock = threading.RLock()
        self._cache_dir = Path(settings.upload_path).parent / "cache"
        self._cache_dir.mkdir(exist_ok=True)
        self._fallback_handlers: Dict[str, Callable] = {}
        
        # Initialize fallback handlers
        self._register_default_handlers()
        
        logger.info("Degradation manager initialized")
    
    def _register_default_handlers(self):
        """Register default fallback handlers"""
        self._fallback_handlers.update({
            "processing": self._processing_fallback,
            "status_updates": self._status_update_fallback,
            "exports": self._export_fallback,
            "results": self._results_fallback
        })
    
    @property
    def state(self) -> DegradationState:
        """Get current degradation state"""
        with self._lock:
            return self._state
    
    def set_degradation_level(
        self, 
        level: DegradationLevel, 
        reason: str, 
        affected_operations: List[str] = None
    ):
        """
        Set system degradation level
        
        Args:
            level: New degradation level
            reason: Reason for degradation
            affected_operations: List of affected operation types
        """
        with self._lock:
            old_level = self._state.level
            
            if old_level != level:
                self._state.level = level
                self._state.reason = reason
                self._state.started_at = datetime.now(timezone.utc)
                self._state.affected_operations = affected_operations or []
                self._state.recovery_attempts = 0
                self._state.last_recovery_attempt = None
                
                logger.warning(f"System degradation changed from {old_level.value} to {level.value}: {reason}")
                
                # Clear fallback data when returning to normal
                if level == DegradationLevel.NORMAL:
                    self._state.fallback_data.clear()
    
    def is_operation_affected(self, operation: str) -> bool:
        """Check if an operation is affected by current degradation"""
        with self._lock:
            return (
                self._state.level != DegradationLevel.NORMAL and 
                operation in self._state.affected_operations
            )
    
    def get_fallback_handler(self, operation: str) -> Optional[Callable]:
        """Get fallback handler for an operation"""
        return self._fallback_handlers.get(operation)
    
    def cache_data(self, key: str, data: Any, ttl: int = 3600):
        """
        Cache data for fallback use
        
        Args:
            key: Cache key
            data: Data to cache
            ttl: Time to live in seconds
        """
        try:
            cache_entry = {
                "data": data,
                "cached_at": datetime.now(timezone.utc).isoformat(),
                "ttl": ttl
            }
            
            cache_file = self._cache_dir / f"{key}.json"
            with open(cache_file, 'w') as f:
                json.dump(cache_entry, f, default=str)
            
            logger.debug(f"Cached data for key '{key}' with TTL {ttl}s")
            
        except Exception as e:
            logger.warning(f"Failed to cache data for key '{key}': {e}")
    
    def get_cached_data(self, key: str) -> Optional[Any]:
        """
        Retrieve cached data
        
        Args:
            key: Cache key
            
        Returns:
            Cached data if available and not expired, None otherwise
        """
        try:
            cache_file = self._cache_dir / f"{key}.json"
            
            if not cache_file.exists():
                return None
            
            with open(cache_file, 'r') as f:
                cache_entry = json.load(f)
            
            # Check if expired
            cached_at = datetime.fromisoformat(cache_entry["cached_at"])
            age = (datetime.now(timezone.utc) - cached_at).total_seconds()
            
            if age > cache_entry["ttl"]:
                cache_file.unlink()  # Delete expired cache
                return None
            
            logger.debug(f"Retrieved cached data for key '{key}' (age: {age:.1f}s)")
            return cache_entry["data"]
            
        except Exception as e:
            logger.warning(f"Failed to retrieve cached data for key '{key}': {e}")
            return None
    
    def _processing_fallback(self, session_id: str, **kwargs) -> Dict[str, Any]:
        """
        Fallback strategy for processing operations
        
        Args:
            session_id: Processing session ID
            **kwargs: Additional parameters
            
        Returns:
            Fallback response
        """
        logger.info(f"Using processing fallback for session {session_id}")
        
        # Cache the processing request for later
        self.cache_data(f"pending_processing_{session_id}", {
            "session_id": session_id,
            "requested_at": datetime.now(timezone.utc).isoformat(),
            **kwargs
        }, ttl=86400)  # Cache for 24 hours
        
        return {
            "status": "processing_delayed",
            "message": "Processing has been queued due to system maintenance. You will be notified when complete.",
            "session_id": session_id,
            "estimated_delay": "15-30 minutes",
            "fallback": True
        }
    
    def _status_update_fallback(self, session_id: str, **kwargs) -> Dict[str, Any]:
        """
        Fallback strategy for status updates
        
        Args:
            session_id: Session ID
            **kwargs: Additional parameters
            
        Returns:
            Cached status or fallback response
        """
        logger.debug(f"Using status update fallback for session {session_id}")
        
        # Try to get cached status
        cached_status = self.get_cached_data(f"status_{session_id}")
        
        if cached_status:
            cached_status["fallback"] = True
            cached_status["message"] = "Status from cache (database temporarily unavailable)"
            return cached_status
        
        return {
            "status": "unknown",
            "message": "Status temporarily unavailable due to system maintenance",
            "session_id": session_id,
            "fallback": True,
            "last_updated": None
        }
    
    def _export_fallback(self, session_id: str, export_type: str, **kwargs) -> Dict[str, Any]:
        """
        Fallback strategy for export operations
        
        Args:
            session_id: Session ID
            export_type: Type of export
            **kwargs: Additional parameters
            
        Returns:
            Fallback response
        """
        logger.info(f"Using export fallback for session {session_id}, type {export_type}")
        
        # Cache the export request
        self.cache_data(f"pending_export_{session_id}_{export_type}", {
            "session_id": session_id,
            "export_type": export_type,
            "requested_at": datetime.now(timezone.utc).isoformat(),
            **kwargs
        }, ttl=86400)
        
        # Try to serve cached export if available
        cached_export = self.get_cached_data(f"export_{session_id}_{export_type}")
        if cached_export:
            return {
                "status": "available",
                "data": cached_export,
                "message": "Export from cache (may not reflect latest changes)",
                "fallback": True
            }
        
        return {
            "status": "export_delayed",
            "message": f"Export generation has been queued due to system maintenance. Available exports may be outdated.",
            "session_id": session_id,
            "export_type": export_type,
            "estimated_delay": "10-20 minutes",
            "fallback": True
        }
    
    def _results_fallback(self, session_id: str, **kwargs) -> Dict[str, Any]:
        """
        Fallback strategy for results operations
        
        Args:
            session_id: Session ID
            **kwargs: Additional parameters
            
        Returns:
            Cached results or fallback response
        """
        logger.debug(f"Using results fallback for session {session_id}")
        
        # Try to serve cached results
        cached_results = self.get_cached_data(f"results_{session_id}")
        if cached_results:
            return {
                "status": "available",
                "data": cached_results,
                "message": "Results from cache (may not reflect latest changes)",
                "fallback": True,
                "staleness_warning": True
            }
        
        return {
            "status": "results_unavailable",
            "message": "Results temporarily unavailable due to system maintenance",
            "session_id": session_id,
            "fallback": True,
            "retry_after": 300  # 5 minutes
        }
    
    def attempt_recovery(self):
        """Attempt to recover from degraded state"""
        with self._lock:
            if self._state.level == DegradationLevel.NORMAL:
                return True
            
            self._state.recovery_attempts += 1
            self._state.last_recovery_attempt = datetime.now(timezone.utc)
            
            logger.info(f"Attempting recovery from {self._state.level.value} state "
                       f"(attempt {self._state.recovery_attempts})")
            
            # Try to perform a basic health check
            try:
                from .database import perform_health_check
                health = perform_health_check()
                
                if health["status"] == "healthy":
                    self.set_degradation_level(DegradationLevel.NORMAL, "Recovery successful")
                    logger.info("Recovery successful - system restored to normal operation")
                    return True
                elif health["status"] == "degraded" and self._state.level == DegradationLevel.CRITICAL:
                    self.set_degradation_level(DegradationLevel.DEGRADED, "Partial recovery")
                    logger.info("Partial recovery - system upgraded to degraded mode")
                    return False
                
            except Exception as e:
                logger.warning(f"Recovery attempt {self._state.recovery_attempts} failed: {e}")
            
            return False
    
    def get_user_message(self) -> Dict[str, Any]:
        """
        Get user-friendly message about current system state
        
        Returns:
            Dictionary with user message and recommendations
        """
        with self._lock:
            if self._state.level == DegradationLevel.NORMAL:
                return {
                    "level": "normal",
                    "message": "All systems operational",
                    "recommendations": []
                }
            
            messages = {
                DegradationLevel.DEGRADED: {
                    "message": "Some features are temporarily limited due to system maintenance",
                    "recommendations": [
                        "Processing may take longer than usual",
                        "Some data may be cached and not reflect latest changes",
                        "Retry operations in a few minutes if they fail"
                    ]
                },
                DegradationLevel.CRITICAL: {
                    "message": "System is operating in minimal mode due to technical issues",
                    "recommendations": [
                        "Only essential functions are available",
                        "Processing is temporarily suspended",
                        "Please try again later or contact support"
                    ]
                },
                DegradationLevel.OFFLINE: {
                    "message": "System is temporarily unavailable for maintenance",
                    "recommendations": [
                        "Please try again in a few minutes",
                        "Contact support if the issue persists"
                    ]
                }
            }
            
            message_data = messages.get(self._state.level, {
                "message": "Unknown system state",
                "recommendations": ["Contact support"]
            })
            
            return {
                "level": self._state.level.value,
                "message": message_data["message"],
                "reason": self._state.reason,
                "started_at": self._state.started_at,
                "duration": (datetime.now(timezone.utc) - self._state.started_at).total_seconds(),
                "recommendations": message_data["recommendations"],
                "affected_operations": self._state.affected_operations
            }
    
    def get_status(self) -> Dict[str, Any]:
        """Get comprehensive degradation system status"""
        with self._lock:
            return {
                "current_level": self._state.level.value,
                "reason": self._state.reason,
                "started_at": self._state.started_at,
                "duration_seconds": (datetime.now(timezone.utc) - self._state.started_at).total_seconds(),
                "affected_operations": self._state.affected_operations,
                "recovery_attempts": self._state.recovery_attempts,
                "last_recovery_attempt": self._state.last_recovery_attempt,
                "available_handlers": list(self._fallback_handlers.keys()),
                "cache_directory": str(self._cache_dir),
                "user_message": self.get_user_message()
            }


# Global degradation manager instance
degradation_manager = DegradationManager()


def get_degradation_manager() -> DegradationManager:
    """Get the global degradation manager instance"""
    return degradation_manager


def handle_database_failure(operation: str, session_id: str = None, **kwargs) -> Dict[str, Any]:
    """
    Handle database failure with appropriate degradation strategy
    
    Args:
        operation: Type of operation that failed
        session_id: Session ID if applicable
        **kwargs: Additional parameters
        
    Returns:
        Fallback response
    """
    logger.warning(f"Handling database failure for operation: {operation}")
    
    # Set appropriate degradation level if not already degraded
    if degradation_manager.state.level == DegradationLevel.NORMAL:
        degradation_manager.set_degradation_level(
            DegradationLevel.DEGRADED,
            f"Database failure in {operation} operation",
            [operation]
        )
    
    # Get fallback handler
    handler = degradation_manager.get_fallback_handler(operation)
    if handler:
        return handler(session_id=session_id, **kwargs)
    
    # Default fallback
    return {
        "status": "service_degraded",
        "message": f"The {operation} service is temporarily unavailable",
        "fallback": True,
        "retry_after": 300
    }