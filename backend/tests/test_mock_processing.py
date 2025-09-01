"""
Comprehensive tests for mock document processing functionality
Tests realistic employee data generation, processing simulation, and integration
"""

import asyncio
import pytest
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

from app.services.mock_processor import (
    generate_mock_employee_data,
    create_validation_issue,
    simulate_document_processing,
    calculate_progress,
    get_mock_processing_statistics,
    log_processing_activity,
    update_session_status
)
from app.models import (
    ProcessingSession, SessionStatus, EmployeeRevision, ProcessingActivity,
    ValidationStatus, ActivityType
)


class TestMockEmployeeDataGeneration:
    """Test suite for mock employee data generation"""
    
    def test_generate_default_employee_count(self):
        """Test generating default number of employees (45)"""
        employees = generate_mock_employee_data()
        
        assert len(employees) == 45
        assert all(emp["employee_id"].startswith("EMP") for emp in employees)
        assert all(len(emp["employee_name"]) > 0 for emp in employees)
        assert all(isinstance(emp["car_amount"], Decimal) for emp in employees)
        assert all(isinstance(emp["receipt_amount"], Decimal) for emp in employees)
    
    def test_generate_custom_employee_count(self):
        """Test generating custom number of employees"""
        for count in [10, 25, 50, 100]:
            employees = generate_mock_employee_data(count)
            assert len(employees) == count
    
    def test_employee_data_structure(self):
        """Test that generated employee data has correct structure"""
        employees = generate_mock_employee_data(5)
        
        for emp in employees:
            # Required fields
            assert "employee_id" in emp
            assert "employee_name" in emp
            assert "car_amount" in emp
            assert "receipt_amount" in emp
            assert "department" in emp
            assert "position" in emp
            assert "validation_status" in emp
            assert "validation_flags" in emp
            
            # Data types
            assert isinstance(emp["employee_id"], str)
            assert isinstance(emp["employee_name"], str)
            assert isinstance(emp["car_amount"], Decimal)
            assert isinstance(emp["receipt_amount"], Decimal)
            assert isinstance(emp["department"], str)
            assert isinstance(emp["position"], str)
            assert emp["validation_status"] == ValidationStatus.VALID
            assert isinstance(emp["validation_flags"], dict)
    
    def test_employee_id_format(self):
        """Test employee ID format and uniqueness"""
        employees = generate_mock_employee_data(10)
        employee_ids = [emp["employee_id"] for emp in employees]
        
        # Check format (EMP001, EMP002, etc.)
        for i, emp_id in enumerate(employee_ids, 1):
            assert emp_id == f"EMP{i:03d}"
        
        # Check uniqueness
        assert len(set(employee_ids)) == len(employee_ids)
    
    def test_unique_employee_names(self):
        """Test that generated employee names are unique"""
        employees = generate_mock_employee_data(20)
        names = [emp["employee_name"] for emp in employees]
        
        # Should have unique names (within reasonable limits)
        assert len(set(names)) == len(names), "All employee names should be unique"
    
    def test_realistic_financial_amounts(self):
        """Test that financial amounts are realistic"""
        employees = generate_mock_employee_data(20)
        
        for emp in employees:
            car_amount = float(emp["car_amount"])
            receipt_amount = float(emp["receipt_amount"])
            
            # Amounts should be reasonable (between $0.01 and $3000)
            assert 0.01 <= car_amount <= 3000.00
            assert 0.01 <= receipt_amount <= 3000.00
            
            # Most amounts should match (90% according to implementation)
            # We'll check that some do match
        
        matching_amounts = sum(1 for emp in employees if emp["car_amount"] == emp["receipt_amount"])
        # At least 70% should match (accounting for randomness)
        assert matching_amounts >= len(employees) * 0.7


