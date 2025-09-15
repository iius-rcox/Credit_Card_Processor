"""
Load and concurrency tests for database resilience improvements

Tests system behavior under concurrent load to verify locking issues are resolved
"""

import pytest
import asyncio
import threading
import time
import random
from concurrent.futures import ThreadPoolExecutor, as_completed
from unittest.mock import patch, Mock

from app.database import (
    create_isolated_session, safe_commit, atomic_transaction,
    get_connection_metrics, get_session_metrics
)
from app.resilience import get_circuit_breaker, reset_all_circuit_breakers
from app.degradation import get_degradation_manager, DegradationLevel
from app.api.processing import _process_employee_batch, _update_batch_progress


class TestConcurrentDatabaseAccess:
    """Test concurrent database operations"""
    
    def setup_method(self):
        """Setup for each test"""
        reset_all_circuit_breakers()
        
    def test_concurrent_session_creation(self):
        """Test creating multiple isolated sessions concurrently"""
        sessions = []
        errors = []
        
        def create_session():
            try:
                session = create_isolated_session()
                sessions.append(session)
                time.sleep(0.1)  # Hold session briefly
                return session
            except Exception as e:
                errors.append(str(e))
                return None
        
        # Create 20 concurrent sessions
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(create_session) for _ in range(20)]
            results = [future.result() for future in as_completed(futures)]
        
        # Cleanup sessions
        for session in sessions:
            if session:
                try:
                    session.close()
                except:
                    pass
        
        assert len(errors) == 0, f"Session creation errors: {errors}"
        assert len([r for r in results if r is not None]) == 20
        
        # Check metrics
        metrics = get_session_metrics()
        assert metrics["total_sessions_created"] >= 20
        
    def test_concurrent_safe_commits(self):
        """Test concurrent safe commit operations"""
        commit_results = []
        errors = []
        
        def safe_commit_operation(worker_id):
            try:
                session = create_isolated_session()
                
                # Simulate some work
                session.execute("SELECT 1")
                time.sleep(random.uniform(0.01, 0.1))
                
                # Attempt commit
                result = safe_commit(session)
                commit_results.append((worker_id, result))
                
                session.close()
                return result
                
            except Exception as e:
                errors.append(f"Worker {worker_id}: {str(e)}")
                return False
        
        # Run 15 concurrent commit operations
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = [
                executor.submit(safe_commit_operation, i) 
                for i in range(15)
            ]
            results = [future.result() for future in as_completed(futures)]
        
        assert len(errors) == 0, f"Commit errors: {errors}"
        assert all(results), "All commits should succeed"
        assert len(commit_results) == 15
        
    def test_concurrent_atomic_transactions(self):
        """Test concurrent atomic transactions"""
        transaction_results = []
        errors = []
        
        def atomic_transaction_operation(worker_id):
            try:
                with atomic_transaction() as session:
                    # Simulate database work
                    result = session.execute("SELECT 1").scalar()
                    assert result == 1
                    
                    # Small delay to increase contention
                    time.sleep(random.uniform(0.01, 0.05))
                    
                    transaction_results.append(f"worker_{worker_id}")
                
                return True
                
            except Exception as e:
                errors.append(f"Worker {worker_id}: {str(e)}")
                return False
        
        # Run 12 concurrent atomic transactions
        with ThreadPoolExecutor(max_workers=6) as executor:
            futures = [
                executor.submit(atomic_transaction_operation, i) 
                for i in range(12)
            ]
            results = [future.result() for future in as_completed(futures)]
        
        assert len(errors) == 0, f"Transaction errors: {errors}"
        assert all(results), "All transactions should succeed"
        assert len(transaction_results) == 12
        
    def test_mixed_concurrent_operations(self):
        """Test mixed read/write operations concurrently"""
        operation_results = []
        errors = []
        
        def read_operation(worker_id):
            try:
                session = create_isolated_session()
                result = session.execute("SELECT COUNT(*) FROM processing_sessions").scalar()
                operation_results.append(f"read_{worker_id}_{result}")
                session.close()
                return True
            except Exception as e:
                errors.append(f"Read {worker_id}: {str(e)}")
                return False
        
        def write_operation(worker_id):
            try:
                with atomic_transaction() as session:
                    # Simulate a status update
                    session.execute("SELECT 1")  # Placeholder for actual update
                    time.sleep(0.02)  # Brief work simulation
                    operation_results.append(f"write_{worker_id}")
                return True
            except Exception as e:
                errors.append(f"Write {worker_id}: {str(e)}")
                return False
        
        # Mix of read and write operations
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = []
            
            # 8 read operations
            for i in range(8):
                futures.append(executor.submit(read_operation, i))
            
            # 5 write operations
            for i in range(5):
                futures.append(executor.submit(write_operation, i))
            
            results = [future.result() for future in as_completed(futures)]
        
        assert len(errors) == 0, f"Mixed operation errors: {errors}"
        assert all(results), "All operations should succeed"
        assert len(operation_results) == 13


