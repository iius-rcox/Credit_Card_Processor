"""
Specific tests for retry scenarios and finally block fixes

Tests the critical fixes to atomic_transaction and retry logic
"""

import pytest
import time
import threading
from unittest.mock import Mock, patch, MagicMock, call
from sqlalchemy.exc import SQLAlchemyError, OperationalError
import sqlite3

from app.database import (
    atomic_transaction, safe_commit, create_isolated_session, cleanup_session,
    safe_batch_operation
)


class TestAtomicTransactionRetryFix:
    """Test the fixed atomic_transaction context manager"""
    
    def test_atomic_transaction_successful_first_attempt(self):
        """Test successful transaction on first attempt"""
        mock_session = Mock()
        executed_operations = []
        
        def mock_operation():
            executed_operations.append("operation_executed")
        
        with atomic_transaction(session=mock_session) as session:
            assert session is mock_session
            mock_operation()
        
        # Should commit once and not rollback
        mock_session.commit.assert_called_once()
        mock_session.rollback.assert_not_called()
        assert len(executed_operations) == 1
    
    def test_atomic_transaction_retry_on_database_lock(self):
        """Test retry logic when database is locked"""
        mock_session = Mock()
        
        # First two attempts fail with database lock, third succeeds
        mock_session.commit.side_effect = [
            sqlite3.OperationalError("database is locked"),
            sqlite3.OperationalError("database is locked"),
            None  # Success on third attempt
        ]
        
        executed_operations = []
        
        def mock_operation():
            executed_operations.append("operation_executed")
        
        with atomic_transaction(session=mock_session, max_retries=3) as session:
            mock_operation()
        
        # Should have tried 3 times total
        assert mock_session.commit.call_count == 3
        # Should have rolled back on first two failures
        assert mock_session.rollback.call_count == 2
        # Should have executed operation 3 times (once per retry)
        assert len(executed_operations) == 3
    
    def test_atomic_transaction_session_cleanup_only_after_all_retries(self):
        """Test that session cleanup only happens after all retries complete"""
        cleanup_calls = []
        
        # Mock create_isolated_session to track cleanup
        with patch('app.database.create_isolated_session') as mock_create_session:
            with patch('app.database.cleanup_session') as mock_cleanup:
                mock_session = Mock()
                mock_create_session.return_value = mock_session
                
                # Track when cleanup is called
                def track_cleanup(session):
                    cleanup_calls.append(f"cleanup_called_with_{id(session)}")
                
                mock_cleanup.side_effect = track_cleanup
                
                # Make the first two commits fail, third succeed
                mock_session.commit.side_effect = [
                    sqlite3.OperationalError("database is locked"),
                    sqlite3.OperationalError("database is locked"), 
                    None  # Success
                ]
                
                with atomic_transaction(max_retries=3) as session:
                    pass  # Just test the retry mechanism
                
                # Cleanup should only be called once, after all retries
                assert len(cleanup_calls) == 1
                mock_cleanup.assert_called_once_with(mock_session)
    
    def test_atomic_transaction_exhausted_retries_raises_exception(self):
        """Test that exhausted retries properly raise the last exception"""
        mock_session = Mock()
        
        # All attempts fail
        mock_session.commit.side_effect = sqlite3.OperationalError("database is locked")
        
        with pytest.raises(sqlite3.OperationalError, match="database is locked"):
            with atomic_transaction(session=mock_session, max_retries=2):
                pass
        
        # Should have tried 3 times (initial + 2 retries)
        assert mock_session.commit.call_count == 3
        assert mock_session.rollback.call_count == 3
    
    def test_atomic_transaction_non_retryable_error_immediate_failure(self):
        """Test that non-retryable errors fail immediately without retries"""
        mock_session = Mock()
        
        # Non-retryable error
        mock_session.commit.side_effect = ValueError("Invalid data")
        
        with pytest.raises(ValueError, match="Invalid data"):
            with atomic_transaction(session=mock_session, max_retries=3):
                pass
        
        # Should only try once
        assert mock_session.commit.call_count == 1
        assert mock_session.rollback.call_count == 1
    
    def test_atomic_transaction_exception_in_context_block(self):
        """Test handling of exceptions raised in the context block"""
        mock_session = Mock()
        
        with pytest.raises(RuntimeError, match="Test error"):
            with atomic_transaction(session=mock_session) as session:
                raise RuntimeError("Test error")
        
        # Should rollback but not commit
        mock_session.rollback.assert_called_once()
        mock_session.commit.assert_not_called()
    
    def test_atomic_transaction_with_fresh_session_cleanup(self):
        """Test that fresh sessions are properly cleaned up"""
        cleanup_calls = []
        
        with patch('app.database.create_isolated_session') as mock_create:
            with patch('app.database.cleanup_session') as mock_cleanup:
                mock_session = Mock()
                mock_create.return_value = mock_session
                
                def track_cleanup(session):
                    cleanup_calls.append(session)
                    
                mock_cleanup.side_effect = track_cleanup
                
                with atomic_transaction() as session:  # No session provided, should create and cleanup
                    assert session is mock_session
                
                # Should have created and cleaned up the session
                mock_create.assert_called_once()
                mock_cleanup.assert_called_once_with(mock_session)
                assert len(cleanup_calls) == 1
    
    def test_atomic_transaction_provided_session_no_cleanup(self):
        """Test that provided sessions are not cleaned up"""
        mock_session = Mock()
        
        with patch('app.database.cleanup_session') as mock_cleanup:
            with atomic_transaction(session=mock_session) as session:
                assert session is mock_session
            
            # Should not cleanup provided session
            mock_cleanup.assert_not_called()
    
    @patch('time.sleep')  # Mock sleep to speed up test
    def test_atomic_transaction_retry_timing(self, mock_sleep):
        """Test retry timing follows exponential backoff"""
        mock_session = Mock()
        
        # First two fail, third succeeds
        mock_session.commit.side_effect = [
            sqlite3.OperationalError("database is locked"),
            sqlite3.OperationalError("database is locked"),
            None
        ]
        
        with atomic_transaction(session=mock_session, max_retries=3):
            pass
        
        # Should have slept twice (before retry 1 and retry 2)
        expected_calls = [call(0.1), call(0.2)]  # Exponential backoff: 0.1, 0.2
        mock_sleep.assert_has_calls(expected_calls)


