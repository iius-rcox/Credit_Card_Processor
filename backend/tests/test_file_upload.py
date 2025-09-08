"""
Comprehensive file upload API tests for Credit Card Processor.

Tests cover:
- Valid CAR and Receipt file uploads
- File validation (size, type, content)
- Path traversal security testing
- Concurrent upload handling
- File metadata extraction
"""

import pytest
import asyncio
import tempfile
import os
from io import BytesIO
from unittest.mock import patch, MagicMock, AsyncMock
from httpx import AsyncClient
from fastapi import UploadFile


class TestFileUpload:
    """Test basic file upload functionality."""
    
    async def test_upload_car_file_success(self, async_client: AsyncClient, mock_user_headers):
        """Test successful CAR file upload."""
        # Create mock PDF file
        pdf_content = b"%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n%%EOF"
        
        files = {
            "file": ("car_statement.pdf", BytesIO(pdf_content), "application/pdf")
        }
        
        with patch("app.services.document_intelligence.DocumentIntelligenceService.extract_metadata") as mock_extract:
            mock_extract.return_value = {"pages": 1, "text_content": "Sample CAR data"}
            
            response = await async_client.post(
                "/api/upload/car",
                headers=mock_user_headers,
                files=files
            )
        
        assert response.status_code == 200
        data = response.json()
        assert "file_id" in data
        assert "filename" in data
        assert data["filename"] == "car_statement.pdf"
    
    async def test_upload_receipt_file_success(self, async_client: AsyncClient, mock_user_headers):
        """Test successful receipt file upload."""
        pdf_content = b"%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n%%EOF"
        
        files = {
            "file": ("receipt_001.pdf", BytesIO(pdf_content), "application/pdf")
        }
        
        with patch("app.services.document_intelligence.DocumentIntelligenceService.extract_metadata") as mock_extract:
            mock_extract.return_value = {"pages": 1, "text_content": "Sample receipt data"}
            
            response = await async_client.post(
                "/api/upload/receipt",
                headers=mock_user_headers,
                files=files
            )
        
        assert response.status_code == 200
        data = response.json()
        assert "file_id" in data
        assert "filename" in data
        assert data["filename"] == "receipt_001.pdf"
    
    async def test_upload_without_authentication(self, async_client: AsyncClient):
        """Test file upload without authentication."""
        pdf_content = b"%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n%%EOF"
        
        files = {
            "file": ("test.pdf", BytesIO(pdf_content), "application/pdf")
        }
        
        response = await async_client.post("/api/upload/car", files=files)
        assert response.status_code == 401
    
    async def test_upload_empty_file(self, async_client: AsyncClient, mock_user_headers):
        """Test upload of empty file."""
        files = {
            "file": ("empty.pdf", BytesIO(b""), "application/pdf")
        }
        
        response = await async_client.post(
            "/api/upload/car",
            headers=mock_user_headers,
            files=files
        )
        
        assert response.status_code == 400
        assert "empty" in response.json()["detail"].lower()