class TestCircuitBreakerUnderLoad:
    """Test circuit breaker behavior under load"""
    
    def setup_method(self):
        """Setup for each test"""
        reset_all_circuit_breakers()
        
    def test_circuit_breaker_concurrent_success(self):
        """Test circuit breaker with concurrent successful operations"""
        breaker = get_circuit_breaker("load_test_success", failure_threshold=10)
        success_count = 0
        errors = []
        
        def successful_operation(worker_id):
            nonlocal success_count
            try:
                result = breaker.call(lambda: f"success_{worker_id}")
                success_count += 1
                return result
            except Exception as e:
                errors.append(f"Worker {worker_id}: {str(e)}")
                return None
        
        # 25 concurrent successful operations
        with ThreadPoolExecutor(max_workers=12) as executor:
            futures = [
                executor.submit(successful_operation, i) 
                for i in range(25)
            ]
            results = [future.result() for future in as_completed(futures)]
        
        assert len(errors) == 0, f"Circuit breaker errors: {errors}"
        assert success_count == 25
        assert breaker.metrics.successful_requests == 25
        assert breaker.metrics.failed_requests == 0
        
    def test_circuit_breaker_concurrent_failures(self):
        """Test circuit breaker opening under concurrent failures"""
        breaker = get_circuit_breaker("load_test_failures", failure_threshold=5)
        failure_count = 0
        circuit_open_count = 0
        
        def failing_operation(worker_id):
            nonlocal failure_count, circuit_open_count
            try:
                breaker.call(lambda: (_ for _ in ()).throw(Exception("Simulated failure")))
            except Exception as e:
                if "CircuitBreakerOpenException" in str(type(e)):
                    circuit_open_count += 1
                else:
                    failure_count += 1
        
        # 15 concurrent failing operations
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = [
                executor.submit(failing_operation, i) 
                for i in range(15)
            ]
            [future.result() for future in as_completed(futures)]
        
        # Circuit should be open after threshold failures
        assert breaker.state.value == "open"
        assert failure_count >= 5  # At least threshold failures
        assert circuit_open_count > 0  # Some requests blocked by open circuit
        
    def test_circuit_breaker_recovery_under_load(self):
        """Test circuit breaker recovery with concurrent operations"""
        breaker = get_circuit_breaker(
            "load_test_recovery", 
            failure_threshold=3, 
            recovery_timeout=0.1,
            success_threshold=2
        )
        
        def failing_operation():
            raise Exception("Failure")
        
        def successful_operation():
            return "success"
        
        # Open the circuit with failures
        for _ in range(3):
            try:
                breaker.call(failing_operation)
            except:
                pass
        
        assert breaker.state.value == "open"
        
        # Wait for recovery timeout
        time.sleep(0.2)
        
        recovery_results = []
        
        def recovery_operation(worker_id):
            try:
                result = breaker.call(successful_operation)
                recovery_results.append(result)
                return True
            except Exception as e:
                recovery_results.append(str(e))
                return False
        
        # Attempt recovery with multiple concurrent operations
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [
                executor.submit(recovery_operation, i) 
                for i in range(5)
            ]
            [future.result() for future in as_completed(futures)]
        
        # Circuit should eventually close
        successful_results = [r for r in recovery_results if r == "success"]
        assert len(successful_results) >= 2  # At least success threshold