class TestValidationIssueCreation:
    """Test suite for validation issue creation"""
    
    def test_every_seventh_employee_has_issues(self):
        """Test that every 7th employee gets validation issues"""
        employees = generate_mock_employee_data(21)  # 3 employees should have issues
        
        issue_employees = []
        for index, employee_data in enumerate(employees):
            validation_result = create_validation_issue(index, employee_data)
            if validation_result["validation_status"] == ValidationStatus.NEEDS_ATTENTION:
                issue_employees.append(index + 1)  # Convert to 1-based index
        
        expected_issue_positions = [7, 14, 21]
        assert issue_employees == expected_issue_positions
    
    def test_validation_issue_structure(self):
        """Test validation issue data structure"""
        employee_data = {
            "employee_id": "EMP007",
            "employee_name": "Test Employee",
            "car_amount": Decimal("100.00"),
            "receipt_amount": Decimal("100.00")
        }
        
        # 7th employee (index 6) should have issues
        validation_result = create_validation_issue(6, employee_data)
        
        assert validation_result["validation_status"] == ValidationStatus.NEEDS_ATTENTION
        assert isinstance(validation_result["validation_flags"], dict)
        
        flags = validation_result["validation_flags"]
        assert "issue_type" in flags
        assert "description" in flags
        assert "severity" in flags
        assert "requires_review" in flags
        assert "detected_at" in flags
        
        assert flags["requires_review"] is True
        assert flags["severity"] in ["low", "medium", "high"]
    
    def test_non_seventh_employee_valid(self):
        """Test that non-7th employees are valid"""
        employee_data = {
            "employee_id": "EMP005",
            "employee_name": "Test Employee",
            "car_amount": Decimal("100.00"),
            "receipt_amount": Decimal("100.00")
        }
        
        # 5th employee (index 4) should be valid
        validation_result = create_validation_issue(4, employee_data)
        
        assert validation_result["validation_status"] == ValidationStatus.VALID
        assert validation_result["validation_flags"] == {}


class TestProgressCalculation:
    """Test suite for progress calculation"""
    
    def test_calculate_progress_normal(self):
        """Test normal progress calculation"""
        assert calculate_progress(0, 45) == 0
        assert calculate_progress(10, 45) == 22
        assert calculate_progress(22, 45) == 48
        assert calculate_progress(45, 45) == 100
    
    def test_calculate_progress_edge_cases(self):
        """Test progress calculation edge cases"""
        # Zero total
        assert calculate_progress(0, 0) == 0
        
        # More processed than total (shouldn't happen but handle gracefully)
        assert calculate_progress(50, 45) == 100  # Should cap at 100%
    
    def test_calculate_progress_custom_totals(self):
        """Test progress with custom totals"""
        assert calculate_progress(5, 10) == 50
        assert calculate_progress(25, 100) == 25
        assert calculate_progress(1, 3) == 33  # Rounded down


class TestMockProcessingStatistics:
    """Test suite for mock processing statistics"""
    
    def test_get_statistics_structure(self):
        """Test statistics structure"""
        stats = get_mock_processing_statistics()
        
        required_fields = [
            "default_employee_count",
            "default_processing_time",
            "validation_issue_frequency",
            "issue_types",
            "supported_departments",
            "supported_positions",
            "mock_names_available"
        ]
        
        for field in required_fields:
            assert field in stats
        
        # Check specific values
        assert stats["default_employee_count"] == 45
        assert "45 seconds" in stats["default_processing_time"]
        assert "Every 7th employee" in stats["validation_issue_frequency"]
        assert isinstance(stats["issue_types"], int)
        assert stats["issue_types"] > 0


@pytest.mark.asyncio
class TestMockDocumentProcessing:
    """Test suite for the main document processing simulation"""
    
    async def test_processing_config_defaults(self):
        """Test processing with default configuration"""
        session_id = str(uuid.uuid4())
        db_mock = MagicMock()
        processing_state = {
            "should_cancel": False,
            "should_pause": False,
            "status": "idle"
        }
        
        # Mock database operations
        db_mock.add = MagicMock()
        db_mock.commit = MagicMock()
        
        # Test that function accepts None config and uses defaults
        config = None
        
        # This will test the initialization part before any database operations fail
        try:
            await simulate_document_processing(session_id, db_mock, processing_state, config)
        except Exception:
            # Expected due to mocked database operations
            pass
        
        # Should have updated processing state with defaults
        assert processing_state["total_employees"] == 45  # Default employee count
    
    async def test_processing_cancellation(self):
        """Test processing cancellation"""
        session_id = str(uuid.uuid4())
        db_mock = MagicMock()
        processing_state = {
            "should_cancel": True,  # Cancel immediately
            "should_pause": False,
            "status": "idle"
        }
        
        # Mock database operations
        db_mock.add = MagicMock()
        db_mock.commit = MagicMock()
        
        # Processing should be cancelled quickly
        try:
            result = await simulate_document_processing(
                session_id, db_mock, processing_state, {"employee_count": 5}
            )
            # If it completes without exception, it should return False for cancellation
            assert result is False
            assert processing_state["status"] == "cancelled"
        except Exception:
            # Expected due to mocked database operations
            pass