class TestSafeBatchOperationRetryFix:
    """Test safe batch operation retry logic"""
    
    def test_safe_batch_operation_successful_batches(self):
        """Test successful batch processing"""
        mock_session = Mock()
        operations_performed = []
        
        def mock_operation(session, item):
            operations_performed.append(item)
        
        test_data = [{"id": i, "name": f"item_{i}"} for i in range(12)]
        
        success, processed = safe_batch_operation(
            mock_session, mock_operation, test_data, batch_size=5
        )
        
        assert success is True
        assert processed == 12
        assert len(operations_performed) == 12
        # Should have committed 3 times (batches of 5, 5, 2)
        assert mock_session.commit.call_count == 3
    
    def test_safe_batch_operation_retry_on_lock_error(self):
        """Test batch operation retries on database lock"""
        mock_session = Mock()
        operations_performed = []
        
        def mock_operation(session, item):
            operations_performed.append(item)
        
        # First commit fails, second succeeds
        mock_session.commit.side_effect = [
            sqlite3.OperationalError("database is locked"),
            None,  # Second attempt succeeds
            None   # Third batch succeeds normally
        ]
        
        test_data = [{"id": i} for i in range(7)]
        
        success, processed = safe_batch_operation(
            mock_session, mock_operation, test_data, batch_size=5, max_retries=2
        )
        
        assert success is True
        assert processed == 7
        # First batch should be retried, so more operations than items
        assert len(operations_performed) == 12  # 5 + 5 (retry) + 2
        assert mock_session.rollback.call_count == 1  # One rollback on retry
    
    def test_safe_batch_operation_exhausted_retries(self):
        """Test batch operation failure after exhausted retries"""
        mock_session = Mock()
        operations_performed = []
        
        def mock_operation(session, item):
            operations_performed.append(item)
        
        # All commits fail
        mock_session.commit.side_effect = sqlite3.OperationalError("database is locked")
        
        test_data = [{"id": i} for i in range(3)]
        
        success, processed = safe_batch_operation(
            mock_session, mock_operation, test_data, batch_size=2, max_retries=2
        )
        
        assert success is False
        assert processed == 0  # Nothing successfully committed
        # Should have tried first batch 3 times (initial + 2 retries)
        assert mock_session.commit.call_count == 3


