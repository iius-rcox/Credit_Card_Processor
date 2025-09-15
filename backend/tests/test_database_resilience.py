"""
Unit tests for database resilience systems

Tests for circuit breaker, graceful degradation, and consistency frameworks
"""

import pytest
import time
import threading
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone

from app.resilience import (
    CircuitBreaker, CircuitState, CircuitBreakerOpenException, 
    get_circuit_breaker, reset_all_circuit_breakers
)
from app.degradation import (
    DegradationManager, DegradationLevel, get_degradation_manager,
    handle_database_failure
)
from app.consistency import (
    ConsistencyManager, ProcessingCheckpoint, ValidationResult,
    get_consistency_manager, validate_and_checkpoint
)
from app.database import (
    create_isolated_session, safe_commit, atomic_transaction,
    perform_health_check, get_connection_metrics, get_session_metrics
)


class TestCircuitBreaker:
    """Test circuit breaker functionality"""
    
    def setup_method(self):
        """Reset circuit breakers before each test"""
        reset_all_circuit_breakers()
    
    def test_circuit_breaker_initialization(self):
        """Test circuit breaker creation and configuration"""
        breaker = CircuitBreaker(
            name="test_breaker",
            failure_threshold=3,
            recovery_timeout=10,
            success_threshold=2
        )
        
        assert breaker.name == "test_breaker"
        assert breaker.failure_threshold == 3
        assert breaker.recovery_timeout == 10
        assert breaker.success_threshold == 2
        assert breaker.state == CircuitState.CLOSED
        
    def test_circuit_breaker_successful_operation(self):
        """Test circuit breaker with successful operations"""
        breaker = CircuitBreaker("test_success", failure_threshold=3)
        
        def successful_operation():
            return "success"
        
        result = breaker.call(successful_operation)
        assert result == "success"
        assert breaker.state == CircuitState.CLOSED
        assert breaker.metrics.successful_requests == 1
        assert breaker.metrics.failed_requests == 0
        
    def test_circuit_breaker_failure_threshold(self):
        """Test circuit breaker opening after failure threshold"""
        breaker = CircuitBreaker("test_failures", failure_threshold=3)
        
        def failing_operation():
            raise Exception("Test failure")
        
        # Trigger failures up to threshold
        for i in range(3):
            with pytest.raises(Exception):
                breaker.call(failing_operation)
            
            if i < 2:
                assert breaker.state == CircuitState.CLOSED
            else:
                assert breaker.state == CircuitState.OPEN
        
        # Next call should raise CircuitBreakerOpenException
        with pytest.raises(CircuitBreakerOpenException):
            breaker.call(failing_operation)
    
    def test_circuit_breaker_recovery_timeout(self):
        """Test circuit breaker recovery after timeout"""
        breaker = CircuitBreaker("test_recovery", failure_threshold=2, recovery_timeout=0.1)
        
        def failing_operation():
            raise Exception("Test failure")
        
        def successful_operation():
            return "success"
        
        # Trigger failures to open circuit
        for _ in range(2):
            with pytest.raises(Exception):
                breaker.call(failing_operation)
        
        assert breaker.state == CircuitState.OPEN
        
        # Wait for recovery timeout
        time.sleep(0.2)
        
        # Should transition to HALF_OPEN on next call
        result = breaker.call(successful_operation)
        assert result == "success"
        assert breaker.state == CircuitState.HALF_OPEN
        
    def test_circuit_breaker_half_open_to_closed(self):
        """Test circuit breaker closing after successful recovery"""
        breaker = CircuitBreaker("test_close", failure_threshold=2, success_threshold=2, recovery_timeout=0.1)
        
        def failing_operation():
            raise Exception("Test failure")
        
        def successful_operation():
            return "success"
        
        # Open the circuit
        for _ in range(2):
            with pytest.raises(Exception):
                breaker.call(failing_operation)
        
        # Wait and recover
        time.sleep(0.2)
        
        # Two successful calls should close the circuit
        breaker.call(successful_operation)
        assert breaker.state == CircuitState.HALF_OPEN
        
        breaker.call(successful_operation)
        assert breaker.state == CircuitState.CLOSED
        
    def test_circuit_breaker_context_manager(self):
        """Test circuit breaker as context manager"""
        breaker = CircuitBreaker("test_context", failure_threshold=2)
        
        # Successful operation
        with breaker.protect():
            result = "context_success"
        
        assert breaker.metrics.successful_requests == 1
        
        # Failed operation
        with pytest.raises(Exception):
            with breaker.protect():
                raise Exception("Context failure")
        
        assert breaker.metrics.failed_requests == 1
    
    def test_concurrent_circuit_breaker_access(self):
        """Test circuit breaker thread safety"""
        breaker = CircuitBreaker("test_concurrent", failure_threshold=10)
        results = []
        
        def worker():
            try:
                result = breaker.call(lambda: "success")
                results.append(result)
            except Exception as e:
                results.append(str(e))
        
        # Start multiple threads
        threads = [threading.Thread(target=worker) for _ in range(10)]
        for thread in threads:
            thread.start()
        
        for thread in threads:
            thread.join()
        
        # All should succeed
        assert len(results) == 10
        assert all(r == "success" for r in results)
        assert breaker.metrics.successful_requests == 10