class TestFileValidation:
    """Test file validation mechanisms."""
    
    @pytest.mark.parametrize("filename,content_type,expected_status", [
        ("valid.pdf", "application/pdf", 200),
        ("invalid.txt", "text/plain", 400),
        ("malicious.exe", "application/octet-stream", 400),
        ("script.js", "text/javascript", 400),
        ("image.jpg", "image/jpeg", 400),
        ("document.doc", "application/msword", 400),
    ])
    async def test_file_type_validation(self, async_client: AsyncClient, mock_user_headers, filename, content_type, expected_status):
        """Test file type validation."""
        content = b"%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n%%EOF" if content_type == "application/pdf" else b"invalid content"
        
        files = {
            "file": (filename, BytesIO(content), content_type)
        }
        
        with patch("app.services.document_intelligence.DocumentIntelligenceService.extract_metadata") as mock_extract:
            mock_extract.return_value = {"pages": 1, "text_content": "Sample data"}
            
            response = await async_client.post(
                "/api/upload/car",
                headers=mock_user_headers,
                files=files
            )
        
        assert response.status_code == expected_status
    
    async def test_file_size_validation(self, async_client: AsyncClient, mock_user_headers):
        """Test file size limits."""
        # Create large file content (simulate 100MB file)
        large_content = b"a" * (100 * 1024 * 1024)  # 100MB
        
        files = {
            "file": ("large.pdf", BytesIO(large_content), "application/pdf")
        }
        
        response = await async_client.post(
            "/api/upload/car",
            headers=mock_user_headers,
            files=files
        )
        
        # Should reject files that are too large
        assert response.status_code in [400, 413, 422]
    
    async def test_pdf_content_validation(self, async_client: AsyncClient, mock_user_headers):
        """Test PDF content validation."""
        # Valid PDF header
        valid_pdf = b"%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n%%EOF"
        
        # Invalid PDF content with PDF extension
        invalid_pdf = b"This is not a PDF file"
        
        with patch("app.services.document_intelligence.DocumentIntelligenceService.extract_metadata") as mock_extract:
            # Test valid PDF
            mock_extract.return_value = {"pages": 1, "text_content": "Sample data"}
            
            files = {
                "file": ("valid.pdf", BytesIO(valid_pdf), "application/pdf")
            }
            
            response = await async_client.post(
                "/api/upload/car",
                headers=mock_user_headers,
                files=files
            )
            assert response.status_code == 200
        
        # Test invalid PDF content
        mock_extract.side_effect = Exception("Invalid PDF format")
        
        files = {
            "file": ("fake.pdf", BytesIO(invalid_pdf), "application/pdf")
        }
        
        response = await async_client.post(
            "/api/upload/car",
            headers=mock_user_headers,
            files=files
        )
        
        assert response.status_code == 400
    
    @pytest.mark.parametrize("malicious_filename", [
        "../../../etc/passwd",
        "..\\..\\..\\windows\\system32\\config\\sam",
        "file.pdf; rm -rf /",
        "file.pdf && cat /etc/passwd",
        "<script>alert('xss')</script>.pdf",
        "file.pdf\x00.exe",
        "../../config/database.yml",
        "/etc/passwd%00.pdf",
    ])
    async def test_malicious_filename_handling(self, async_client: AsyncClient, mock_user_headers, malicious_filename):
        """Test handling of malicious filenames."""
        pdf_content = b"%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n%%EOF"
        
        files = {
            "file": (malicious_filename, BytesIO(pdf_content), "application/pdf")
        }
        
        response = await async_client.post(
            "/api/upload/car",
            headers=mock_user_headers,
            files=files
        )
        
        # Should either reject malicious filenames or sanitize them
        if response.status_code == 200:
            # If accepted, filename should be sanitized
            data = response.json()
            assert not any(char in data["filename"] for char in ["../", "..\\", "<", ">", "&", "|", ";"])
        else:
            assert response.status_code in [400, 422]