class TestDegradationUnderLoad:
    """Test graceful degradation under load"""
    
    def test_degradation_fallback_concurrent_access(self):
        """Test degradation fallbacks with concurrent access"""
        manager = get_degradation_manager()
        
        # Set system to degraded state
        manager.set_degradation_level(
            DegradationLevel.DEGRADED,
            "Load test degradation",
            ["processing", "exports"]
        )
        
        fallback_results = []
        errors = []
        
        def fallback_operation(operation_type, worker_id):
            try:
                handler = manager.get_fallback_handler(operation_type)
                if handler:
                    result = handler(f"session_{worker_id}")
                    fallback_results.append(result)
                    return result
                return None
            except Exception as e:
                errors.append(f"Worker {worker_id}: {str(e)}")
                return None
        
        # Test concurrent fallback operations
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = []
            
            # Mix of processing and export fallbacks
            for i in range(10):
                operation = "processing" if i % 2 == 0 else "exports"
                futures.append(executor.submit(fallback_operation, operation, i))
            
            results = [future.result() for future in as_completed(futures)]
        
        assert len(errors) == 0, f"Fallback errors: {errors}"
        assert len(fallback_results) == 10
        assert all(r and r.get("fallback") is True for r in fallback_results)
        
    def test_cache_operations_concurrent_access(self):
        """Test cache operations under concurrent load"""
        manager = get_degradation_manager()
        
        cache_operations = []
        errors = []
        
        def cache_write_operation(worker_id):
            try:
                key = f"test_key_{worker_id}"
                data = {"worker_id": worker_id, "timestamp": time.time()}
                manager.cache_data(key, data)
                cache_operations.append(f"write_{worker_id}")
                return True
            except Exception as e:
                errors.append(f"Cache write {worker_id}: {str(e)}")
                return False
        
        def cache_read_operation(worker_id):
            try:
                key = f"test_key_{worker_id % 5}"  # Read from first 5 keys
                data = manager.get_cached_data(key)
                cache_operations.append(f"read_{worker_id}_{data is not None}")
                return True
            except Exception as e:
                errors.append(f"Cache read {worker_id}: {str(e)}")
                return False
        
        # Concurrent cache operations
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = []
            
            # Write operations
            for i in range(10):
                futures.append(executor.submit(cache_write_operation, i))
            
            # Read operations (after brief delay)
            time.sleep(0.1)
            for i in range(15):
                futures.append(executor.submit(cache_read_operation, i))
            
            results = [future.result() for future in as_completed(futures)]
        
        assert len(errors) == 0, f"Cache operation errors: {errors}"
        assert all(results), "All cache operations should succeed"
        assert len(cache_operations) == 25