class TestDegradationManager:
    """Test graceful degradation system"""
    
    def setup_method(self):
        """Reset degradation manager before each test"""
        self.degradation_manager = DegradationManager()
    
    def test_degradation_manager_initialization(self):
        """Test degradation manager creation"""
        assert self.degradation_manager.state.level == DegradationLevel.NORMAL
        assert len(self.degradation_manager._fallback_handlers) > 0
        assert "processing" in self.degradation_manager._fallback_handlers
        
    def test_set_degradation_level(self):
        """Test setting degradation levels"""
        self.degradation_manager.set_degradation_level(
            DegradationLevel.DEGRADED,
            "Test degradation",
            ["processing", "exports"]
        )
        
        assert self.degradation_manager.state.level == DegradationLevel.DEGRADED
        assert self.degradation_manager.state.reason == "Test degradation"
        assert "processing" in self.degradation_manager.state.affected_operations
        assert "exports" in self.degradation_manager.state.affected_operations
        
    def test_operation_affected_check(self):
        """Test checking if operations are affected"""
        # Normal state - nothing affected
        assert not self.degradation_manager.is_operation_affected("processing")
        
        # Set degraded state
        self.degradation_manager.set_degradation_level(
            DegradationLevel.DEGRADED,
            "Test",
            ["processing"]
        )
        
        assert self.degradation_manager.is_operation_affected("processing")
        assert not self.degradation_manager.is_operation_affected("exports")
        
    def test_fallback_handlers(self):
        """Test fallback handler execution"""
        # Set degraded state
        self.degradation_manager.set_degradation_level(
            DegradationLevel.DEGRADED,
            "Test",
            ["processing"]
        )
        
        # Get processing fallback
        handler = self.degradation_manager.get_fallback_handler("processing")
        assert handler is not None
        
        # Execute fallback
        result = handler("test_session_123")
        assert result["status"] == "processing_delayed"
        assert result["session_id"] == "test_session_123"
        assert result["fallback"] is True
        
    def test_cache_operations(self):
        """Test data caching for fallbacks"""
        test_data = {"employee_count": 50, "status": "completed"}
        
        # Cache data
        self.degradation_manager.cache_data("test_key", test_data, ttl=3600)
        
        # Retrieve cached data
        cached = self.degradation_manager.get_cached_data("test_key")
        assert cached == test_data
        
        # Test non-existent key
        assert self.degradation_manager.get_cached_data("non_existent") is None
        
    def test_recovery_attempt(self):
        """Test degradation recovery"""
        # Set degraded state
        self.degradation_manager.set_degradation_level(
            DegradationLevel.DEGRADED,
            "Test",
            ["processing"]
        )
        
        # Mock successful health check
        with patch('app.database.perform_health_check') as mock_health:
            mock_health.return_value = {"status": "healthy"}
            
            result = self.degradation_manager.attempt_recovery()
            assert result is True
            assert self.degradation_manager.state.level == DegradationLevel.NORMAL
    
    def test_user_message_generation(self):
        """Test user-friendly message generation"""
        # Normal state
        message = self.degradation_manager.get_user_message()
        assert message["level"] == "normal"
        assert message["message"] == "All systems operational"
        
        # Degraded state
        self.degradation_manager.set_degradation_level(
            DegradationLevel.DEGRADED,
            "Database issues",
            ["processing"]
        )
        
        message = self.degradation_manager.get_user_message()
        assert message["level"] == "degraded"
        assert "limited" in message["message"].lower()
        assert len(message["recommendations"]) > 0