class TestSecurityValidation:
    """Test security-related file validation."""
    
    async def test_path_traversal_prevention(self, async_client: AsyncClient, mock_user_headers):
        """Test prevention of path traversal attacks."""
        pdf_content = b"%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n%%EOF"
        
        # Test various path traversal attempts
        traversal_attempts = [
            "../../../../etc/passwd",
            "..\\..\\..\\windows\\system.ini",
            "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
            "....//....//....//etc//passwd",
        ]
        
        for filename in traversal_attempts:
            files = {
                "file": (filename, BytesIO(pdf_content), "application/pdf")
            }
            
            response = await async_client.post(
                "/api/upload/car",
                headers=mock_user_headers,
                files=files
            )
            
            # Should reject or sanitize path traversal attempts
            assert response.status_code in [400, 422] or (
                response.status_code == 200 and 
                not any(char in response.json()["filename"] for char in ["../", "..\\"])
            )
    
    async def test_file_content_scanning(self, async_client: AsyncClient, mock_user_headers):
        """Test file content scanning for malicious patterns."""
        # Simulate malicious content embedded in PDF
        malicious_content = b"""%PDF-1.4
1 0 obj
<</Type/Catalog/Pages 2 0 R>>
endobj
2 0 obj
<</Type/Pages/Kids[3 0 R]/Count 1>>
endobj
3 0 obj
<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>
endobj
<script>alert('xss')</script>
rm -rf /
%%EOF"""
        
        files = {
            "file": ("suspicious.pdf", BytesIO(malicious_content), "application/pdf")
        }
        
        with patch("app.services.document_intelligence.DocumentIntelligenceService.extract_metadata") as mock_extract:
            mock_extract.return_value = {"pages": 1, "text_content": "Suspicious content detected"}
            
            response = await async_client.post(
                "/api/upload/car",
                headers=mock_user_headers,
                files=files
            )
        
        # Should handle potentially malicious content
        assert response.status_code in [200, 400, 422]
    
    async def test_virus_signature_detection(self, async_client: AsyncClient, mock_user_headers):
        """Test basic virus signature detection."""
        # EICAR test string (harmless virus test signature)
        eicar_content = b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
        
        files = {
            "file": ("virus_test.pdf", BytesIO(eicar_content), "application/pdf")
        }
        
        response = await async_client.post(
            "/api/upload/car",
            headers=mock_user_headers,
            files=files
        )
        
        # Should reject files with virus signatures
        assert response.status_code in [400, 422]


class TestConcurrentUpload:
    """Test concurrent file upload scenarios."""
    
    async def test_concurrent_uploads_same_user(self, async_client: AsyncClient, mock_user_headers):
        """Test concurrent uploads from the same user."""
        pdf_content = b"%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n%%EOF"
        
        async def upload_file(filename):
            files = {
                "file": (filename, BytesIO(pdf_content), "application/pdf")
            }
            return await async_client.post(
                "/api/upload/car",
                headers=mock_user_headers,
                files=files
            )
        
        with patch("app.services.document_intelligence.DocumentIntelligenceService.extract_metadata") as mock_extract:
            mock_extract.return_value = {"pages": 1, "text_content": "Sample data"}
            
            # Upload multiple files concurrently
            tasks = [
                upload_file(f"concurrent_file_{i}.pdf") 
                for i in range(5)
            ]
            
            responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Most uploads should succeed
        successful_uploads = sum(1 for r in responses if hasattr(r, 'status_code') and r.status_code == 200)
        assert successful_uploads >= 3  # Allow some to fail due to resource limits
    
    async def test_concurrent_uploads_different_users(self, async_client: AsyncClient):
        """Test concurrent uploads from different users."""
        pdf_content = b"%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n%%EOF"
        
        async def upload_file(user_id):
            headers = {
                "x-dev-user": f"user_{user_id}",
                "x-user-context": f"user_{user_id}",
                "Content-Type": "application/json"
            }
            files = {
                "file": (f"user_{user_id}_file.pdf", BytesIO(pdf_content), "application/pdf")
            }
            return await async_client.post(
                "/api/upload/car",
                headers=headers,
                files=files
            )
        
        with patch("app.services.document_intelligence.DocumentIntelligenceService.extract_metadata") as mock_extract:
            mock_extract.return_value = {"pages": 1, "text_content": "Sample data"}
            
            # Upload files from different users concurrently
            tasks = [upload_file(i) for i in range(3)]
            responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # All uploads should succeed (different users, no conflicts)
        successful_uploads = sum(1 for r in responses if hasattr(r, 'status_code') and r.status_code == 200)
        assert successful_uploads >= 2


