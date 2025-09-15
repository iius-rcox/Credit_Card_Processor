"""
Tests for Bulk Operations API
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime
from typing import List, Dict, Any

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.bulk_operations import (
    validate_bulk_action,
    bulk_delete_sessions,
    export_session_metadata,
    bulk_close_sessions,
    bulk_archive_sessions
)
from app.services.bulk_service import BulkOperationService
from app.models import ProcessingSession
from app.schemas_bulk.bulk_operations import (
    BulkDeleteRequest,
    BulkExportRequest,
    BulkValidationRequest,
    BulkActionRequest
)

# Test fixtures
@pytest.fixture
def mock_db():
    """Mock database session"""
    return Mock(spec=Session)

@pytest.fixture
def mock_current_user():
    """Mock current user"""
    return {
        'id': 'user-123',
        'email': 'test@example.com',
        'roles': ['admin']
    }

@pytest.fixture
def sample_sessions():
    """Sample session data for testing"""
    return [
        ProcessingSession(
            session_id='session-001',
            session_name='Test Session 1',
            status='COMPLETED',
            created_at=datetime.utcnow(),
            file_count=5,
            transaction_count=100,
            has_results=True
        ),
        ProcessingSession(
            session_id='session-002',
            session_name='Test Session 2',
            status='PROCESSING',
            created_at=datetime.utcnow(),
            file_count=3,
            transaction_count=50,
            has_results=False
        ),
        ProcessingSession(
            session_id='session-003',
            session_name='Test Session 3',
            status='FAILED',
            created_at=datetime.utcnow(),
            file_count=0,
            transaction_count=0,
            has_results=False
        ),
        ProcessingSession(
            session_id='session-004',
            session_name='Test Session 4',
            status='CLOSED',
            created_at=datetime.utcnow(),
            file_count=10,
            transaction_count=200,
            has_results=True
        )
    ]

@pytest.fixture
def bulk_service(mock_db):
    """Mock bulk operation service"""
    return BulkOperationService(mock_db)

# Validation Tests
class TestBulkValidation:
    """Tests for bulk action validation"""
    
    @pytest.mark.asyncio
    async def test_validate_delete_action(self, mock_db, mock_current_user, sample_sessions):
        """Test validation for delete action"""
        request = BulkValidationRequest(
            session_ids=['session-001', 'session-002', 'session-003'],
            action='delete'
        )
        
        # Mock service response
        with patch('app.api.bulk_operations.BulkOperationService') as MockService:
            mock_service = MockService.return_value
            mock_service.validate_sessions.return_value = {
                'eligible': [
                    {'session_id': 'session-001', 'session_name': 'Test Session 1', 'status': 'COMPLETED'}
                ],
                'ineligible': [
                    {'session_id': 'session-002', 'session_name': 'Test Session 2', 
                     'status': 'PROCESSING', 'reason': 'Session is currently processing'}
                ],
                'not_found': ['session-003'],
                'eligible_count': 1,
                'ineligible_count': 1,
                'not_found_count': 1
            }
            
            result = await validate_bulk_action(request, mock_db, mock_current_user)
            
            assert result.eligible_count == 1
            assert result.ineligible_count == 1
            assert result.not_found_count == 1
            mock_service.validate_sessions.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_validate_with_too_many_sessions(self, mock_db, mock_current_user):
        """Test validation fails with too many sessions"""
        # Create request with more than MAX_BULK_SIZE sessions
        session_ids = [f'session-{i:04d}' for i in range(1001)]
        request = BulkValidationRequest(
            session_ids=session_ids,
            action='delete'
        )
        
        with pytest.raises(Exception) as exc_info:
            await validate_bulk_action(request, mock_db, mock_current_user)
        
        assert "Maximum 1000 sessions allowed" in str(exc_info.value)
    
    def test_session_eligibility_rules(self, bulk_service, sample_sessions):
        """Test eligibility rules for different actions"""
        # Test delete eligibility
        assert bulk_service._check_delete_eligibility(sample_sessions[0])['eligible']  # COMPLETED
        assert not bulk_service._check_delete_eligibility(sample_sessions[1])['eligible']  # PROCESSING
        
        # Test close eligibility
        assert bulk_service._check_close_eligibility(sample_sessions[0])['eligible']  # COMPLETED
        assert not bulk_service._check_close_eligibility(sample_sessions[3])['eligible']  # Already CLOSED
        
        # Test export eligibility
        assert bulk_service._check_export_eligibility(sample_sessions[0])['eligible']  # has_results=True
        assert not bulk_service._check_export_eligibility(sample_sessions[2])['eligible']  # has_results=False

# Delete Operation Tests
class TestBulkDelete:
    """Tests for bulk delete operations"""
    
    @pytest.mark.asyncio
    async def test_bulk_delete_success(self, mock_db, mock_current_user):
        """Test successful bulk delete"""
        request = BulkDeleteRequest(
            session_ids=['session-001', 'session-003'],
            soft_delete=True,
            cascade_exports=False
        )
        
        with patch('app.api.bulk_operations.BulkOperationService') as MockService:
            mock_service = MockService.return_value
            
            # Mock validation
            mock_service.validate_sessions.return_value = {
                'eligible_ids': ['session-001', 'session-003'],
                'eligible_count': 2,
                'ineligible_count': 0,
                'ineligible': []
            }
            
            # Mock delete operation
            mock_service.perform_bulk_delete.return_value = {
                'deleted_count': 2,
                'failed_count': 0,
                'deleted_ids': ['session-001', 'session-003'],
                'failed_items': []
            }
            
            # Mock background tasks
            mock_background = Mock()
            
            result = await bulk_delete_sessions(
                request, mock_background, mock_db, mock_current_user
            )
            
            assert result.success
            assert result.processed_count == 2
            assert result.failed_count == 0
            assert 'session-001' in result.processed_items
            assert 'session-003' in result.processed_items
    
    @pytest.mark.asyncio
    async def test_bulk_delete_partial_failure(self, mock_db, mock_current_user):
        """Test bulk delete with partial failures"""
        request = BulkDeleteRequest(
            session_ids=['session-001', 'session-002', 'session-003'],
            soft_delete=True
        )
        
        with patch('app.api.bulk_operations.BulkOperationService') as MockService:
            mock_service = MockService.return_value
            
            # Mock validation with one ineligible
            mock_service.validate_sessions.return_value = {
                'eligible_ids': ['session-001', 'session-003'],
                'eligible_count': 2,
                'ineligible_count': 1,
                'ineligible': [
                    {'session_id': 'session-002', 'reason': 'Session is processing'}
                ]
            }
            
            # Mock delete with one failure
            mock_service.perform_bulk_delete.return_value = {
                'deleted_count': 1,
                'failed_count': 1,
                'deleted_ids': ['session-001'],
                'failed_items': [
                    {'session_id': 'session-003', 'reason': 'Database error'}
                ]
            }
            
            mock_background = Mock()
            
            result = await bulk_delete_sessions(
                request, mock_background, mock_db, mock_current_user
            )
            
            assert result.success
            assert result.processed_count == 1
            assert result.failed_count == 1
            assert len(result.failed_items) == 1
    
    def test_cascade_delete_logic(self, bulk_service, mock_db):
        """Test cascade delete removes related data"""
        session_id = 'session-001'
        
        # Mock related data queries
        mock_db.query.return_value.filter.return_value.delete.return_value = None
        
        bulk_service._cascade_delete_session_data(session_id)
        
        # Verify related data deletion was attempted
        assert mock_db.query.called
        # Should query for SessionResult and SessionFile at minimum

# Export Operation Tests
class TestBulkExport:
    """Tests for bulk export operations"""
    
    @pytest.mark.asyncio
    async def test_export_csv_format(self, mock_db, mock_current_user, sample_sessions):
        """Test CSV export generation"""
        request = BulkExportRequest(
            session_ids=['session-001', 'session-004'],
            format='csv',
            include_details=True
        )
        
        with patch('app.api.bulk_operations.BulkOperationService') as MockService:
            mock_service = MockService.return_value
            mock_service.get_sessions_by_ids.return_value = [
                sample_sessions[0], sample_sessions[3]
            ]
            
            with patch('app.api.bulk_operations.save_export_file') as mock_save:
                mock_save.return_value = '/path/to/export.csv'
                
                mock_background = Mock()
                
                result = await export_session_metadata(
                    request, mock_background, mock_db, mock_current_user
                )
                
                assert result.success
                assert result.processed_count == 2
                assert 'download_url' in result.__dict__
                assert result.metadata['format'] == 'csv'
    
    @pytest.mark.asyncio
    async def test_export_json_format(self, mock_db, mock_current_user, sample_sessions):
        """Test JSON export generation"""
        request = BulkExportRequest(
            session_ids=['session-001'],
            format='json',
            include_details=False
        )
        
        with patch('app.api.bulk_operations.BulkOperationService') as MockService:
            mock_service = MockService.return_value
            mock_service.get_sessions_by_ids.return_value = [sample_sessions[0]]
            
            with patch('app.api.bulk_operations.save_export_file') as mock_save:
                mock_save.return_value = '/path/to/export.json'
                
                mock_background = Mock()
                
                result = await export_session_metadata(
                    request, mock_background, mock_db, mock_current_user
                )
                
                assert result.success
                assert result.metadata['format'] == 'json'

# Close Operation Tests
class TestBulkClose:
    """Tests for bulk close operations"""
    
    @pytest.mark.asyncio
    async def test_bulk_close_success(self, mock_db, mock_current_user):
        """Test successful bulk close"""
        request = BulkActionRequest(
            session_ids=['session-001', 'session-002']
        )
        
        with patch('app.api.bulk_operations.BulkOperationService') as MockService:
            mock_service = MockService.return_value
            
            mock_service.validate_sessions.return_value = {
                'eligible_ids': ['session-001'],
                'eligible_count': 1,
                'ineligible_count': 1,
                'ineligible': [
                    {'session_id': 'session-002', 'reason': 'Already closed'}
                ]
            }
            
            mock_service.perform_bulk_close.return_value = {
                'closed_count': 1,
                'failed_count': 0,
                'closed_ids': ['session-001'],
                'failed_items': []
            }
            
            mock_background = Mock()
            
            result = await bulk_close_sessions(
                request, mock_background, mock_db, mock_current_user
            )
            
            assert result.success
            assert result.processed_count == 1
            assert result.action == 'close'

# Archive Operation Tests
class TestBulkArchive:
    """Tests for bulk archive operations"""
    
    @pytest.mark.asyncio
    async def test_bulk_archive_with_compression(self, mock_db, mock_current_user):
        """Test bulk archive with compression option"""
        request = BulkActionRequest(
            session_ids=['session-004'],
            options={'compress': True}
        )
        
        with patch('app.api.bulk_operations.BulkOperationService') as MockService:
            mock_service = MockService.return_value
            
            mock_service.validate_sessions.return_value = {
                'eligible_ids': ['session-004'],
                'eligible_count': 1,
                'ineligible_count': 0,
                'ineligible': []
            }
            
            mock_service.perform_bulk_archive.return_value = {
                'archived_count': 1,
                'failed_count': 0,
                'archived_ids': ['session-004'],
                'failed_items': []
            }
            
            mock_background = Mock()
            
            result = await bulk_archive_sessions(
                request, mock_background, mock_db, mock_current_user
            )
            
            assert result.success
            assert result.processed_count == 1
            assert result.action == 'archive'
            
            # Verify compression option was passed
            mock_service.perform_bulk_archive.assert_called_with(
                session_ids=['session-004'],
                compress=True,
                user_id='user-123'
            )

# WebSocket Tests
class TestBulkWebSocket:
    """Tests for WebSocket functionality"""
    
    @pytest.mark.asyncio
    async def test_websocket_notification_on_completion(self):
        """Test WebSocket sends notification on operation completion"""
        from app.websocket_bulk import bulk_ws_manager
        
        # Mock WebSocket connection
        mock_websocket = AsyncMock()
        user_id = 'user-123'
        
        await bulk_ws_manager.connect(mock_websocket, user_id)
        
        # Simulate operation completion
        await bulk_ws_manager.notify_bulk_operation_completed(
            operation_id='op-123',
            action='delete',
            result={'deleted_count': 5}
        )
        
        # Verify notification was sent
        # Note: In real test, would need to properly mock the WebSocket
        assert user_id in bulk_ws_manager.active_connections
    
    @pytest.mark.asyncio
    async def test_websocket_progress_updates(self):
        """Test WebSocket sends progress updates"""
        from app.websocket_bulk import bulk_ws_manager
        
        operation_id = 'op-456'
        
        # Start operation
        await bulk_ws_manager.notify_bulk_operation_started(
            operation_id=operation_id,
            action='delete',
            total_count=100,
            user_id='user-123'
        )
        
        # Send progress update
        await bulk_ws_manager.notify_bulk_operation_progress(
            operation_id=operation_id,
            processed_count=50,
            total_count=100
        )
        
        # Check progress is tracked
        status = bulk_ws_manager.get_operation_status(operation_id)
        assert status['progress'] == 50.0

# Middleware Tests
class TestBulkValidationMiddleware:
    """Tests for validation middleware"""
    
    def test_rate_limiting(self):
        """Test rate limiting functionality"""
        from app.middleware.bulk_validation import BulkOperationValidator
        
        validator = BulkOperationValidator()
        user_id = 'user-test'
        action = 'delete'
        
        # Make requests up to the limit
        for i in range(10):  # Delete limit is 10 per minute
            result = validator.check_rate_limit(user_id, action)
            assert result['allowed']
        
        # Next request should be rate limited
        result = validator.check_rate_limit(user_id, action)
        assert not result['allowed']
        assert 'Rate limit exceeded' in result['message']
    
    def test_session_id_validation(self):
        """Test session ID validation"""
        from app.middleware.bulk_validation import BulkOperationValidator
        
        validator = BulkOperationValidator()
        
        # Valid session IDs
        valid_result = validator.validate_session_ids(['session-001', 'session-002'])
        assert valid_result['valid']
        
        # Duplicate session IDs
        duplicate_result = validator.validate_session_ids(['session-001', 'session-001'])
        assert not duplicate_result['valid']
        assert 'Duplicate session IDs' in duplicate_result['errors'][0]
        
        # Too many session IDs
        many_ids = [f'session-{i:04d}' for i in range(1001)]
        many_result = validator.validate_session_ids(many_ids)
        assert not many_result['valid']
        assert 'Maximum 1000 session IDs' in many_result['errors'][0]

# Integration Tests
class TestBulkOperationIntegration:
    """Integration tests for bulk operations"""
    
    @pytest.mark.asyncio
    async def test_full_delete_workflow(self, mock_db, mock_current_user):
        """Test complete delete workflow from validation to completion"""
        session_ids = ['session-001', 'session-002', 'session-003']
        
        # Step 1: Validation
        validation_request = BulkValidationRequest(
            session_ids=session_ids,
            action='delete'
        )
        
        with patch('app.api.bulk_operations.BulkOperationService') as MockService:
            mock_service = MockService.return_value
            
            # Mock validation response
            mock_service.validate_sessions.return_value = {
                'eligible_ids': ['session-001', 'session-003'],
                'eligible_count': 2,
                'ineligible_count': 1,
                'ineligible': [
                    {'session_id': 'session-002', 'reason': 'Session is processing'}
                ]
            }
            
            validation_result = await validate_bulk_action(
                validation_request, mock_db, mock_current_user
            )
            
            assert validation_result.eligible_count == 2
            assert validation_result.ineligible_count == 1
            
            # Step 2: Perform delete
            delete_request = BulkDeleteRequest(
                session_ids=['session-001', 'session-003'],
                soft_delete=True
            )
            
            mock_service.perform_bulk_delete.return_value = {
                'deleted_count': 2,
                'failed_count': 0,
                'deleted_ids': ['session-001', 'session-003'],
                'failed_items': []
            }
            
            mock_background = Mock()
            
            delete_result = await bulk_delete_sessions(
                delete_request, mock_background, mock_db, mock_current_user
            )
            
            assert delete_result.success
            assert delete_result.processed_count == 2
            
            # Verify background task was scheduled for WebSocket notification
            mock_background.add_task.assert_called()

if __name__ == "__main__":
    pytest.main([__file__, "-v"])