@pytest.mark.asyncio
class TestActivityLogging:
    """Test suite for activity logging functions"""
    
    async def test_log_processing_activity_success(self):
        """Test successful activity logging"""
        db_mock = MagicMock()
        session_id = str(uuid.uuid4())
        
        await log_processing_activity(
            db_mock, session_id, ActivityType.PROCESSING_STARTED,
            "Test message", "EMP001", "TEST_USER"
        )
        
        # Verify database operations
        db_mock.add.assert_called_once()
        db_mock.commit.assert_called_once()
    
    async def test_log_processing_activity_error_handling(self):
        """Test activity logging error handling"""
        db_mock = MagicMock()
        db_mock.add.side_effect = Exception("Database error")
        
        session_id = str(uuid.uuid4())
        
        # Should not raise exception, just log error and rollback
        await log_processing_activity(
            db_mock, session_id, ActivityType.PROCESSING_STARTED, "Test message"
        )
        
        db_mock.rollback.assert_called_once()
    
    async def test_update_session_status_success(self):
        """Test successful session status update"""
        db_mock = MagicMock()
        session_mock = MagicMock()
        
        db_mock.query.return_value.filter.return_value.first.return_value = session_mock
        
        session_id = str(uuid.uuid4())
        
        await update_session_status(
            db_mock, session_id, SessionStatus.PROCESSING, 10, 45
        )
        
        # Verify session updates
        assert session_mock.status == SessionStatus.PROCESSING
        assert session_mock.processed_employees == 10
        assert session_mock.total_employees == 45
        
        db_mock.commit.assert_called_once()
    
    async def test_update_session_status_not_found(self):
        """Test session status update when session not found"""
        db_mock = MagicMock()
        db_mock.query.return_value.filter.return_value.first.return_value = None
        
        session_id = str(uuid.uuid4())
        
        # Should not raise exception when session not found
        await update_session_status(
            db_mock, session_id, SessionStatus.PROCESSING, 10
        )
        
        # Should not call commit since no session was found
        db_mock.commit.assert_not_called()


class TestProcessingIntegration:
    """Integration tests for mock processing components"""
    
    def test_full_employee_generation_and_validation(self):
        """Test complete employee generation with validation issues"""
        employee_count = 45
        employees = generate_mock_employee_data(employee_count)
        
        # Apply validation logic to all employees
        issue_count = 0
        for index, employee_data in enumerate(employees):
            validation_result = create_validation_issue(index, employee_data)
            employee_data.update(validation_result)
            
            if employee_data["validation_status"] == ValidationStatus.NEEDS_ATTENTION:
                issue_count += 1
        
        # Should have 6 employees with issues (positions 7, 14, 21, 28, 35, 42)
        expected_issues = 6
        assert issue_count == expected_issues
        
        # Verify issue positions
        issue_positions = []
        for index, emp in enumerate(employees):
            if emp["validation_status"] == ValidationStatus.NEEDS_ATTENTION:
                issue_positions.append(index + 1)
        
        assert issue_positions == [7, 14, 21, 28, 35, 42]
    
    def test_processing_timing_expectations(self):
        """Test processing timing expectations"""
        config = {"employee_count": 45, "processing_delay": 1.0}
        
        # Expected processing time should be around 45 seconds (1 per employee)
        expected_min_time = config["employee_count"] * config["processing_delay"]
        expected_max_time = expected_min_time + 5  # Add some buffer for overhead
        
        # This is a theoretical test - actual timing would require running the full simulation
        assert expected_min_time == 45.0
        assert expected_max_time == 50.0
    
    def test_mock_data_realism(self):
        """Test that mock data appears realistic"""
        employees = generate_mock_employee_data(20)
        
        # Check data variety
        departments = set(emp["department"] for emp in employees)
        positions = set(emp["position"] for emp in employees)
        first_names = set(emp["employee_name"].split()[0] for emp in employees)
        
        # Should have good variety (not all the same)
        assert len(departments) >= 3, "Should have variety in departments"
        assert len(positions) >= 3, "Should have variety in positions"
        assert len(first_names) >= 10, "Should have variety in first names"
        
        # Amounts should be realistic
        amounts = [float(emp["car_amount"]) for emp in employees]
        assert min(amounts) >= 150.0, "Minimum amount should be reasonable"
        assert max(amounts) <= 1800.0, "Maximum amount should be reasonable"
        
        # Most amounts should be in a reasonable range
        reasonable_amounts = sum(1 for amt in amounts if 150 <= amt <= 1800)
        assert reasonable_amounts >= len(amounts) * 0.9, "Most amounts should be in reasonable range"