class TestConsistencyManager:
    """Test data consistency framework"""
    
    def setup_method(self):
        """Setup consistency manager for tests"""
        self.consistency_manager = ConsistencyManager()
        
    def test_consistency_manager_initialization(self):
        """Test consistency manager creation"""
        assert self.consistency_manager.checkpoint_dir.exists()
        assert "required_fields" in self.consistency_manager.validation_rules
        assert "numeric_fields" in self.consistency_manager.validation_rules
        
    def test_batch_data_validation(self):
        """Test employee data validation"""
        # Valid data
        valid_data = [
            {
                "employee_name": "John Doe",
                "car_amount": 100.50,
                "receipt_amount": 100.50
            },
            {
                "employee_name": "Jane Smith", 
                "car_amount": 75.25,
                "receipt_amount": 75.00
            }
        ]
        
        result = self.consistency_manager.validate_batch_data(valid_data)
        assert result.is_valid
        assert len(result.errors) == 0
        assert result.metadata["batch_size"] == 2
        
    def test_batch_data_validation_errors(self):
        """Test validation with errors"""
        invalid_data = [
            {
                # Missing employee_name
                "car_amount": 100.50,
                "receipt_amount": 100.50
            },
            {
                "employee_name": "Jane Smith",
                "car_amount": "invalid_amount",  # Invalid numeric
                "receipt_amount": -2000.00  # Unreasonably negative
            }
        ]
        
        result = self.consistency_manager.validate_batch_data(invalid_data)
        assert not result.is_valid
        assert len(result.errors) >= 2
        assert any("Missing required field" in error for error in result.errors)
        assert any("Invalid numeric value" in error for error in result.errors)
        
    def test_checkpoint_creation(self):
        """Test checkpoint creation and storage"""
        employee_data = [
            {"employee_name": "Test Employee", "car_amount": 100.0, "receipt_amount": 100.0}
        ]
        
        checkpoint = self.consistency_manager.create_checkpoint(
            session_id="test_session",
            batch_number=1,
            processed_count=5,
            total_count=10,
            employee_data=employee_data
        )
        
        assert checkpoint.session_id == "test_session"
        assert checkpoint.batch_number == 1
        assert checkpoint.processed_count == 5
        assert checkpoint.total_count == 10
        assert len(checkpoint.employee_data) == 1
        assert checkpoint.validation_hash is not None
        
    def test_checkpoint_retrieval(self):
        """Test checkpoint retrieval"""
        session_id = "test_session_retrieve"
        employee_data = [{"employee_name": "Test", "car_amount": 50.0}]
        
        # Create checkpoint
        checkpoint = self.consistency_manager.create_checkpoint(
            session_id=session_id,
            batch_number=3,
            processed_count=15,
            total_count=20,
            employee_data=employee_data
        )
        
        # Retrieve latest checkpoint
        retrieved = self.consistency_manager.get_latest_checkpoint(session_id)
        assert retrieved is not None
        assert retrieved.checkpoint_id == checkpoint.checkpoint_id
        assert retrieved.batch_number == 3
        assert retrieved.processed_count == 15
        
    def test_checkpoint_cleanup(self):
        """Test checkpoint cleanup functionality"""
        session_id = "test_cleanup"
        employee_data = [{"employee_name": "Test", "car_amount": 25.0}]
        
        # Create multiple checkpoints
        checkpoints = []
        for i in range(5):
            checkpoint = self.consistency_manager.create_checkpoint(
                session_id=session_id,
                batch_number=i + 1,
                processed_count=i * 5,
                total_count=25,
                employee_data=employee_data
            )
            checkpoints.append(checkpoint)
        
        # Cleanup, keeping only 2
        self.consistency_manager.cleanup_checkpoints(session_id, keep_latest=2)
        
        # Should still be able to retrieve latest
        latest = self.consistency_manager.get_latest_checkpoint(session_id)
        assert latest is not None
        assert latest.batch_number == 5
        
    def test_recovery_preparation(self):
        """Test recovery data preparation"""
        session_id = "test_recovery"
        employee_data = [{"employee_name": "Recovery Test", "car_amount": 75.0}]
        
        checkpoint = self.consistency_manager.create_checkpoint(
            session_id=session_id,
            batch_number=2,
            processed_count=10,
            total_count=20,
            employee_data=employee_data
        )
        
        recovery_info = self.consistency_manager.recover_from_checkpoint(checkpoint)
        assert recovery_info["success"] is True
        assert recovery_info["session_id"] == session_id
        assert recovery_info["resume_from_batch"] == 3
        assert recovery_info["processed_count"] == 10
        assert recovery_info["remaining_count"] == 10


