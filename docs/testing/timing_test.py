#!/usr/bin/env python3
"""
Quick timing accuracy validation test for mock processing
"""

import asyncio
import time
from app.services.mock_processor import simulate_document_processing
from unittest.mock import MagicMock
import uuid

async def test_timing_accuracy():
    print("=== TIMING ACCURACY VALIDATION ===")
    
    # Mock database and processing state
    db_mock = MagicMock()
    db_mock.add = MagicMock()
    db_mock.commit = MagicMock()
    db_mock.query.return_value.filter.return_value.first.return_value = None
    
    session_id = str(uuid.uuid4())
    processing_state = {
        "should_cancel": False,
        "should_pause": False,
        "status": "idle"
    }
    
    # Test with reduced employee count for faster test
    config = {
        "employee_count": 8,
        "processing_delay": 0.5  # 0.5 seconds per employee = 4 seconds total
    }
    
    emp_count = config["employee_count"]
    delay = config["processing_delay"]
    expected_time = emp_count * delay
    
    print(f"Testing processing timing with {emp_count} employees at {delay}s each")
    print(f"Expected total time: ~{expected_time:.1f} seconds")
    
    start_time = time.time()
    
    try:
        success = await simulate_document_processing(
            session_id=session_id,
            db=db_mock,
            processing_state=processing_state,
            processing_config=config
        )
        
        actual_time = time.time() - start_time
        accuracy = (expected_time / actual_time) * 100 if actual_time > 0 else 0
        
        print(f"\nTiming Results:")
        print(f"  Actual processing time: {actual_time:.2f} seconds")
        print(f"  Expected time: {expected_time:.2f} seconds")
        print(f"  Timing accuracy: {accuracy:.1f}%")
        print(f"  Processing success: {success}")
        
        # Check final processing state
        final_status = processing_state.get("status", "unknown")
        employees_processed = processing_state.get("current_employee_index", 0) + 1
        
        print(f"  Final status: {final_status}")
        print(f"  Employees processed: {employees_processed}")
        
        # Validate timing is within acceptable range (90-110%)
        if 95 <= accuracy <= 105:
            print(f"  ✅ Timing accuracy is EXCELLENT ({accuracy:.1f}%)")
            return True
        elif 90 <= accuracy <= 110:
            print(f"  ✅ Timing accuracy is GOOD ({accuracy:.1f}%)")
            return True
        else:
            print(f"  ⚠️ Timing accuracy needs attention ({accuracy:.1f}%)")
            return False
        
    except Exception as e:
        print(f"  ❌ Processing failed: {str(e)}")
        return False

if __name__ == "__main__":
    asyncio.run(test_timing_accuracy())