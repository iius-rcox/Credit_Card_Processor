"""
Delta Detection and Processing Service

Handles file comparison, delta detection, and processing recommendations
for optimized incremental processing of employee data.
"""

import hashlib
import re
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum

from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_, text
from sqlalchemy.exc import SQLAlchemyError

from ..models import ProcessingSession, FileUpload, SessionStatus, FileType
from ..database import get_db

# Configure logger for security events
security_logger = logging.getLogger('security.delta_processor')

# Security constants
MAX_CHECKSUM_LENGTH = 64
MIN_CHECKSUM_LENGTH = 64
VALID_CHECKSUM_PATTERN = re.compile(r'^[a-f0-9]{64}$')
MAX_SESSION_ID_LENGTH = 36  # UUID length


class DeltaMatchType(str, Enum):
    """Types of delta matches found"""
    EXACT_MATCH = "exact_match"           # Identical files (same checksums)
    PARTIAL_MATCH = "partial_match"       # One file matches, other differs
    NO_MATCH = "no_match"                 # No matching files found
    MULTIPLE_MATCHES = "multiple_matches" # Multiple potential base sessions


class ProcessingRecommendation(str, Enum):
    """Processing recommendations based on delta analysis"""
    SKIP_PROCESSING = "skip_processing"           # Files identical, reuse results
    DELTA_PROCESSING = "delta_processing"         # Use delta-optimized processing
    FULL_PROCESSING = "full_processing"           # Process normally
    REVIEW_REQUIRED = "review_required"           # Multiple matches need user decision


class DeltaDetectionResult:
    """Result of delta detection analysis"""
    
    def __init__(
        self,
        match_type: DeltaMatchType,
        recommendation: ProcessingRecommendation,
        base_session: Optional[ProcessingSession] = None,
        confidence_score: float = 0.0,
        file_comparisons: Optional[Dict[str, Any]] = None,
        alternative_sessions: Optional[List[ProcessingSession]] = None,
        processing_time_estimate: Optional[int] = None,
        employee_change_estimate: Optional[int] = None
    ):
        self.match_type = match_type
        self.recommendation = recommendation
        self.base_session = base_session
        self.confidence_score = confidence_score
        self.file_comparisons = file_comparisons or {}
        self.alternative_sessions = alternative_sessions or []
        self.processing_time_estimate = processing_time_estimate
        self.employee_change_estimate = employee_change_estimate
        self.analysis_timestamp = datetime.now(timezone.utc)


