"""
Phase 4 Feature Tests

Tests for advanced session management, receipt reprocessing, and delta export functionality.
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.models import ProcessingSession, EmployeeRevision, ReceiptVersion, EmployeeChangeLog
from app.database import get_db
from app.auth import get_current_user


class TestPhase4Features:
    """Test suite for Phase 4 advanced session management features"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return Mock()
    
    @pytest.fixture
    def mock_user(self):
        """Mock authenticated user"""
        user = Mock()
        user.username = "testuser"
        user.is_admin = False
        return user
    
    @pytest.fixture
    def sample_session(self):
        """Create a sample session for testing"""
        session = ProcessingSession()
        session.session_id = "test-session-id"
        session.session_name = "Test Session"
        session.status = "COMPLETED"
        session.is_closed = False
        session.created_by = "DOMAIN\\testuser"
        session.created_at = datetime.now(timezone.utc)
        session.updated_at = datetime.now(timezone.utc)
        session.total_employees = 10
        session.processed_employees = 10
        session.processing_options = {}
        session.delta_session_id = None
        session.closure_reason = None
        session.closed_by = None
        session.closed_at = None
        session.receipt_file_versions = 1
        session.last_receipt_upload = None
        return session
    
    def test_reprocess_receipts_success(self, client, mock_db, mock_user, sample_session):
        """Test successful receipt reprocessing"""
        # Mock database query to return our sample session
        mock_db.query.return_value.filter.return_value.first.return_value = sample_session
        
        with patch('app.api.phase4_endpoints.get_db', return_value=mock_db), \
             patch('app.api.phase4_endpoints.get_current_user', return_value=mock_user), \
             patch('app.api.phase4_endpoints.ReceiptReprocessingService') as mock_service:
            
            # Mock the reprocessing service
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.reprocess_receipts.return_value = {
                'success': True,
                'version_number': 2,
                'changes': {
                    'new_employees': [],
                    'changed_employees': [],
                    'unchanged_employees': [],
                    'removed_employees': [],
                    'change_summary': {
                        'total_old': 10,
                        'total_new': 10,
                        'new_count': 0,
                        'changed_count': 0,
                        'unchanged_count': 10,
                        'removed_count': 0
                    }
                },
                'message': 'Successfully reprocessed receipts. Version 2 created.'
            }
            
            # Create a mock file
            files = {"file": ("test_receipts.csv", "test,data,here", "text/csv")}
            data = {"closure_reason": "Test reprocessing"}
            
            response = client.post(
                f"/api/phase4/sessions/{sample_session.session_id}/reprocess-receipts",
                files=files,
                data=data
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            assert data["version_number"] == 2
            assert "Successfully reprocessed receipts" in data["message"]
    
    def test_reprocess_receipts_closed_session(self, client, mock_db, mock_user, sample_session):
        """Test reprocessing fails for closed session"""
        sample_session.is_closed = True
        mock_db.query.return_value.filter.return_value.first.return_value = sample_session
        
        with patch('app.api.phase4_endpoints.get_db', return_value=mock_db), \
             patch('app.api.phase4_endpoints.get_current_user', return_value=mock_user):
            
            files = {"file": ("test_receipts.csv", "test,data,here", "text/csv")}
            
            response = client.post(
                f"/api/phase4/sessions/{sample_session.session_id}/reprocess-receipts",
                files=files
            )
            
            assert response.status_code == 400
            assert "permanently closed" in response.json()["detail"]
    
    def test_get_export_summary_success(self, client, mock_db, mock_user, sample_session):
        """Test successful export summary retrieval"""
        mock_db.query.return_value.filter.return_value.first.return_value = sample_session
        
        with patch('app.api.phase4_endpoints.get_db', return_value=mock_db), \
             patch('app.api.phase4_endpoints.get_current_user', return_value=mock_user), \
             patch('app.api.phase4_endpoints.DeltaExportService') as mock_service:
            
            # Mock the export service
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.get_export_summary.return_value = {
                'session_id': str(sample_session.session_id),
                'session_name': sample_session.session_name,
                'employee_stats': {
                    'total_employees': 10,
                    'already_exported': 5,
                    'pending_export': 5,
                    'changed_employees': 2,
                    'valid_employees': 8
                },
                'export_history': [],
                'recommendations': {
                    'should_use_delta': True,
                    'recommended_export_type': 'delta',
                    'estimated_new_records': 5,
                    'estimated_changed_records': 2,
                    'warnings': [],
                    'suggestions': []
                },
                'last_export': None
            }
            
            response = client.get(f"/api/phase4/sessions/{sample_session.session_id}/export-summary")
            
            assert response.status_code == 200
            data = response.json()
            assert data["session_id"] == str(sample_session.session_id)
            assert data["employee_stats"]["total_employees"] == 10
            assert data["recommendations"]["should_use_delta"] == True
    
    def test_generate_delta_export_success(self, client, mock_db, mock_user, sample_session):
        """Test successful delta export generation"""
        mock_db.query.return_value.filter.return_value.first.return_value = sample_session
        
        with patch('app.api.phase4_endpoints.get_db', return_value=mock_db), \
             patch('app.api.phase4_endpoints.get_current_user', return_value=mock_user), \
             patch('app.api.phase4_endpoints.DeltaExportService') as mock_service:
            
            # Mock the export service
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.generate_delta_export.return_value = {
                'export_batch_id': 'test-batch-123',
                'export_type': 'pvault',
                'employee_count': 5,
                'export_data': [
                    {
                        'employee_id': 'EMP001',
                        'employee_name': 'John Doe',
                        'car_amount': 100.0,
                        'receipt_amount': 100.0,
                        'difference': 0.0,
                        'validation_status': 'valid',
                        'revision_id': 'rev-123'
                    }
                ],
                'statistics': {
                    'total_employees': 5,
                    'new_employees': 3,
                    'changed_employees': 2,
                    'previously_exported': 0
                },
                'delta_only': True,
                'generated_at': datetime.now(timezone.utc).isoformat()
            }
            
            request_data = {
                'export_type': 'pvault',
                'include_exported': False,
                'mark_as_exported': True
            }
            
            response = client.post(
                f"/api/phase4/sessions/{sample_session.session_id}/export-delta",
                json=request_data
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["export_batch_id"] == 'test-batch-123'
            assert data["export_type"] == 'pvault'
            assert data["employee_count"] == 5
            assert data["delta_only"] == True
    
    def test_mark_records_as_exported_success(self, client, mock_db, mock_user, sample_session):
        """Test successful marking of records as exported"""
        mock_db.query.return_value.filter.return_value.first.return_value = sample_session
        
        with patch('app.api.phase4_endpoints.get_db', return_value=mock_db), \
             patch('app.api.phase4_endpoints.get_current_user', return_value=mock_user), \
             patch('app.api.phase4_endpoints.DeltaExportService') as mock_service:
            
            # Mock the export service
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.mark_records_as_exported.return_value = {
                'success': True,
                'export_batch_id': 'test-batch-123',
                'marked_count': 5,
                'message': 'Successfully marked 5 records as exported'
            }
            
            request_data = {
                'export_batch_id': 'test-batch-123',
                'employee_ids': ['rev-1', 'rev-2', 'rev-3', 'rev-4', 'rev-5'],
                'export_type': 'pvault'
            }
            
            response = client.post(
                f"/api/phase4/sessions/{sample_session.session_id}/mark-exported",
                json=request_data
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            assert data["marked_count"] == 5
            assert "Successfully marked 5 records" in data["message"]
    
    def test_get_export_history_success(self, client, mock_db, mock_user, sample_session):
        """Test successful export history retrieval"""
        mock_db.query.return_value.filter.return_value.first.return_value = sample_session
        
        with patch('app.api.phase4_endpoints.get_db', return_value=mock_db), \
             patch('app.api.phase4_endpoints.get_current_user', return_value=mock_user), \
             patch('app.api.phase4_endpoints.DeltaExportService') as mock_service:
            
            # Mock the export service
            mock_service_instance = Mock()
            mock_service.return_value = mock_service_instance
            mock_service_instance.get_export_history_summary.return_value = {
                'session_id': str(sample_session.session_id),
                'total_exports': 2,
                'total_employees_exported': 10,
                'delta_exports': 1,
                'full_exports': 1,
                'latest_export': {
                    'export_timestamp': datetime.now(timezone.utc).isoformat(),
                    'export_type': 'pvault',
                    'employee_count': 5,
                    'delta_only': True
                },
                'avg_frequency_days': 7.5,
                'exports': []
            }
            
            response = client.get(f"/api/phase4/sessions/{sample_session.session_id}/export-history")
            
            assert response.status_code == 200
            data = response.json()
            assert data["session_id"] == str(sample_session.session_id)
            assert data["total_exports"] == 2
            assert data["total_employees_exported"] == 10
    
    def test_get_change_summary_success(self, client, mock_db, mock_user, sample_session):
        """Test successful change summary retrieval"""
        mock_db.query.return_value.filter.return_value.first.return_value = sample_session
        
        # Mock change log data
        mock_changes = [
            Mock(
                change_type='amount_changed',
                employee_name='John Doe',
                change_timestamp=datetime.now(timezone.utc),
                requires_review=False,
                change_confidence=0.95
            ),
            Mock(
                change_type='new',
                employee_name='Jane Smith',
                change_timestamp=datetime.now(timezone.utc),
                requires_review=True,
                change_confidence=0.85
            )
        ]
        
        mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = mock_changes
        
        with patch('app.api.phase4_endpoints.get_db', return_value=mock_db), \
             patch('app.api.phase4_endpoints.get_current_user', return_value=mock_user):
            
            response = client.get(f"/api/phase4/sessions/{sample_session.session_id}/change-summary")
            
            assert response.status_code == 200
            data = response.json()
            assert data["total_changes"] == 2
            assert data["by_type"]["amount_changed"] == 1
            assert data["by_type"]["new"] == 1
            assert data["requires_review"] == 1
    
    def test_get_reprocess_status_success(self, client, mock_db, mock_user, sample_session):
        """Test successful reprocess status retrieval"""
        mock_db.query.return_value.filter.return_value.first.return_value = sample_session
        
        # Mock receipt version data
        mock_version = Mock()
        mock_version.version_number = 2
        mock_version.processing_status = 'completed'
        mock_version.uploaded_at = datetime.now(timezone.utc)
        
        mock_db.query.return_value.filter.return_value.order_by.return_value.first.return_value = mock_version
        mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
        
        with patch('app.api.phase4_endpoints.get_db', return_value=mock_db), \
             patch('app.api.phase4_endpoints.get_current_user', return_value=mock_user):
            
            response = client.get(f"/api/phase4/sessions/{sample_session.session_id}/reprocess-status")
            
            assert response.status_code == 200
            data = response.json()
            assert data["session_id"] == str(sample_session.session_id)
            assert data["session_status"] == sample_session.status
            assert data["receipt_versions"] == sample_session.receipt_file_versions
    
    def test_unauthorized_access(self, client, mock_db, mock_user, sample_session):
        """Test unauthorized access to session operations"""
        # Mock different user
        other_user = Mock()
        other_user.username = "otheruser"
        other_user.is_admin = False
        
        sample_session.created_by = "DOMAIN\\testuser"  # Different from other_user
        
        mock_db.query.return_value.filter.return_value.first.return_value = sample_session
        
        with patch('app.api.phase4_endpoints.get_db', return_value=mock_db), \
             patch('app.api.phase4_endpoints.get_current_user', return_value=other_user):
            
            response = client.get(f"/api/phase4/sessions/{sample_session.session_id}/export-summary")
            
            assert response.status_code == 403
            assert "Access denied" in response.json()["detail"]


class TestReceiptComparisonEngine:
    """Test suite for receipt comparison engine"""
    
    def test_detect_changes_no_changes(self):
        """Test change detection with no changes"""
        from app.services.receipt_reprocessing_service import ReceiptComparisonEngine
        
        engine = ReceiptComparisonEngine()
        
        # Mock old employees
        old_emp = Mock()
        old_emp.employee_name = "John Doe"
        old_emp.employee_id = "EMP001"
        old_emp.receipt_amount = 100.0
        
        # Mock new receipt data (same as old)
        new_receipt_data = [
            {
                'employee_name': 'John Doe',
                'employee_id': 'EMP001',
                'amount': 100.0
            }
        ]
        
        changes = engine.detect_changes([old_emp], new_receipt_data)
        
        assert changes['change_summary']['unchanged_count'] == 1
        assert changes['change_summary']['changed_count'] == 0
        assert changes['change_summary']['new_count'] == 0
        assert changes['change_summary']['removed_count'] == 0
    
    def test_detect_changes_amount_changed(self):
        """Test change detection with amount changes"""
        from app.services.receipt_reprocessing_service import ReceiptComparisonEngine
        
        engine = ReceiptComparisonEngine()
        
        # Mock old employees
        old_emp = Mock()
        old_emp.employee_name = "John Doe"
        old_emp.employee_id = "EMP001"
        old_emp.receipt_amount = 100.0
        
        # Mock new receipt data (amount changed)
        new_receipt_data = [
            {
                'employee_name': 'John Doe',
                'employee_id': 'EMP001',
                'amount': 150.0
            }
        ]
        
        changes = engine.detect_changes([old_emp], new_receipt_data)
        
        assert changes['change_summary']['changed_count'] == 1
        assert changes['change_summary']['unchanged_count'] == 0
        assert len(changes['changed_employees']) == 1
        assert changes['changed_employees'][0]['changes']['amount_changed'] == True


if __name__ == "__main__":
    pytest.main([__file__])

