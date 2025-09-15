"""
Circuit breaker pattern implementation for database resilience

This module provides circuit breaker functionality to prevent cascading failures
when database operations encounter persistent issues.
"""

import logging
import time
import threading
from enum import Enum
from dataclasses import dataclass, field
from typing import Dict, Callable, Any, Optional
from datetime import datetime, timezone
from contextlib import contextmanager

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"         # Failures detected, blocking requests
    HALF_OPEN = "half_open"  # Testing if service has recovered


@dataclass
class CircuitMetrics:
    """Metrics tracking for circuit breaker"""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    consecutive_failures: int = 0
    consecutive_successes: int = 0
    last_failure_time: Optional[datetime] = None
    last_success_time: Optional[datetime] = None
    state_changed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class CircuitBreaker:
    """
    Circuit breaker implementation for database operations
    
    Provides automatic failure detection and recovery with configurable thresholds.
    """
    
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: int = 30,
        success_threshold: int = 2,
        timeout: int = 60
    ):
        """
        Initialize circuit breaker
        
        Args:
            name: Unique name for this circuit breaker
            failure_threshold: Number of consecutive failures to trigger OPEN state
            recovery_timeout: Seconds to wait before attempting recovery
            success_threshold: Consecutive successes needed to close circuit
            timeout: Maximum time to wait for operations
        """
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.success_threshold = success_threshold
        self.timeout = timeout
        
        self._state = CircuitState.CLOSED
        self._metrics = CircuitMetrics()
        self._lock = threading.RLock()
        
        logger.info(f"Circuit breaker '{name}' initialized: "
                   f"failure_threshold={failure_threshold}, "
                   f"recovery_timeout={recovery_timeout}s, "
                   f"success_threshold={success_threshold}")
    
    @property
    def state(self) -> CircuitState:
        """Get current circuit state"""
        with self._lock:
            return self._state
    
    @property
    def metrics(self) -> CircuitMetrics:
        """Get current circuit metrics"""
        with self._lock:
            return self._metrics
    
    def _transition_to_open(self):
        """Transition circuit to OPEN state"""
        with self._lock:
            if self._state != CircuitState.OPEN:
                old_state = self._state
                self._state = CircuitState.OPEN
                self._metrics.state_changed_at = datetime.now(timezone.utc)
                logger.warning(f"Circuit breaker '{self.name}' transitioned from {old_state.value} to OPEN "
                             f"after {self._metrics.consecutive_failures} consecutive failures")
    
    def _transition_to_half_open(self):
        """Transition circuit to HALF_OPEN state"""
        with self._lock:
            if self._state == CircuitState.OPEN:
                self._state = CircuitState.HALF_OPEN
                self._metrics.state_changed_at = datetime.now(timezone.utc)
                self._metrics.consecutive_successes = 0
                logger.info(f"Circuit breaker '{self.name}' transitioned to HALF_OPEN for recovery testing")
    
    def _transition_to_closed(self):
        """Transition circuit to CLOSED state"""
        with self._lock:
            if self._state != CircuitState.CLOSED:
                old_state = self._state
                self._state = CircuitState.CLOSED
                self._metrics.state_changed_at = datetime.now(timezone.utc)
                self._metrics.consecutive_failures = 0
                logger.info(f"Circuit breaker '{self.name}' transitioned from {old_state.value} to CLOSED "
                           f"after {self._metrics.consecutive_successes} consecutive successes")
    
    def _should_attempt_recovery(self) -> bool:
        """Check if recovery should be attempted"""
        with self._lock:
            if self._state != CircuitState.OPEN:
                return False
            
            if self._metrics.last_failure_time is None:
                return True
            
            time_since_failure = (datetime.now(timezone.utc) - self._metrics.last_failure_time).total_seconds()
            return time_since_failure >= self.recovery_timeout
    
    def _record_success(self):
        """Record successful operation"""
        with self._lock:
            self._metrics.total_requests += 1
            self._metrics.successful_requests += 1
            self._metrics.consecutive_successes += 1
            self._metrics.consecutive_failures = 0
            self._metrics.last_success_time = datetime.now(timezone.utc)
            
            # Check for state transitions
            if self._state == CircuitState.HALF_OPEN:
                if self._metrics.consecutive_successes >= self.success_threshold:
                    self._transition_to_closed()
    
    def _record_failure(self, exception: Exception):
        """Record failed operation"""
        with self._lock:
            self._metrics.total_requests += 1
            self._metrics.failed_requests += 1
            self._metrics.consecutive_failures += 1
            self._metrics.consecutive_successes = 0
            self._metrics.last_failure_time = datetime.now(timezone.utc)
            
            # Check for state transitions
            if self._state == CircuitState.CLOSED:
                if self._metrics.consecutive_failures >= self.failure_threshold:
                    self._transition_to_open()
            elif self._state == CircuitState.HALF_OPEN:
                self._transition_to_open()
    
    def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute function through circuit breaker
        
        Args:
            func: Function to execute
            *args: Positional arguments for function
            **kwargs: Keyword arguments for function
            
        Returns:
            Result of function call
            
        Raises:
            CircuitBreakerOpenException: When circuit is open
            Original exception: When function fails
        """
        # Atomically check state and decide on recovery
        should_execute = False
        with self._lock:
            if self._state == CircuitState.OPEN:
                # Check if we should attempt recovery while holding the lock
                if self._metrics.last_failure_time is None:
                    should_attempt_recovery = True
                else:
                    time_since_failure = (datetime.now(timezone.utc) - self._metrics.last_failure_time).total_seconds()
                    should_attempt_recovery = time_since_failure >= self.recovery_timeout
                
                if not should_attempt_recovery:
                    raise CircuitBreakerOpenException(f"Circuit breaker '{self.name}' is OPEN")
                else:
                    # Transition to half-open while holding lock
                    self._transition_to_half_open()
                    should_execute = True
            else:
                should_execute = True
        
        # Execute function outside the lock to avoid holding it during function execution
        if should_execute:
            try:
                result = func(*args, **kwargs)
                self._record_success()
                return result
                
            except Exception as e:
                self._record_failure(e)
                raise
    
    @contextmanager
    def protect(self):
        """
        Context manager for circuit breaker protection
        
        Yields:
            None - execute protected code within context
            
        Raises:
            CircuitBreakerOpenException: When circuit is open
        """
        # Atomically check state and decide on recovery
        should_execute = False
        with self._lock:
            if self._state == CircuitState.OPEN:
                # Check if we should attempt recovery while holding the lock
                if self._metrics.last_failure_time is None:
                    should_attempt_recovery = True
                else:
                    time_since_failure = (datetime.now(timezone.utc) - self._metrics.last_failure_time).total_seconds()
                    should_attempt_recovery = time_since_failure >= self.recovery_timeout
                
                if not should_attempt_recovery:
                    raise CircuitBreakerOpenException(f"Circuit breaker '{self.name}' is OPEN")
                else:
                    # Transition to half-open while holding lock
                    self._transition_to_half_open()
                    should_execute = True
            else:
                should_execute = True
        
        # Execute protected code outside the lock
        if should_execute:
            try:
                yield
                self._record_success()
                
            except Exception as e:
                self._record_failure(e)
                raise
    
    def reset(self):
        """Reset circuit breaker to initial state"""
        with self._lock:
            old_state = self._state
            self._state = CircuitState.CLOSED
            self._metrics = CircuitMetrics()
            logger.info(f"Circuit breaker '{self.name}' reset from {old_state.value} to CLOSED")
    
    def get_status(self) -> Dict[str, Any]:
        """Get comprehensive circuit breaker status"""
        with self._lock:
            return {
                "name": self.name,
                "state": self._state.value,
                "config": {
                    "failure_threshold": self.failure_threshold,
                    "recovery_timeout": self.recovery_timeout,
                    "success_threshold": self.success_threshold,
                    "timeout": self.timeout
                },
                "metrics": {
                    "total_requests": self._metrics.total_requests,
                    "successful_requests": self._metrics.successful_requests,
                    "failed_requests": self._metrics.failed_requests,
                    "success_rate": (
                        self._metrics.successful_requests / self._metrics.total_requests 
                        if self._metrics.total_requests > 0 else 0
                    ),
                    "consecutive_failures": self._metrics.consecutive_failures,
                    "consecutive_successes": self._metrics.consecutive_successes,
                    "last_failure_time": self._metrics.last_failure_time,
                    "last_success_time": self._metrics.last_success_time,
                    "state_changed_at": self._metrics.state_changed_at,
                    "uptime_seconds": (
                        datetime.now(timezone.utc) - self._metrics.state_changed_at
                    ).total_seconds()
                }
            }


class CircuitBreakerOpenException(Exception):
    """Exception raised when circuit breaker is open"""
    pass


# Global circuit breakers for database operations
_circuit_breakers: Dict[str, CircuitBreaker] = {}
_circuit_breaker_lock = threading.Lock()


def get_circuit_breaker(name: str, **kwargs) -> CircuitBreaker:
    """
    Get or create a circuit breaker
    
    Args:
        name: Circuit breaker name
        **kwargs: Configuration parameters for new circuit breakers
        
    Returns:
        CircuitBreaker instance
    """
    with _circuit_breaker_lock:
        if name not in _circuit_breakers:
            _circuit_breakers[name] = CircuitBreaker(name, **kwargs)
        return _circuit_breakers[name]


def get_all_circuit_breakers() -> Dict[str, CircuitBreaker]:
    """Get all circuit breakers"""
    with _circuit_breaker_lock:
        return _circuit_breakers.copy()


def reset_all_circuit_breakers():
    """Reset all circuit breakers"""
    with _circuit_breaker_lock:
        for breaker in _circuit_breakers.values():
            breaker.reset()
        logger.info("All circuit breakers have been reset")


# Pre-configured circuit breakers for common database operations
DATABASE_CIRCUIT_BREAKER = get_circuit_breaker(
    "database",
    failure_threshold=5,
    recovery_timeout=30,
    success_threshold=2,
    timeout=60
)

PROCESSING_CIRCUIT_BREAKER = get_circuit_breaker(
    "processing",
    failure_threshold=3,
    recovery_timeout=60,
    success_threshold=2,
    timeout=120
)

STATUS_UPDATE_CIRCUIT_BREAKER = get_circuit_breaker(
    "status_updates",
    failure_threshold=10,
    recovery_timeout=15,
    success_threshold=3,
    timeout=30
)

EXPORT_CIRCUIT_BREAKER = get_circuit_breaker(
    "exports",
    failure_threshold=5,
    recovery_timeout=45,
    success_threshold=2,
    timeout=90
)


def get_circuit_breaker_status() -> Dict[str, Any]:
    """Get status of all circuit breakers"""
    with _circuit_breaker_lock:
        return {
            name: breaker.get_status()
            for name, breaker in _circuit_breakers.items()
        }