class TestDatabaseEnhancements:
    """Test database connection and session enhancements"""
    
    @patch('app.database.engine')
    def test_health_check_success(self, mock_engine):
        """Test successful database health check"""
        mock_connection = Mock()
        mock_connection.execute.return_value.scalar.return_value = 1
        mock_engine.connect.return_value.__enter__.return_value = mock_connection
        
        mock_pool = Mock()
        mock_pool.size.return_value = 10
        mock_pool.checkedin.return_value = 8
        mock_pool.checkedout.return_value = 2
        mock_pool.overflow.return_value = 0
        mock_pool.invalid.return_value = 0
        mock_engine.pool = mock_pool
        
        result = perform_health_check()
        assert result["status"] == "healthy"
        assert "connection_time_ms" in result["details"]
        assert result["metrics"]["pool_size"] == 10
        
    @patch('app.database.engine')
    def test_health_check_failure(self, mock_engine):
        """Test failed database health check"""
        mock_engine.connect.side_effect = Exception("Connection failed")
        
        result = perform_health_check()
        assert result["status"] == "unhealthy"
        assert "error" in result["details"]
        assert "Connection failed" in result["details"]["error"]
        
    def test_connection_metrics_tracking(self):
        """Test connection metrics are properly tracked"""
        metrics = get_connection_metrics()
        assert "active_connections" in metrics
        assert "total_connections" in metrics
        assert "failed_connections" in metrics
        assert "health_status" in metrics
        
    def test_session_metrics_tracking(self):
        """Test session metrics are properly tracked"""
        metrics = get_session_metrics()
        assert "total_sessions_created" in metrics
        assert "active_session_count" in metrics
        assert "session_timeouts" in metrics
        assert "active_sessions" in metrics


class TestIntegrationScenarios:
    """Integration tests combining multiple resilience systems"""
    
    def test_database_failure_handling_flow(self):
        """Test complete database failure handling flow"""
        # Simulate database failure
        result = handle_database_failure("processing", "test_session_123")
        
        assert result["status"] == "processing_delayed"
        assert result["fallback"] is True
        assert result["session_id"] == "test_session_123"
        
        # Check degradation manager state
        manager = get_degradation_manager()
        assert manager.state.level == DegradationLevel.DEGRADED
        assert "processing" in manager.state.affected_operations
        
    def test_validate_and_checkpoint_integration(self):
        """Test validation and checkpoint creation integration"""
        session_id = "integration_test"
        employee_data = [
            {"employee_name": "Integration Test", "car_amount": 150.0, "receipt_amount": 150.0}
        ]
        
        validation_result, checkpoint = validate_and_checkpoint(
            session_id=session_id,
            batch_number=1,
            processed_count=1,
            total_count=10,
            employee_data=employee_data
        )
        
        assert validation_result.is_valid
        assert checkpoint is not None
        assert checkpoint.session_id == session_id
        assert checkpoint.batch_number == 1
        
    def test_circuit_breaker_with_degradation(self):
        """Test circuit breaker triggering degradation"""
        breaker = get_circuit_breaker("test_integration", failure_threshold=2)
        
        def failing_operation():
            raise Exception("Simulated database failure")
        
        # Trigger circuit breaker
        for _ in range(2):
            with pytest.raises(Exception):
                breaker.call(failing_operation)
        
        assert breaker.state == CircuitState.OPEN
        
        # Test that subsequent calls trigger degradation handling
        with pytest.raises(CircuitBreakerOpenException):
            breaker.call(failing_operation)


@pytest.fixture
def cleanup_test_files():
    """Clean up test files after tests"""
    yield
    
    # Cleanup any test checkpoints and cache files
    import shutil
    from pathlib import Path
    from app.config import settings
    
    test_dirs = [
        Path(settings.upload_path).parent / "checkpoints",
        Path(settings.upload_path).parent / "cache"
    ]
    
    for test_dir in test_dirs:
        if test_dir.exists():
            for file in test_dir.glob("*test*"):
                try:
                    if file.is_file():
                        file.unlink()
                    elif file.is_dir():
                        shutil.rmtree(file)
                except:
                    pass  # Ignore cleanup errors


# Run integration tests with cleanup
pytestmark = pytest.mark.usefixtures("cleanup_test_files")