class TestSessionLifecycleIntegration:
    """Test complete session lifecycle with retry scenarios"""
    
    @patch('app.database.SessionLocal')
    def test_session_lifecycle_with_retries(self, mock_session_local):
        """Test complete session lifecycle including retries and cleanup"""
        mock_session = Mock()
        mock_session_local.return_value = mock_session
        
        # Simulate initial lock, then success
        mock_session.commit.side_effect = [
            sqlite3.OperationalError("database is locked"),
            None  # Success on retry
        ]
        
        operations_executed = []
        cleanup_called = []
        
        with patch('app.database.cleanup_session') as mock_cleanup:
            def track_cleanup(session):
                cleanup_called.append(session)
            mock_cleanup.side_effect = track_cleanup
            
            # Test the complete flow
            with atomic_transaction(max_retries=2) as session:
                operations_executed.append("operation")
                session.execute("SELECT 1")
        
        # Verify session operations
        assert len(operations_executed) == 2  # Once initial, once retry
        assert mock_session.execute.call_count == 2
        assert mock_session.commit.call_count == 2
        assert mock_session.rollback.call_count == 1  # One rollback before retry
        
        # Verify cleanup happened once at the end
        assert len(cleanup_called) == 1
        assert cleanup_called[0] is mock_session
    
    def test_concurrent_atomic_transactions(self):
        """Test multiple concurrent atomic transactions"""
        results = []
        errors = []
        
        def worker_transaction(worker_id):
            try:
                with patch('app.database.SessionLocal') as mock_session_local:
                    mock_session = Mock()
                    mock_session_local.return_value = mock_session
                    
                    with atomic_transaction() as session:
                        session.execute(f"SELECT {worker_id}")
                        time.sleep(0.01)  # Small delay to increase contention
                    
                    results.append(f"worker_{worker_id}")
                    return True
            except Exception as e:
                errors.append(f"Worker {worker_id}: {str(e)}")
                return False
        
        # Run 10 concurrent transactions
        threads = [threading.Thread(target=worker_transaction, args=(i,)) for i in range(10)]
        
        for thread in threads:
            thread.start()
        
        for thread in threads:
            thread.join()
        
        # All should succeed
        assert len(errors) == 0, f"Concurrent transaction errors: {errors}"
        assert len(results) == 10


class TestRegressionScenarios:
    """Test specific regression scenarios that could break the fix"""
    
    def test_nested_exception_handling_during_retry(self):
        """Test exception handling when rollback itself fails during retry"""
        mock_session = Mock()
        
        # Commit fails, rollback also fails
        mock_session.commit.side_effect = sqlite3.OperationalError("database is locked")
        mock_session.rollback.side_effect = sqlite3.OperationalError("rollback failed")
        
        # Should still raise the original commit error, not the rollback error
        with pytest.raises(sqlite3.OperationalError, match="database is locked"):
            with atomic_transaction(session=mock_session, max_retries=1):
                pass
        
        assert mock_session.commit.call_count == 2  # Initial + 1 retry
        assert mock_session.rollback.call_count == 2  # Try to rollback each time
    
    def test_cleanup_session_exception_handling(self):
        """Test that cleanup_session exceptions don't break the context manager"""
        cleanup_exceptions = []
        
        with patch('app.database.create_isolated_session') as mock_create:
            with patch('app.database.cleanup_session') as mock_cleanup:
                mock_session = Mock()
                mock_create.return_value = mock_session
                
                # Cleanup raises exception
                def failing_cleanup(session):
                    cleanup_exceptions.append("cleanup_failed")
                    raise Exception("Cleanup failed")
                
                mock_cleanup.side_effect = failing_cleanup
                
                # Should not raise cleanup exception
                with atomic_transaction():
                    pass
                
                # Cleanup should have been attempted
                assert len(cleanup_exceptions) == 1
                mock_cleanup.assert_called_once_with(mock_session)
    
    def test_memory_usage_during_retries(self):
        """Test that retries don't accumulate memory (sessions are properly reset)"""
        session_resets = []
        
        with patch('app.database.SessionLocal') as mock_session_local:
            mock_session = Mock()
            mock_session_local.return_value = mock_session
            
            # Track expunge_all calls (session reset)
            def track_expunge():
                session_resets.append("session_reset")
            
            mock_session.expunge_all.side_effect = track_expunge
            
            # Force 2 retries
            mock_session.commit.side_effect = [
                sqlite3.OperationalError("database is locked"),
                sqlite3.OperationalError("database is locked"),
                None  # Success on third attempt
            ]
            
            with atomic_transaction(max_retries=3):
                pass
            
            # Should have reset session state on each retry
            assert len(session_resets) == 2
            assert mock_session.expunge_all.call_count == 2


if __name__ == "__main__":
    # Quick smoke test
    test = TestAtomicTransactionRetryFix()
    test.test_atomic_transaction_successful_first_attempt()
    test.test_atomic_transaction_retry_on_database_lock()
    print("Atomic transaction retry fix tests passed!")