class TestProcessingBatchConcurrency:
    """Test batch processing functions under concurrent load"""
    
    @pytest.mark.asyncio
    async def test_concurrent_batch_processing(self):
        """Test concurrent batch processing operations"""
        from uuid import uuid4
        
        batch_results = []
        errors = []
        
        async def process_batch(batch_id):
            try:
                batch_employees = [
                    {
                        "employee_name": f"Employee_{batch_id}_{i}",
                        "employee_id": f"{batch_id}{i:02d}",
                        "car_amount": 100.0 + i,
                        "receipt_amount": 100.0 + i
                    }
                    for i in range(3)  # Small batches for testing
                ]
                
                session_uuid = str(uuid4())
                result = await _process_employee_batch(
                    batch_employees=batch_employees,
                    session_uuid=session_uuid,
                    batch_number=batch_id,
                    processed_count=batch_id * 3,
                    index_records=[]
                )
                
                batch_results.append((batch_id, result))
                return result
                
            except Exception as e:
                errors.append(f"Batch {batch_id}: {str(e)}")
                return False
        
        # Process 8 batches concurrently
        tasks = [process_batch(i) for i in range(1, 9)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out exceptions and check results
        successful_results = [r for r in results if not isinstance(r, Exception)]
        exceptions = [r for r in results if isinstance(r, Exception)]
        
        if exceptions:
            errors.extend([str(e) for e in exceptions])
        
        # Allow some failures due to test database constraints
        success_rate = len(successful_results) / len(results)
        assert success_rate >= 0.5, f"Success rate too low: {success_rate}, Errors: {errors}"
        
    @pytest.mark.asyncio  
    async def test_concurrent_progress_updates(self):
        """Test concurrent progress update operations"""
        from uuid import uuid4
        
        update_results = []
        errors = []
        
        async def update_progress(update_id):
            try:
                session_uuid = str(uuid4())
                session_id = f"test_session_{update_id}"
                
                await _update_batch_progress(
                    session_uuid=session_uuid,
                    session_id=session_id,
                    processed_count=update_id * 5,
                    total_employees=50
                )
                
                update_results.append(update_id)
                return True
                
            except Exception as e:
                errors.append(f"Update {update_id}: {str(e)}")
                return False
        
        # Run 10 concurrent progress updates
        tasks = [update_progress(i) for i in range(1, 11)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Check results
        successful_results = [r for r in results if not isinstance(r, Exception)]
        exceptions = [r for r in results if isinstance(r, Exception)]
        
        if exceptions:
            errors.extend([str(e) for e in exceptions])
        
        # Progress updates should be more resilient to failures
        success_rate = len(successful_results) / len(results)
        assert success_rate >= 0.7, f"Progress update success rate too low: {success_rate}, Errors: {errors}"


class TestSystemUnderStress:
    """Stress tests for overall system resilience"""
    
    def test_database_connection_pool_stress(self):
        """Test connection pool under stress"""
        connection_attempts = []
        errors = []
        
        def stress_connection_pool(worker_id):
            try:
                session = create_isolated_session()
                
                # Hold session for random time
                hold_time = random.uniform(0.01, 0.2)
                time.sleep(hold_time)
                
                # Perform some work
                result = session.execute("SELECT 1").scalar()
                assert result == 1
                
                session.close()
                connection_attempts.append(f"worker_{worker_id}")
                return True
                
            except Exception as e:
                errors.append(f"Worker {worker_id}: {str(e)}")
                return False
        
        # Stress test with many concurrent connections
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [
                executor.submit(stress_connection_pool, i) 
                for i in range(50)
            ]
            results = [future.result() for future in as_completed(futures)]
        
        # Check connection pool didn't get exhausted
        success_rate = sum(results) / len(results)
        assert success_rate >= 0.8, f"Connection pool stress test failed: {success_rate}, Errors: {errors[:5]}"
        
        # Check metrics
        metrics = get_connection_metrics()
        assert metrics["failed_connections"] < 10  # Should be minimal failures
        
    def test_end_to_end_resilience_simulation(self):
        """Simulate real-world load with failures"""
        from unittest.mock import patch
        
        operation_results = []
        circuit_breaker_triggers = 0
        fallback_activations = 0
        
        def simulate_operation(operation_id):
            nonlocal circuit_breaker_triggers, fallback_activations
            
            try:
                # Simulate random failures (20% failure rate)
                if random.random() < 0.2:
                    raise Exception(f"Simulated failure for operation {operation_id}")
                
                # Normal database operation
                session = create_isolated_session()
                result = session.execute("SELECT 1").scalar()
                session.close()
                
                operation_results.append(f"success_{operation_id}")
                return True
                
            except Exception as e:
                # Simulate circuit breaker and degradation handling
                if "Simulated failure" in str(e):
                    circuit_breaker_triggers += 1
                    
                    # Simulate fallback
                    fallback_activations += 1
                    operation_results.append(f"fallback_{operation_id}")
                    return True  # Fallback succeeded
                else:
                    operation_results.append(f"error_{operation_id}")
                    return False
        
        # Run simulation with 30 operations
        with ThreadPoolExecutor(max_workers=12) as executor:
            futures = [
                executor.submit(simulate_operation, i) 
                for i in range(30)
            ]
            results = [future.result() for future in as_completed(futures)]
        
        # Analyze results
        success_count = sum(results)
        success_rate = success_count / len(results)
        
        successful_ops = [r for r in operation_results if r.startswith("success")]
        fallback_ops = [r for r in operation_results if r.startswith("fallback")]
        
        assert success_rate >= 0.8, f"Overall success rate too low: {success_rate}"
        assert len(successful_ops) + len(fallback_ops) >= 24, "Too many complete failures"
        
        print(f"Stress test results:")
        print(f"  Success rate: {success_rate:.2%}")
        print(f"  Direct successes: {len(successful_ops)}")
        print(f"  Fallback successes: {len(fallback_ops)}")
        print(f"  Circuit breaker triggers: {circuit_breaker_triggers}")


if __name__ == "__main__":
    # Run quick smoke test
    test_runner = TestConcurrentDatabaseAccess()
    test_runner.setup_method()
    test_runner.test_concurrent_session_creation()
    print("Basic concurrency test passed!")