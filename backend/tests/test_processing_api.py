"""
Comprehensive processing API tests for Credit Card Processor.

Tests cover:
- Start/pause/resume/cancel processing
- Processing state management
- Employee data merging logic
- Validation status handling
- Error recovery
"""

import pytest
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from httpx import AsyncClient
from app.models import ProcessingStatus, ValidationStatus


class TestProcessingLifecycle:
    """Test processing lifecycle management."""
    
    async def test_start_processing_success(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test successful processing start."""
        # Create session first
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        assert session_response.status_code == 201
        session_id = session_response.json()["session_id"]
        
        # Start processing
        with patch("app.services.delta_aware_processor.DeltaAwareProcessor.process_documents") as mock_process:
            mock_process.return_value = AsyncMock()
            
            response = await async_client.post(
                f"/api/processing/{session_id}/start",
                headers=mock_user_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "processing" or data["status"] == "started"
        assert "processing_id" in data
    
    async def test_start_processing_without_files(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test processing start without uploaded files."""
        # Create session without files
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        assert session_response.status_code == 201
        session_id = session_response.json()["session_id"]
        
        # Try to start processing
        response = await async_client.post(
            f"/api/processing/{session_id}/start",
            headers=mock_user_headers
        )
        
        assert response.status_code == 400
        assert "files" in response.json()["detail"].lower() or "upload" in response.json()["detail"].lower()
    
    async def test_pause_processing(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test processing pause functionality."""
        # Create session and start processing
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        with patch("app.services.delta_aware_processor.DeltaAwareProcessor.process_documents") as mock_process:
            mock_process.return_value = AsyncMock()
            
            # Start processing
            await async_client.post(
                f"/api/processing/{session_id}/start",
                headers=mock_user_headers
            )
            
            # Pause processing
            response = await async_client.post(
                f"/api/processing/{session_id}/pause",
                headers=mock_user_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "paused"
    
    async def test_resume_processing(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test processing resume functionality."""
        # Create session, start, and pause processing
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        with patch("app.services.delta_aware_processor.DeltaAwareProcessor.process_documents") as mock_process:
            mock_process.return_value = AsyncMock()
            
            # Start and pause processing
            await async_client.post(f"/api/processing/{session_id}/start", headers=mock_user_headers)
            await async_client.post(f"/api/processing/{session_id}/pause", headers=mock_user_headers)
            
            # Resume processing
            response = await async_client.post(
                f"/api/processing/{session_id}/resume",
                headers=mock_user_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["processing", "resumed"]
    
    async def test_cancel_processing(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test processing cancellation."""
        # Create session and start processing
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        with patch("app.services.delta_aware_processor.DeltaAwareProcessor.process_documents") as mock_process:
            mock_process.return_value = AsyncMock()
            
            # Start processing
            await async_client.post(f"/api/processing/{session_id}/start", headers=mock_user_headers)
            
            # Cancel processing
            response = await async_client.post(
                f"/api/processing/{session_id}/cancel",
                headers=mock_user_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["cancelled", "canceled"]
    
    async def test_processing_status_retrieval(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test processing status retrieval."""
        # Create session
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        # Get processing status
        response = await async_client.get(
            f"/api/processing/{session_id}/status",
            headers=mock_user_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "progress" in data or "progress_percentage" in data
        assert "start_time" in data or "created_at" in data


class TestProcessingStateManagement:
    """Test processing state management."""
    
    async def test_invalid_state_transitions(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test invalid processing state transitions."""
        # Create session
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        # Try to pause without starting
        response = await async_client.post(
            f"/api/processing/{session_id}/pause",
            headers=mock_user_headers
        )
        assert response.status_code == 400
        
        # Try to resume without pausing
        response = await async_client.post(
            f"/api/processing/{session_id}/resume",
            headers=mock_user_headers
        )
        assert response.status_code == 400
    
    async def test_concurrent_processing_requests(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test concurrent processing requests on same session."""
        # Create session
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        with patch("app.services.delta_aware_processor.DeltaAwareProcessor.process_documents") as mock_process:
            mock_process.return_value = AsyncMock()
            
            # Try to start processing multiple times concurrently
            tasks = [
                async_client.post(f"/api/processing/{session_id}/start", headers=mock_user_headers)
                for _ in range(3)
            ]
            
            responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Only one should succeed, others should fail
        successful_starts = sum(1 for r in responses if hasattr(r, 'status_code') and r.status_code == 200)
        assert successful_starts == 1
    
    async def test_processing_with_different_options(self, async_client: AsyncClient, mock_user_headers):
        """Test processing with different configuration options."""
        processing_configs = [
            {
                "session_name": "Validation Enabled",
                "processing_options": {
                    "validation_enabled": True,
                    "auto_resolution_enabled": False,
                    "email_notifications": True
                }
            },
            {
                "session_name": "Auto Resolution",
                "processing_options": {
                    "validation_enabled": True,
                    "auto_resolution_enabled": True,
                    "email_notifications": False
                }
            },
            {
                "session_name": "Minimal Processing",
                "processing_options": {
                    "validation_enabled": False,
                    "auto_resolution_enabled": False,
                    "email_notifications": False
                }
            }
        ]
        
        for config in processing_configs:
            # Create session with specific config
            session_response = await async_client.post(
                "/api/sessions/",
                headers=mock_user_headers,
                json=config
            )
            assert session_response.status_code == 201
            session_id = session_response.json()["session_id"]
            
            # Verify configuration is stored
            session_detail_response = await async_client.get(
                f"/api/sessions/{session_id}",
                headers=mock_user_headers
            )
            assert session_detail_response.status_code == 200
            session_data = session_detail_response.json()
            assert session_data["processing_options"] == config["processing_options"]


class TestEmployeeDataMerging:
    """Test employee data merging logic."""
    
    async def test_employee_merge_success(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test successful employee data merging."""
        # Create session
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        mock_employee_data = {
            "employees": [
                {
                    "id": "emp_001",
                    "name": "John Doe",
                    "transactions": [
                        {"amount": 50.00, "date": "2024-01-01", "description": "Office supplies"}
                    ]
                },
                {
                    "id": "emp_002", 
                    "name": "Jane Smith",
                    "transactions": [
                        {"amount": 25.00, "date": "2024-01-02", "description": "Coffee"}
                    ]
                }
            ]
        }
        
        with patch("app.services.employee_merger.EmployeeMerger.merge_employee_data") as mock_merge:
            mock_merge.return_value = mock_employee_data
            
            # Start processing
            with patch("app.services.delta_aware_processor.DeltaAwareProcessor.process_documents") as mock_process:
                mock_process.return_value = AsyncMock()
                
                response = await async_client.post(
                    f"/api/processing/{session_id}/start",
                    headers=mock_user_headers
                )
        
        assert response.status_code == 200
        
        # Verify merge was called
        mock_merge.assert_called_once()
    
    async def test_employee_merge_with_conflicts(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test employee data merging with conflicts."""
        # Create session
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        with patch("app.services.employee_merger.EmployeeMerger.merge_employee_data") as mock_merge:
            # Simulate merge conflicts
            mock_merge.side_effect = Exception("Employee data merge conflict detected")
            
            with patch("app.services.delta_aware_processor.DeltaAwareProcessor.process_documents") as mock_process:
                mock_process.return_value = AsyncMock()
                
                response = await async_client.post(
                    f"/api/processing/{session_id}/start",
                    headers=mock_user_headers
                )
        
        # Should handle merge conflicts gracefully
        assert response.status_code in [200, 400, 422]
    
    async def test_employee_merge_validation(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test employee merge validation logic."""
        # Create session with validation enabled
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        mock_validation_results = {
            "validation_status": "completed",
            "issues_found": [
                {
                    "employee_id": "emp_001",
                    "issue_type": "missing_receipt",
                    "description": "Transaction without corresponding receipt",
                    "severity": "medium"
                }
            ],
            "total_employees": 10,
            "validated_employees": 9,
            "issues_count": 1
        }
        
        with patch("app.services.validation_engine.ValidationEngine.validate_merged_data") as mock_validate:
            mock_validate.return_value = mock_validation_results
            
            with patch("app.services.delta_aware_processor.DeltaAwareProcessor.process_documents") as mock_process:
                mock_process.return_value = AsyncMock()
                
                response = await async_client.post(
                    f"/api/processing/{session_id}/start",
                    headers=mock_user_headers
                )
        
        assert response.status_code == 200
        
        # Verify validation was called
        mock_validate.assert_called_once()


class TestValidationStatusHandling:
    """Test validation status handling."""
    
    async def test_validation_results_retrieval(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test retrieval of validation results."""
        # Create and start processing session
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        # Get validation status
        response = await async_client.get(
            f"/api/processing/{session_id}/validation",
            headers=mock_user_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should contain validation information
        expected_keys = ["validation_status", "issues", "summary", "total_issues"]
        assert any(key in data for key in expected_keys)
    
    async def test_validation_issue_resolution(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test validation issue resolution."""
        # Create session
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        # Mock issue ID
        issue_id = "issue_001"
        
        resolution_data = {
            "resolution_type": "manual_override",
            "resolution_notes": "Manager approved exception",
            "resolved_by": "testuser"
        }
        
        with patch("app.services.issue_resolution.IssueResolutionService.resolve_issue") as mock_resolve:
            mock_resolve.return_value = {"status": "resolved", "issue_id": issue_id}
            
            response = await async_client.post(
                f"/api/processing/{session_id}/issues/{issue_id}/resolve",
                headers=mock_user_headers,
                json=resolution_data
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "resolved"
        
        # Verify resolution was called
        mock_resolve.assert_called_once()
    
    @pytest.mark.parametrize("validation_scenario", [
        {"enabled": True, "auto_resolve": False, "expected_issues": 5},
        {"enabled": True, "auto_resolve": True, "expected_issues": 2},
        {"enabled": False, "auto_resolve": False, "expected_issues": 0},
    ])
    async def test_validation_configuration_impact(self, async_client: AsyncClient, mock_user_headers, validation_scenario):
        """Test impact of validation configuration on results."""
        session_data = {
            "session_name": f"Validation Test {validation_scenario}",
            "processing_options": {
                "validation_enabled": validation_scenario["enabled"],
                "auto_resolution_enabled": validation_scenario["auto_resolve"],
                "email_notifications": False
            }
        }
        
        # Create session with specific validation config
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=session_data
        )
        session_id = session_response.json()["session_id"]
        
        mock_results = {
            "validation_status": "completed" if validation_scenario["enabled"] else "skipped",
            "issues_found": [{"issue": f"issue_{i}"} for i in range(validation_scenario["expected_issues"])],
            "total_issues": validation_scenario["expected_issues"]
        }
        
        with patch("app.services.validation_engine.ValidationEngine.validate_merged_data") as mock_validate:
            mock_validate.return_value = mock_results
            
            # Get validation results
            response = await async_client.get(
                f"/api/processing/{session_id}/validation",
                headers=mock_user_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        
        if validation_scenario["enabled"]:
            mock_validate.assert_called_once()
        else:
            # Validation should be skipped if disabled
            assert data.get("validation_status") in ["disabled", "skipped", "not_enabled"]


class TestErrorRecovery:
    """Test error recovery mechanisms."""
    
    async def test_processing_error_recovery(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test recovery from processing errors."""
        # Create session
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        with patch("app.services.delta_aware_processor.DeltaAwareProcessor.process_documents") as mock_process:
            # Simulate processing error
            mock_process.side_effect = Exception("Processing failed due to memory error")
            
            response = await async_client.post(
                f"/api/processing/{session_id}/start",
                headers=mock_user_headers
            )
        
        # Should handle processing errors gracefully
        assert response.status_code in [400, 422, 500]
        
        # Verify error is logged and session status is updated appropriately
        status_response = await async_client.get(
            f"/api/processing/{session_id}/status",
            headers=mock_user_headers
        )
        
        if status_response.status_code == 200:
            status_data = status_response.json()
            assert status_data["status"] in ["error", "failed", "stopped"]
    
    async def test_processing_retry_mechanism(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test processing retry mechanism."""
        # Create session
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        # Simulate failed processing
        with patch("app.services.delta_aware_processor.DeltaAwareProcessor.process_documents") as mock_process:
            mock_process.side_effect = Exception("Temporary processing error")
            
            await async_client.post(
                f"/api/processing/{session_id}/start",
                headers=mock_user_headers
            )
        
        # Try to retry processing
        with patch("app.services.delta_aware_processor.DeltaAwareProcessor.process_documents") as mock_process:
            mock_process.return_value = AsyncMock()  # Success on retry
            
            response = await async_client.post(
                f"/api/processing/{session_id}/retry",
                headers=mock_user_headers
            )
        
        # Retry should succeed
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["processing", "retrying", "started"]
    
    async def test_partial_processing_recovery(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test recovery from partial processing failures."""
        # Create session
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        # Simulate partial processing (some employees processed, some failed)
        partial_results = {
            "processed_employees": 5,
            "total_employees": 10,
            "failed_employees": 5,
            "processing_status": "partial_failure",
            "errors": ["Employee data corruption", "Missing transaction data"]
        }
        
        with patch("app.services.delta_aware_processor.DeltaAwareProcessor.process_documents") as mock_process:
            mock_process.return_value = AsyncMock()
            mock_process.return_value.get_results.return_value = partial_results
            
            response = await async_client.post(
                f"/api/processing/{session_id}/start",
                headers=mock_user_headers
            )
        
        assert response.status_code == 200
        
        # Check if partial results are available
        results_response = await async_client.get(
            f"/api/results/{session_id}",
            headers=mock_user_headers
        )
        
        if results_response.status_code == 200:
            results_data = results_response.json()
            # Should indicate partial completion
            assert "partial" in str(results_data).lower() or results_data.get("total_processed", 0) < results_data.get("total_expected", 10)


class TestProcessingConcurrency:
    """Test processing concurrency and resource management."""
    
    async def test_multiple_session_processing(self, async_client: AsyncClient, mock_user_headers):
        """Test processing multiple sessions concurrently."""
        sessions = []
        
        # Create multiple sessions
        for i in range(3):
            session_data = {
                "session_name": f"Concurrent Session {i}",
                "processing_options": {"validation_enabled": True}
            }
            
            response = await async_client.post(
                "/api/sessions/",
                headers=mock_user_headers,
                json=session_data
            )
            assert response.status_code == 201
            sessions.append(response.json()["session_id"])
        
        with patch("app.services.delta_aware_processor.DeltaAwareProcessor.process_documents") as mock_process:
            mock_process.return_value = AsyncMock()
            
            # Start processing on all sessions concurrently
            tasks = [
                async_client.post(f"/api/processing/{session_id}/start", headers=mock_user_headers)
                for session_id in sessions
            ]
            
            responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # At least some should succeed (depends on resource limits)
        successful_starts = sum(1 for r in responses if hasattr(r, 'status_code') and r.status_code == 200)
        assert successful_starts >= 1
    
    async def test_processing_resource_limits(self, async_client: AsyncClient, mock_user_headers):
        """Test processing behavior under resource limits."""
        # Create session
        session_data = {
            "session_name": "Resource Limit Test",
            "processing_options": {"validation_enabled": True}
        }
        
        response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=session_data
        )
        session_id = response.json()["session_id"]
        
        with patch("app.services.delta_aware_processor.DeltaAwareProcessor.process_documents") as mock_process:
            # Simulate resource exhaustion
            mock_process.side_effect = MemoryError("Insufficient memory for processing")
            
            response = await async_client.post(
                f"/api/processing/{session_id}/start",
                headers=mock_user_headers
            )
        
        # Should handle resource limits gracefully
        assert response.status_code in [400, 422, 500, 503]
        
        if response.status_code in [400, 422]:
            error_data = response.json()
            assert "memory" in error_data["detail"].lower() or "resource" in error_data["detail"].lower()