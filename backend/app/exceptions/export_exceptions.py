"""
Custom exceptions for export operations
Provides specific error types for better error handling and debugging
"""

class ExportError(Exception):
    """Base exception for export operations"""
    
    def __init__(self, message: str, error_code: str = None, details: dict = None):
        super().__init__(message)
        self.message = message
        self.error_code = error_code or "EXPORT_ERROR"
        self.details = details or {}


class ExportGenerationError(ExportError):
    """Exception raised during export file generation"""
    
    def __init__(self, message: str, session_id: str = None, export_type: str = None):
        super().__init__(
            message=message,
            error_code="EXPORT_GENERATION_FAILED",
            details={"session_id": session_id, "export_type": export_type}
        )


class ExportTrackingError(ExportError):
    """Exception raised during export tracking operations"""
    
    def __init__(self, message: str, session_id: str = None, batch_id: str = None):
        super().__init__(
            message=message,
            error_code="EXPORT_TRACKING_FAILED",
            details={"session_id": session_id, "batch_id": batch_id}
        )


class DuplicateExportError(ExportError):
    """Exception raised when attempting duplicate export"""
    
    def __init__(self, message: str, session_id: str = None, existing_batch_id: str = None):
        super().__init__(
            message=message,
            error_code="DUPLICATE_EXPORT_ATTEMPT",
            details={"session_id": session_id, "existing_batch_id": existing_batch_id}
        )


class ExportValidationError(ExportError):
    """Exception raised during export data validation"""
    
    def __init__(self, message: str, validation_errors: list = None):
        super().__init__(
            message=message,
            error_code="EXPORT_VALIDATION_FAILED",
            details={"validation_errors": validation_errors or []}
        )


class DatabaseError(ExportError):
    """Exception raised for database-related export errors"""
    
    def __init__(self, message: str, original_error: str = None):
        super().__init__(
            message=message,
            error_code="DATABASE_ERROR",
            details={"original_error": original_error}
        )


class ExportTimeoutError(ExportError):
    """Exception raised when export operation times out"""
    
    def __init__(self, message: str, timeout_seconds: int = None):
        super().__init__(
            message=message,
            error_code="EXPORT_TIMEOUT",
            details={"timeout_seconds": timeout_seconds}
        )


class ExportPermissionError(ExportError):
    """Exception raised when user lacks permission for export operation"""
    
    def __init__(self, message: str, user_id: str = None, required_permission: str = None):
        super().__init__(
            message=message,
            error_code="EXPORT_PERMISSION_DENIED",
            details={"user_id": user_id, "required_permission": required_permission}
        )