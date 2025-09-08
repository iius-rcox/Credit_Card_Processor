"""
Comprehensive export API tests for Credit Card Processor.

Tests cover:
- pVault CSV generation
- Excel report generation  
- PDF report generation
- Export history tracking
- File download functionality
"""

import pytest
import asyncio
from io import BytesIO
from unittest.mock import patch, MagicMock, AsyncMock
from httpx import AsyncClient


class TestExportFunctionality:
    """Test export functionality for different formats."""
    
    async def test_pvault_csv_export(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test pVault CSV export generation."""
        # Create and process session
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        # Mock CSV data
        mock_csv_content = """Employee_ID,Name,Amount,Date,Description
emp_001,John Doe,50.00,2024-01-01,Office supplies
emp_002,Jane Smith,25.00,2024-01-02,Coffee"""
        
        with patch("app.services.export_service.ExportService.generate_pvault_csv") as mock_export:
            mock_export.return_value = mock_csv_content
            
            response = await async_client.get(
                f"/api/export/{session_id}/pvault-csv",
                headers=mock_user_headers
            )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv"
        assert "Employee_ID" in response.text
        assert "John Doe" in response.text
    
    async def test_excel_report_export(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test Excel report generation."""
        # Create session
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        # Mock Excel file content
        mock_excel_content = b"Mock Excel file content"
        
        with patch("app.services.export_service.ExportService.generate_excel_report") as mock_export:
            mock_export.return_value = BytesIO(mock_excel_content)
            
            response = await async_client.get(
                f"/api/export/{session_id}/excel-report",
                headers=mock_user_headers
            )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        assert len(response.content) > 0
    
    async def test_pdf_report_export(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test PDF report generation."""
        # Create session
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        # Mock PDF content
        mock_pdf_content = b"%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n%%EOF"
        
        with patch("app.services.export_service.ExportService.generate_pdf_report") as mock_export:
            mock_export.return_value = BytesIO(mock_pdf_content)
            
            response = await async_client.get(
                f"/api/export/{session_id}/pdf-report",
                headers=mock_user_headers
            )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert response.content.startswith(b"%PDF")
    
    async def test_custom_format_export(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test custom format export with parameters."""
        # Create session
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        export_params = {
            "format": "custom_csv",
            "include_validation_notes": True,
            "date_format": "MM/DD/YYYY",
            "currency_symbol": "$"
        }
        
        mock_custom_content = """ID,Employee,Amount,Date,Notes
001,John Doe,$50.00,01/01/2024,Validated
002,Jane Smith,$25.00,01/02/2024,Pending validation"""
        
        with patch("app.services.export_service.ExportService.generate_custom_export") as mock_export:
            mock_export.return_value = mock_custom_content
            
            response = await async_client.post(
                f"/api/export/{session_id}/custom",
                headers=mock_user_headers,
                json=export_params
            )
        
        assert response.status_code == 200
        assert "$50.00" in response.text
        assert "01/01/2024" in response.text


class TestExportPermissions:
    """Test export permissions and access control."""
    
    async def test_export_without_authentication(self, async_client: AsyncClient, sample_session_data):
        """Test export without authentication."""
        # Try to export without headers
        response = await async_client.get("/api/export/fake-session-id/pvault-csv")
        
        assert response.status_code == 401
    
    async def test_export_unauthorized_session(self, async_client: AsyncClient, mock_user_headers):
        """Test export of session not owned by user."""
        # Create headers for different user
        other_user_headers = {
            "x-dev-user": "otheruser",
            "x-user-context": "otheruser",
            "Content-Type": "application/json"
        }
        
        # Create session as first user
        session_data = {
            "session_name": "User 1 Session",
            "processing_options": {"validation_enabled": True}
        }
        
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=session_data
        )
        session_id = session_response.json()["session_id"]
        
        # Try to export as different user
        response = await async_client.get(
            f"/api/export/{session_id}/pvault-csv",
            headers=other_user_headers
        )
        
        assert response.status_code in [403, 404]
    
    async def test_export_nonexistent_session(self, async_client: AsyncClient, mock_user_headers):
        """Test export of nonexistent session."""
        fake_session_id = "nonexistent-session-id"
        
        response = await async_client.get(
            f"/api/export/{fake_session_id}/pvault-csv",
            headers=mock_user_headers
        )
        
        assert response.status_code == 404
    
    async def test_admin_export_access(self, async_client: AsyncClient):
        """Test admin can export any session."""
        admin_headers = {
            "x-dev-user": "admin",
            "x-user-context": "admin",
            "x-user-role": "admin",
            "Content-Type": "application/json"
        }
        
        regular_user_headers = {
            "x-dev-user": "regularuser",
            "x-user-context": "regularuser",
            "Content-Type": "application/json"
        }
        
        # Create session as regular user
        session_data = {
            "session_name": "Regular User Session",
            "processing_options": {"validation_enabled": True}
        }
        
        session_response = await async_client.post(
            "/api/sessions/",
            headers=regular_user_headers,
            json=session_data
        )
        session_id = session_response.json()["session_id"]
        
        # Admin should be able to export
        with patch("app.services.export_service.ExportService.generate_pvault_csv") as mock_export:
            mock_export.return_value = "Employee_ID,Name\nemp_001,John Doe"
            
            response = await async_client.get(
                f"/api/export/{session_id}/pvault-csv",
                headers=admin_headers
            )
        
        assert response.status_code == 200


class TestExportDataIntegrity:
    """Test export data integrity and validation."""
    
    async def test_export_data_consistency(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test data consistency across different export formats."""
        # Create session
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        # Mock consistent data across formats
        mock_data = {
            "employees": [
                {"id": "emp_001", "name": "John Doe", "total_amount": 75.00},
                {"id": "emp_002", "name": "Jane Smith", "total_amount": 125.50}
            ],
            "total_amount": 200.50,
            "transaction_count": 15
        }
        
        with patch("app.services.export_service.ExportService.get_session_data") as mock_get_data:
            mock_get_data.return_value = mock_data
            
            with patch("app.services.export_service.ExportService.generate_pvault_csv") as mock_csv:
                mock_csv.return_value = "Employee_ID,Name,Total\nemp_001,John Doe,75.00\nemp_002,Jane Smith,125.50"
                
                csv_response = await async_client.get(
                    f"/api/export/{session_id}/pvault-csv",
                    headers=mock_user_headers
                )
            
            with patch("app.services.export_service.ExportService.generate_excel_report") as mock_excel:
                mock_excel.return_value = BytesIO(b"Mock Excel with same data")
                
                excel_response = await async_client.get(
                    f"/api/export/{session_id}/excel-report",
                    headers=mock_user_headers
                )
        
        # Both should succeed and contain consistent data
        assert csv_response.status_code == 200
        assert excel_response.status_code == 200
        assert "John Doe" in csv_response.text
        assert "75.00" in csv_response.text
    
    async def test_export_with_special_characters(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test export handling of special characters."""
        # Create session
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        # Mock data with special characters
        special_csv_content = '''Employee_ID,Name,Description
emp_001,"José García","Café & Restaurant"
emp_002,"李明","中文描述"
emp_003,"O'Connor","Quote's & "Double" test"'''
        
        with patch("app.services.export_service.ExportService.generate_pvault_csv") as mock_export:
            mock_export.return_value = special_csv_content
            
            response = await async_client.get(
                f"/api/export/{session_id}/pvault-csv",
                headers=mock_user_headers
            )
        
        assert response.status_code == 200
        assert "José García" in response.text
        assert "中文描述" in response.text
        assert '"Double"' in response.text
    
    async def test_export_large_dataset(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test export performance with large datasets."""
        # Create session
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        # Mock large CSV content (simulate 1000 employees)
        csv_header = "Employee_ID,Name,Amount,Date,Description\n"
        csv_rows = [f"emp_{i:03d},Employee {i},{i*10.50},2024-01-{(i%30)+1:02d},Transaction {i}" for i in range(1000)]
        large_csv_content = csv_header + "\n".join(csv_rows)
        
        with patch("app.services.export_service.ExportService.generate_pvault_csv") as mock_export:
            mock_export.return_value = large_csv_content
            
            response = await async_client.get(
                f"/api/export/{session_id}/pvault-csv",
                headers=mock_user_headers
            )
        
        assert response.status_code == 200
        assert "emp_999" in response.text
        assert len(response.text.split('\n')) > 1000  # Header + 1000 rows


class TestExportHistory:
    """Test export history tracking."""
    
    async def test_export_history_tracking(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test that exports are tracked in history."""
        # Create session
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        # Perform multiple exports
        with patch("app.services.export_service.ExportService.generate_pvault_csv") as mock_csv:
            mock_csv.return_value = "Employee_ID,Name\nemp_001,John Doe"
            
            await async_client.get(f"/api/export/{session_id}/pvault-csv", headers=mock_user_headers)
        
        with patch("app.services.export_service.ExportService.generate_excel_report") as mock_excel:
            mock_excel.return_value = BytesIO(b"Mock Excel content")
            
            await async_client.get(f"/api/export/{session_id}/excel-report", headers=mock_user_headers)
        
        # Check export history
        history_response = await async_client.get(
            f"/api/export/{session_id}/history",
            headers=mock_user_headers
        )
        
        assert history_response.status_code == 200
        history_data = history_response.json()
        
        assert len(history_data["exports"]) >= 2
        export_types = [exp["format"] for exp in history_data["exports"]]
        assert "pvault-csv" in export_types
        assert "excel-report" in export_types
    
    async def test_export_download_tracking(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test export download event tracking."""
        # Create session
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        with patch("app.services.export_service.ExportService.track_download") as mock_track:
            with patch("app.services.export_service.ExportService.generate_pvault_csv") as mock_export:
                mock_export.return_value = "Employee_ID,Name\nemp_001,John Doe"
                
                response = await async_client.get(
                    f"/api/export/{session_id}/pvault-csv?track_download=true",
                    headers=mock_user_headers
                )
        
        assert response.status_code == 200
        mock_track.assert_called_once()
    
    async def test_bulk_export_history(self, async_client: AsyncClient, mock_user_headers):
        """Test bulk export history across multiple sessions."""
        sessions = []
        
        # Create multiple sessions
        for i in range(3):
            session_data = {
                "session_name": f"Export Test Session {i}",
                "processing_options": {"validation_enabled": True}
            }
            
            response = await async_client.post(
                "/api/sessions/",
                headers=mock_user_headers,
                json=session_data
            )
            sessions.append(response.json()["session_id"])
        
        # Export from each session
        with patch("app.services.export_service.ExportService.generate_pvault_csv") as mock_export:
            mock_export.return_value = "Employee_ID,Name\nemp_001,John Doe"
            
            for session_id in sessions:
                await async_client.get(
                    f"/api/export/{session_id}/pvault-csv",
                    headers=mock_user_headers
                )
        
        # Get user's export history
        user_history_response = await async_client.get(
            "/api/export/history",
            headers=mock_user_headers
        )
        
        assert user_history_response.status_code == 200
        user_history = user_history_response.json()
        
        # Should show exports from all sessions
        assert len(user_history["recent_exports"]) >= 3


class TestExportErrorHandling:
    """Test export error handling scenarios."""
    
    async def test_export_processing_not_complete(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test export when processing is not complete."""
        # Create session but don't process
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        response = await async_client.get(
            f"/api/export/{session_id}/pvault-csv",
            headers=mock_user_headers
        )
        
        # Should return error or empty data with appropriate message
        assert response.status_code in [400, 422]
        if response.status_code in [400, 422]:
            error_data = response.json()
            assert "processing" in error_data["detail"].lower() or "not ready" in error_data["detail"].lower()
    
    async def test_export_generation_failure(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test handling of export generation failures."""
        # Create session
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        with patch("app.services.export_service.ExportService.generate_pvault_csv") as mock_export:
            mock_export.side_effect = Exception("Export generation failed")
            
            response = await async_client.get(
                f"/api/export/{session_id}/pvault-csv",
                headers=mock_user_headers
            )
        
        assert response.status_code == 500
        error_data = response.json()
        assert "error" in error_data["detail"].lower()
    
    async def test_export_timeout_handling(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test export timeout handling for large datasets."""
        # Create session
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        async def slow_export():
            await asyncio.sleep(30)  # Simulate very slow export
            return "Employee_ID,Name\nemp_001,John Doe"
        
        with patch("app.services.export_service.ExportService.generate_pvault_csv") as mock_export:
            mock_export.side_effect = asyncio.TimeoutError("Export generation timeout")
            
            response = await async_client.get(
                f"/api/export/{session_id}/pvault-csv",
                headers=mock_user_headers
            )
        
        assert response.status_code in [408, 500, 504]
    
    async def test_export_invalid_format_request(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test handling of invalid export format requests."""
        # Create session
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        # Request invalid export format
        response = await async_client.get(
            f"/api/export/{session_id}/invalid-format",
            headers=mock_user_headers
        )
        
        assert response.status_code == 404


class TestExportConcurrency:
    """Test export concurrency scenarios."""
    
    async def test_concurrent_exports_same_session(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test concurrent exports from the same session."""
        # Create session
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        with patch("app.services.export_service.ExportService.generate_pvault_csv") as mock_export:
            mock_export.return_value = "Employee_ID,Name\nemp_001,John Doe"
            
            # Perform concurrent exports
            tasks = [
                async_client.get(f"/api/export/{session_id}/pvault-csv", headers=mock_user_headers)
                for _ in range(5)
            ]
            
            responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # All exports should succeed
        successful_exports = sum(1 for r in responses if hasattr(r, 'status_code') and r.status_code == 200)
        assert successful_exports == 5
    
    async def test_concurrent_different_format_exports(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test concurrent exports of different formats."""
        # Create session
        session_response = await async_client.post(
            "/api/sessions/",
            headers=mock_user_headers,
            json=sample_session_data
        )
        session_id = session_response.json()["session_id"]
        
        async def export_csv():
            with patch("app.services.export_service.ExportService.generate_pvault_csv") as mock_export:
                mock_export.return_value = "Employee_ID,Name\nemp_001,John Doe"
                return await async_client.get(f"/api/export/{session_id}/pvault-csv", headers=mock_user_headers)
        
        async def export_excel():
            with patch("app.services.export_service.ExportService.generate_excel_report") as mock_export:
                mock_export.return_value = BytesIO(b"Mock Excel content")
                return await async_client.get(f"/api/export/{session_id}/excel-report", headers=mock_user_headers)
        
        async def export_pdf():
            with patch("app.services.export_service.ExportService.generate_pdf_report") as mock_export:
                mock_export.return_value = BytesIO(b"%PDF-1.4\nMock PDF")
                return await async_client.get(f"/api/export/{session_id}/pdf-report", headers=mock_user_headers)
        
        # Run different format exports concurrently
        csv_response, excel_response, pdf_response = await asyncio.gather(
            export_csv(), export_excel(), export_pdf(), return_exceptions=True
        )
        
        # All should succeed
        assert csv_response.status_code == 200
        assert excel_response.status_code == 200
        assert pdf_response.status_code == 200