class DeltaProcessor:
    """
    Delta Detection and Processing Engine
    
    Provides comprehensive file comparison, change detection, and processing
    optimization recommendations for incremental employee data processing.
    """
    
    def __init__(self, db_session: Session):
        self.db = db_session
    
    def detect_delta_files(
        self,
        car_checksum: str,
        receipt_checksum: str,
        current_user: str,
        exclude_session_id: Optional[str] = None
    ) -> DeltaDetectionResult:
        """
        Detect potential delta base sessions by comparing file checksums with security validation
        
        Args:
            car_checksum: SHA-256 checksum of CAR file
            receipt_checksum: SHA-256 checksum of Receipt file
            current_user: Username of current user (for session filtering)
            exclude_session_id: Session ID to exclude from comparison (usually current)
        
        Returns:
            DeltaDetectionResult: Complete analysis with recommendations
            
        Security:
            - Input validation and sanitization
            - SQL injection prevention
            - User isolation enforcement
            - Parameterized queries only
        """
        try:
            # Strict input validation
            if not self.validate_checksums(car_checksum, receipt_checksum):
                security_logger.warning(f"Invalid checksums provided by user {current_user}")
                raise ValueError("Invalid checksum format")
            
            # Sanitize user input
            if not self._validate_user_input(current_user):
                security_logger.warning(f"Invalid user input: {current_user}")
                raise ValueError("Invalid user identifier")
            
            if exclude_session_id and not self._validate_session_id(exclude_session_id):
                security_logger.warning(f"Invalid session ID: {exclude_session_id}")
                raise ValueError("Invalid session identifier")
            
            # Normalize checksums for consistent comparison
            car_checksum = car_checksum.strip().lower()
            receipt_checksum = receipt_checksum.strip().lower()
            
            # Build secure parameterized query
            base_query = self.db.query(ProcessingSession).filter(
                ProcessingSession.status == SessionStatus.COMPLETED,
                ProcessingSession.created_by == current_user  # User isolation
            )
            
            if exclude_session_id:
                # Use parameterized query to prevent SQL injection
                base_query = base_query.filter(
                    ProcessingSession.session_id != exclude_session_id
                )
        
        except Exception as e:
            security_logger.error(f"Delta detection security validation failed: {str(e)}")
            raise
        
        # PERFORMANCE OPTIMIZATION: Single query to get all potential matches
        # This prevents multiple database roundtrips and optimizes performance
        all_potential_matches = base_query.filter(
            or_(
                and_(
                    ProcessingSession.car_checksum == car_checksum,
                    ProcessingSession.receipt_checksum == receipt_checksum
                ),
                ProcessingSession.car_checksum == car_checksum,
                ProcessingSession.receipt_checksum == receipt_checksum
            )
        ).order_by(desc(ProcessingSession.created_at)).all()
        
        # Categorize matches from single query result
        exact_matches = []
        car_matches = []
        receipt_matches = []
        
        for session in all_potential_matches:
            car_match = session.car_checksum == car_checksum
            receipt_match = session.receipt_checksum == receipt_checksum
            
            if car_match and receipt_match:
                exact_matches.append(session)
            elif car_match:
                car_matches.append(session)
            elif receipt_match:
                receipt_matches.append(session)
        
        if exact_matches:
            return self._handle_exact_matches(
                exact_matches, car_checksum, receipt_checksum
            )
        
        if car_matches or receipt_matches:
            return self._handle_partial_matches(
                car_matches, receipt_matches, car_checksum, receipt_checksum
            )
        
        # No matches found
        return DeltaDetectionResult(
            match_type=DeltaMatchType.NO_MATCH,
            recommendation=ProcessingRecommendation.FULL_PROCESSING,
            confidence_score=1.0,
            file_comparisons={
                "car_checksum": car_checksum,
                "receipt_checksum": receipt_checksum,
                "car_match": False,
                "receipt_match": False,
                "matches_found": 0
            },
            processing_time_estimate=self._estimate_full_processing_time()
        )
    
    def _handle_exact_matches(
        self,
        matches: List[ProcessingSession],
        car_checksum: str,
        receipt_checksum: str
    ) -> DeltaDetectionResult:
        """Handle exact file matches"""
        if len(matches) == 1:
            base_session = matches[0]
            
            # Calculate confidence based on recency and success
            confidence = self._calculate_confidence_score(base_session)
            
            # If very recent and successful, recommend skipping
            if confidence > 0.9 and base_session.total_employees > 0:
                recommendation = ProcessingRecommendation.SKIP_PROCESSING
            else:
                recommendation = ProcessingRecommendation.DELTA_PROCESSING
            
            return DeltaDetectionResult(
                match_type=DeltaMatchType.EXACT_MATCH,
                recommendation=recommendation,
                base_session=base_session,
                confidence_score=confidence,
                file_comparisons={
                    "car_checksum": car_checksum,
                    "receipt_checksum": receipt_checksum,
                    "car_match": True,
                    "receipt_match": True,
                    "base_session_id": str(base_session.session_id),
                    "base_session_date": base_session.created_at.isoformat()
                },
                processing_time_estimate=self._estimate_delta_processing_time(base_session),
                employee_change_estimate=0  # No changes expected for exact match
            )
        
        else:
            # Multiple exact matches - need user decision
            return DeltaDetectionResult(
                match_type=DeltaMatchType.MULTIPLE_MATCHES,
                recommendation=ProcessingRecommendation.REVIEW_REQUIRED,
                base_session=matches[0],  # Most recent as default
                alternative_sessions=matches[1:],
                confidence_score=0.7,
                file_comparisons={
                    "car_checksum": car_checksum,
                    "receipt_checksum": receipt_checksum,
                    "car_match": True,
                    "receipt_match": True,
                    "exact_matches_count": len(matches)
                }
            )
    
    def _handle_partial_matches(
        self,
        car_matches: List[ProcessingSession],
        receipt_matches: List[ProcessingSession],
        car_checksum: str,
        receipt_checksum: str
    ) -> DeltaDetectionResult:
        """Handle partial file matches"""
        all_matches = list(set(car_matches + receipt_matches))
        
        # Find the best partial match (most recent with highest confidence)
        best_match = None
        best_score = 0.0
        
        for session in all_matches:
            car_match = session.car_checksum == car_checksum
            receipt_match = session.receipt_checksum == receipt_checksum
            
            # Partial score: 0.5 for each matching file + recency bonus
            partial_score = (0.5 if car_match else 0.0) + (0.5 if receipt_match else 0.0)
            recency_bonus = self._calculate_recency_bonus(session)
            total_score = partial_score + recency_bonus
            
            if total_score > best_score:
                best_score = total_score
                best_match = session
        
        if best_match:
            car_match = best_match.car_checksum == car_checksum
            receipt_match = best_match.receipt_checksum == receipt_checksum
            
            # Estimate changes: if one file changed, expect some employee changes
            change_estimate = int(best_match.total_employees * 0.3)  # Assume 30% change rate
            
            return DeltaDetectionResult(
                match_type=DeltaMatchType.PARTIAL_MATCH,
                recommendation=ProcessingRecommendation.DELTA_PROCESSING,
                base_session=best_match,
                confidence_score=best_score,
                file_comparisons={
                    "car_checksum": car_checksum,
                    "receipt_checksum": receipt_checksum,
                    "car_match": car_match,
                    "receipt_match": receipt_match,
                    "base_session_id": str(best_match.session_id),
                    "base_session_date": best_match.created_at.isoformat(),
                    "changed_files": [
                        f for f in ["receipt" if not receipt_match else None, "car" if not car_match else None] 
                        if f is not None
                    ]
                },
                processing_time_estimate=self._estimate_delta_processing_time(best_match),
                employee_change_estimate=change_estimate
            )
        
        # Fallback (shouldn't reach here)
        return DeltaDetectionResult(
            match_type=DeltaMatchType.NO_MATCH,
            recommendation=ProcessingRecommendation.FULL_PROCESSING,
            confidence_score=0.0
        )
    
    def _calculate_confidence_score(self, session: ProcessingSession) -> float:
        """Calculate confidence score for using a session as base"""
        score = 0.0
        
        # Recency bonus (newer = higher confidence)
        score += self._calculate_recency_bonus(session)
        
        # Success bonus (more employees processed = higher confidence)
        if session.total_employees > 0:
            processing_success_rate = session.processed_employees / session.total_employees
            score += processing_success_rate * 0.3
        
        # Status bonus
        if session.status == SessionStatus.COMPLETED:
            score += 0.2
        
        return min(score, 1.0)  # Cap at 1.0
    
    def _calculate_recency_bonus(self, session: ProcessingSession) -> float:
        """Calculate recency bonus (0.0 to 0.5)"""
        now = datetime.now(timezone.utc)
        
        # Handle timezone-aware and timezone-naive datetimes
        session_time = session.created_at
        if session_time.tzinfo is None:
            session_time = session_time.replace(tzinfo=timezone.utc)
        
        age_hours = (now - session_time).total_seconds() / 3600
        
        if age_hours < 1:
            return 0.5  # Very recent
        elif age_hours < 24:
            return 0.4  # Same day
        elif age_hours < 168:  # One week
            return 0.3
        elif age_hours < 720:  # One month
            return 0.2
        else:
            return 0.1  # Older
    
    def _estimate_full_processing_time(self) -> int:
        """Estimate full processing time in seconds"""
        # Base estimate for full processing
        return 300  # 5 minutes default estimate
    
    def _estimate_delta_processing_time(self, base_session: ProcessingSession) -> int:
        """Estimate delta processing time in seconds"""
        # Delta processing is typically 20-50% of full processing time
        base_time = 60 if base_session.total_employees < 50 else 180
        return base_time
    
    def get_session_file_info(self, session_id: str) -> Optional[Dict[str, str]]:
        """Get file checksum information for a session"""
        session = self.db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_id
        ).first()
        
        if not session:
            return None
        
        return {
            "session_id": str(session.session_id),
            "car_checksum": session.car_checksum,
            "receipt_checksum": session.receipt_checksum,
            "created_at": session.created_at.isoformat(),
            "total_employees": session.total_employees,
            "status": session.status.value
        }
    
    def validate_checksums(self, car_checksum: str, receipt_checksum: str) -> bool:
        """
        Validate that checksums are properly formatted SHA-256 hashes with strict security checks
        
        Security measures:
        - Type validation
        - Length validation
        - Character set validation (only lowercase hex)
        - Pattern matching with regex
        - Input sanitization
        """
        try:
            # Input type validation
            if not isinstance(car_checksum, str) or not isinstance(receipt_checksum, str):
                security_logger.warning("Invalid checksum type received")
                return False
            
            # Null/empty check
            if not car_checksum or not receipt_checksum:
                security_logger.warning("Empty checksum provided")
                return False
            
            # Length validation (prevent buffer overflow attempts)
            if (len(car_checksum) != MIN_CHECKSUM_LENGTH or 
                len(receipt_checksum) != MIN_CHECKSUM_LENGTH):
                security_logger.warning(f"Invalid checksum length: car={len(car_checksum)}, receipt={len(receipt_checksum)}")
                return False
            
            # Character set validation using regex (prevents injection attempts)
            if not VALID_CHECKSUM_PATTERN.match(car_checksum.strip().lower()):
                security_logger.warning("Invalid car checksum format")
                return False
                
            if not VALID_CHECKSUM_PATTERN.match(receipt_checksum.strip().lower()):
                security_logger.warning("Invalid receipt checksum format")
                return False
            
            # Additional validation: ensure it's valid hex
            try:
                int(car_checksum, 16)
                int(receipt_checksum, 16)
            except ValueError:
                security_logger.warning("Checksums contain invalid hex characters")
                return False
            
            return True
            
        except Exception as e:
            security_logger.error(f"Checksum validation failed with exception: {str(e)}")
            return False
    
    def calculate_file_checksum(self, file_content: bytes) -> str:
        """
        Calculate SHA-256 checksum for file content with security validation
        
        Security measures:
        - Input type validation
        - Size limits to prevent DoS
        - Memory management
        """
        try:
            if not isinstance(file_content, bytes):
                security_logger.warning("Invalid file content type for checksum calculation")
                raise ValueError("File content must be bytes")
            
            # Prevent DoS attacks with large files
            MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB limit
            if len(file_content) > MAX_FILE_SIZE:
                security_logger.warning(f"File too large for checksum: {len(file_content)} bytes")
                raise ValueError("File size exceeds maximum limit")
            
            return hashlib.sha256(file_content).hexdigest()
            
        except Exception as e:
            security_logger.error(f"File checksum calculation failed: {str(e)}")
            raise
    
    def _validate_user_input(self, user: str) -> bool:
        """Validate user input for security"""
        if not isinstance(user, str):
            return False
        
        # Basic sanitization - allow alphanumeric, underscore, hyphen, backslash for domain users
        if not re.match(r'^[a-zA-Z0-9._\\-]+$', user):
            return False
            
        # Length limits
        if len(user) > 100:
            return False
            
        return True
    
    def _validate_session_id(self, session_id: str) -> bool:
        """Validate session ID format (UUID)"""
        if not isinstance(session_id, str):
            return False
            
        # UUID format validation
        uuid_pattern = re.compile(
            r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
            re.IGNORECASE
        )
        
        return bool(uuid_pattern.match(session_id.strip()))


# Utility functions for delta processing integration
def create_delta_processor(db: Session = None) -> DeltaProcessor:
    """Factory function to create DeltaProcessor instance"""
    if db is None:
        db = next(get_db())
    return DeltaProcessor(db)