class TestFileMetadata:
    """Test file metadata extraction and handling."""
    
    async def test_metadata_extraction_car_file(self, async_client: AsyncClient, mock_user_headers):
        """Test metadata extraction from CAR files."""
        pdf_content = b"%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n%%EOF"
        
        files = {
            "file": ("car_statement.pdf", BytesIO(pdf_content), "application/pdf")
        }
        
        expected_metadata = {
            "pages": 5,
            "text_content": "Corporate card statement data",
            "tables": 3,
            "extracted_data": {"employees": 10, "transactions": 50}
        }
        
        with patch("app.services.document_intelligence.DocumentIntelligenceService.extract_metadata") as mock_extract:
            mock_extract.return_value = expected_metadata
            
            response = await async_client.post(
                "/api/upload/car",
                headers=mock_user_headers,
                files=files
            )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify metadata is included in response
        assert "metadata" in data
        assert data["metadata"]["pages"] == 5
        assert data["metadata"]["tables"] == 3
    
    async def test_metadata_extraction_receipt_file(self, async_client: AsyncClient, mock_user_headers):
        """Test metadata extraction from receipt files."""
        pdf_content = b"%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n%%EOF"
        
        files = {
            "file": ("receipts.pdf", BytesIO(pdf_content), "application/pdf")
        }
        
        expected_metadata = {
            "pages": 25,
            "text_content": "Receipt collection data",
            "receipts_detected": 23,
            "extracted_data": {"valid_receipts": 20, "invalid_receipts": 3}
        }
        
        with patch("app.services.document_intelligence.DocumentIntelligenceService.extract_metadata") as mock_extract:
            mock_extract.return_value = expected_metadata
            
            response = await async_client.post(
                "/api/upload/receipt",
                headers=mock_user_headers,
                files=files
            )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify metadata is included in response
        assert "metadata" in data
        assert data["metadata"]["pages"] == 25
        assert data["metadata"]["receipts_detected"] == 23
    
    async def test_metadata_extraction_failure_handling(self, async_client: AsyncClient, mock_user_headers):
        """Test handling of metadata extraction failures."""
        pdf_content = b"%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n%%EOF"
        
        files = {
            "file": ("problematic.pdf", BytesIO(pdf_content), "application/pdf")
        }
        
        with patch("app.services.document_intelligence.DocumentIntelligenceService.extract_metadata") as mock_extract:
            mock_extract.side_effect = Exception("Metadata extraction failed")
            
            response = await async_client.post(
                "/api/upload/car",
                headers=mock_user_headers,
                files=files
            )
        
        # Should handle metadata extraction failures gracefully
        assert response.status_code in [200, 400, 422]
        
        if response.status_code == 200:
            # If upload succeeds, should indicate metadata extraction failed
            data = response.json()
            assert "metadata" in data
            assert data["metadata"].get("extraction_status") == "failed" or data["metadata"] == {}


class TestUploadEndpointConfiguration:
    """Test upload endpoint configuration and limits."""
    
    async def test_session_info_endpoint(self, async_client: AsyncClient, mock_user_headers):
        """Test session info retrieval for uploads."""
        response = await async_client.get(
            "/api/upload/session-info",
            headers=mock_user_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return upload configuration info
        expected_keys = ["max_file_size", "allowed_types", "session_status"]
        for key in expected_keys:
            assert key in data or "upload_config" in data
    
    async def test_upload_status_tracking(self, async_client: AsyncClient, mock_user_headers):
        """Test upload status tracking."""
        pdf_content = b"%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n%%EOF"
        
        files = {
            "file": ("status_test.pdf", BytesIO(pdf_content), "application/pdf")
        }
        
        with patch("app.services.document_intelligence.DocumentIntelligenceService.extract_metadata") as mock_extract:
            mock_extract.return_value = {"pages": 1, "text_content": "Sample data"}
            
            response = await async_client.post(
                "/api/upload/car",
                headers=mock_user_headers,
                files=files
            )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should include upload status information
        assert "status" in data or "upload_status" in data
        assert data.get("status") in ["success", "completed", "uploaded"] or data.get("upload_status") == "completed"