#!/usr/bin/env python3
"""
Credit Card Processor - Configuration Validation Test
====================================================

This script validates your environment configuration to ensure
all required settings are properly configured and secure.

Usage:
    python backend/test_config.py
    
    # Or from the backend directory:
    cd backend && python test_config.py

Features:
- Validates all security settings
- Tests Azure integration (if configured)
- Checks environment-specific settings
- Provides recommendations for improvements
"""

import os
import sys
import secrets
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

try:
    from app.config import Settings, settings
except ImportError:
    print("Error: Could not import application settings.")
    print("Make sure you're running this from the project root or backend directory.")
    sys.exit(1)

class Colors:
    """ANSI color codes for terminal output"""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header(text: str):
    """Print a formatted header"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'=' * len(text)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'=' * len(text)}{Colors.ENDC}")

def print_success(text: str):
    """Print success message"""
    print(f"{Colors.OKGREEN}✓ {text}{Colors.ENDC}")

def print_warning(text: str):
    """Print warning message"""
    print(f"{Colors.WARNING}⚠ {text}{Colors.ENDC}")

def print_error(text: str):
    """Print error message"""
    print(f"{Colors.FAIL}✗ {text}{Colors.ENDC}")

def print_info(text: str):
    """Print informational text"""
    print(f"{Colors.OKBLUE}{text}{Colors.ENDC}")

class ConfigValidator:
    def __init__(self):
        self.settings = settings
        self.issues: List[str] = []
        self.warnings: List[str] = []
        self.recommendations: List[str] = []
        
    def validate_security_settings(self) -> Tuple[int, int]:
        """Validate security settings"""
        print_header("Security Settings Validation")
        
        passed = 0
        failed = 0
        
        # Validate Admin Users
        if not self.settings.admin_users_env:
            print_error("ADMIN_USERS not configured")
            self.issues.append("No admin users configured - application will have no administrators")
            failed += 1
        elif not self.settings.admin_users:
            print_error("ADMIN_USERS is empty or invalid")
            self.issues.append("Admin users environment variable is set but empty")
            failed += 1
        else:
            print_success(f"Admin users configured: {len(self.settings.admin_users)} users")
            if len(self.settings.admin_users) == 1:
                self.warnings.append("Only one admin user configured - consider adding a backup admin")
            passed += 1
        
        # Validate Session Secret Key
        session_key = self.settings.session_secret_key
        if not session_key:
            print_error("SESSION_SECRET_KEY not configured")
            self.issues.append("Session secret key is missing - sessions will be insecure")
            failed += 1
        elif len(session_key) < 32:
            print_error(f"SESSION_SECRET_KEY too short ({len(session_key)} characters, minimum 32)")
            self.issues.append("Session secret key is too short for secure encryption")
            failed += 1
        else:
            # Check for weak keys
            weak_keys = [
                "dev-session-secret-change-in-production",
                "development-key",
                "test-key",
                "changeme",
                "default"
            ]
            
            is_weak = any(weak in session_key.lower() for weak in weak_keys)
            if is_weak and os.getenv("ENVIRONMENT", "development").lower() == "production":
                print_error("SESSION_SECRET_KEY appears to be a default/weak key in production")
                self.issues.append("Using default session secret key in production environment")
                failed += 1
            elif is_weak:
                print_warning("SESSION_SECRET_KEY appears to be a default/weak key")
                self.warnings.append("Consider generating a secure session secret key")
                passed += 1
            else:
                print_success("Session secret key is properly configured")
                passed += 1
        
        # Validate CORS Origins
        if not self.settings.allowed_origins_env:
            print_warning("CORS_ORIGINS not configured - using defaults")
            self.warnings.append("CORS origins not explicitly configured")
        else:
            origins = self.settings.allowed_origins
            if not origins:
                print_error("CORS_ORIGINS is empty")
                self.issues.append("CORS origins configuration is empty")
                failed += 1
            else:
                print_success(f"CORS origins configured: {len(origins)} origins")
                # Check for localhost in production
                if os.getenv("ENVIRONMENT", "development").lower() == "production":
                    localhost_origins = [o for o in origins if "localhost" in o or "127.0.0.1" in o]
                    if localhost_origins:
                        print_warning(f"Localhost origins found in production: {localhost_origins}")
                        self.warnings.append("Localhost CORS origins should be removed in production")
                passed += 1
        
        # Validate Trusted Hosts
        if not self.settings.trusted_hosts_env:
            print_warning("TRUSTED_HOSTS not configured - using defaults")
            self.warnings.append("Trusted hosts not explicitly configured")
        else:
            hosts = self.settings.trusted_hosts
            if not hosts:
                print_error("TRUSTED_HOSTS is empty")
                self.issues.append("Trusted hosts configuration is empty")
                failed += 1
            else:
                print_success(f"Trusted hosts configured: {len(hosts)} hosts")
                passed += 1
        
        # Validate Security Headers
        if self.settings.enable_security_headers:
            print_success("Security headers enabled")
            passed += 1
        else:
            print_warning("Security headers disabled")
            self.warnings.append("Security headers are disabled - consider enabling for better security")
        
        # Validate HTTPS enforcement
        if os.getenv("ENVIRONMENT", "development").lower() == "production":
            if not self.settings.force_https:
                print_warning("HTTPS not enforced in production")
                self.warnings.append("HTTPS should be enforced in production environment")
            else:
                print_success("HTTPS enforcement enabled")
                passed += 1
        
        return passed, failed
    
    def validate_azure_integration(self) -> Tuple[int, int]:
        """Validate Azure integration settings"""
        print_header("Azure Integration Validation")
        
        passed = 0
        failed = 0
        
        azure_endpoint = self.settings.azure_document_intelligence_endpoint
        azure_key = self.settings.azure_document_intelligence_key
        
        if not azure_endpoint and not azure_key:
            print_info("Azure Document Intelligence not configured - using local OCR")
            self.recommendations.append("Consider configuring Azure Document Intelligence for enhanced OCR capabilities")
            return 0, 0
        
        if not azure_endpoint:
            print_error("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT missing but key is configured")
            self.issues.append("Azure endpoint missing - Azure integration will not work")
            failed += 1
        elif not azure_endpoint.startswith(("http://", "https://")):
            print_error("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT invalid format")
            self.issues.append("Azure endpoint must be a valid URL starting with http:// or https://")
            failed += 1
        else:
            print_success("Azure Document Intelligence endpoint configured")
            passed += 1
        
        if not azure_key:
            print_error("AZURE_DOCUMENT_INTELLIGENCE_KEY missing but endpoint is configured")
            self.issues.append("Azure API key missing - Azure integration will not work")
            failed += 1
        elif len(azure_key) < 10:  # Basic length check
            print_error("AZURE_DOCUMENT_INTELLIGENCE_KEY appears to be invalid")
            self.issues.append("Azure API key appears to be too short or invalid")
            failed += 1
        else:
            print_success("Azure Document Intelligence API key configured")
            passed += 1
        
        # Check custom models
        car_model = self.settings.azure_car_model_id
        receipt_model = self.settings.azure_receipt_model_id
        
        if car_model:
            print_success("Custom CAR model ID configured")
        else:
            print_info("No custom CAR model - using Azure prebuilt models")
            self.recommendations.append("Consider training a custom CAR model for better accuracy")
        
        if receipt_model:
            print_success("Custom Receipt model ID configured")
        else:
            print_info("No custom Receipt model - using Azure prebuilt models")
            self.recommendations.append("Consider training a custom Receipt model for better accuracy")
        
        return passed, failed
    
    def validate_environment_settings(self) -> Tuple[int, int]:
        """Validate environment-specific settings"""
        print_header("Environment Settings Validation")
        
        passed = 0
        failed = 0
        
        environment = os.getenv("ENVIRONMENT", "development").lower()
        
        print_info(f"Current environment: {environment}")
        
        if environment == "production":
            # Production-specific validations
            if self.settings.debug:
                print_warning("Debug mode enabled in production")
                self.warnings.append("Debug mode should be disabled in production")
            else:
                print_success("Debug mode properly disabled in production")
                passed += 1
            
            # Check session timeout for production
            if self.settings.session_timeout_minutes > 480:  # 8 hours
                print_warning(f"Session timeout very long for production: {self.settings.session_timeout_minutes} minutes")
                self.warnings.append("Consider shorter session timeout for production security")
            else:
                print_success(f"Session timeout configured: {self.settings.session_timeout_minutes} minutes")
                passed += 1
            
            # Check login attempts
            if self.settings.max_login_attempts > 5:
                print_warning(f"Max login attempts high for production: {self.settings.max_login_attempts}")
                self.warnings.append("Consider lower max login attempts for production security")
            else:
                print_success(f"Max login attempts: {self.settings.max_login_attempts}")
                passed += 1
        
        else:
            # Development-specific validations
            print_info("Development environment - relaxed security checks")
            passed += 1
        
        # Validate rate limiting
        if self.settings.rate_limit_requests < 10:
            print_warning(f"Rate limit very restrictive: {self.settings.rate_limit_requests} requests per {self.settings.rate_limit_period}s")
            self.warnings.append("Very restrictive rate limiting may impact user experience")
        elif self.settings.rate_limit_requests > 1000:
            print_warning(f"Rate limit very permissive: {self.settings.rate_limit_requests} requests per {self.settings.rate_limit_period}s")
            self.warnings.append("Very permissive rate limiting may not prevent abuse")
        else:
            print_success(f"Rate limiting configured: {self.settings.rate_limit_requests} requests per {self.settings.rate_limit_period}s")
            passed += 1
        
        return passed, failed
    
    def validate_file_paths(self) -> Tuple[int, int]:
        """Validate file paths and permissions"""
        print_header("File System Validation")
        
        passed = 0
        failed = 0
        
        # Check database path
        db_path = Path(self.settings.database_path)
        db_dir = db_path.parent
        
        if not db_dir.exists():
            try:
                db_dir.mkdir(parents=True, exist_ok=True)
                print_success(f"Created database directory: {db_dir}")
                passed += 1
            except Exception as e:
                print_error(f"Cannot create database directory {db_dir}: {e}")
                self.issues.append(f"Database directory cannot be created: {e}")
                failed += 1
        else:
            print_success(f"Database directory exists: {db_dir}")
            passed += 1
        
        # Check upload path
        upload_path = Path(self.settings.upload_path)
        if not upload_path.exists():
            try:
                upload_path.mkdir(parents=True, exist_ok=True)
                print_success(f"Created upload directory: {upload_path}")
                passed += 1
            except Exception as e:
                print_error(f"Cannot create upload directory {upload_path}: {e}")
                self.issues.append(f"Upload directory cannot be created: {e}")
                failed += 1
        else:
            print_success(f"Upload directory exists: {upload_path}")
            passed += 1
        
        # Check export path
        export_path = Path(self.settings.export_path)
        if not export_path.exists():
            try:
                export_path.mkdir(parents=True, exist_ok=True)
                print_success(f"Created export directory: {export_path}")
                passed += 1
            except Exception as e:
                print_error(f"Cannot create export directory {export_path}: {e}")
                self.issues.append(f"Export directory cannot be created: {e}")
                failed += 1
        else:
            print_success(f"Export directory exists: {export_path}")
            passed += 1
        
        return passed, failed
    
    def display_summary(self, total_passed: int, total_failed: int):
        """Display validation summary"""
        print_header("Validation Summary")
        
        total_checks = total_passed + total_failed
        
        if total_failed == 0:
            print_success(f"All {total_checks} validation checks passed!")
        else:
            print_error(f"{total_failed} of {total_checks} validation checks failed")
        
        if self.issues:
            print_header("Critical Issues (Must Fix)")
            for i, issue in enumerate(self.issues, 1):
                print_error(f"{i}. {issue}")
        
        if self.warnings:
            print_header("Warnings (Should Review)")
            for i, warning in enumerate(self.warnings, 1):
                print_warning(f"{i}. {warning}")
        
        if self.recommendations:
            print_header("Recommendations (Consider)")
            for i, rec in enumerate(self.recommendations, 1):
                print_info(f"{i}. {rec}")
        
        # Configuration summary
        print_header("Configuration Summary")
        print(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
        print(f"Debug Mode: {self.settings.debug}")
        print(f"Admin Users: {len(self.settings.admin_users)} configured")
        print(f"Azure Integration: {'Enabled' if self.settings.azure_document_intelligence_endpoint else 'Disabled'}")
        print(f"Security Headers: {'Enabled' if self.settings.enable_security_headers else 'Disabled'}")
        print(f"HTTPS Enforcement: {'Enabled' if self.settings.force_https else 'Disabled'}")
        
        # Next steps
        if total_failed > 0 or self.issues:
            print_header("Next Steps")
            print("1. Fix all critical issues listed above")
            print("2. Update your .env file with correct values")
            print("3. Run this validation script again")
            print("4. Test the application startup")
            return False
        else:
            print_header("Ready for Deployment")
            print("✓ Configuration validation passed")
            print("✓ Ready to start the application")
            print("✓ Run: docker-compose up")
            return True
    
    def run_validation(self) -> bool:
        """Run all validation checks"""
        print_header("Credit Card Processor - Configuration Validation")
        print_info("Validating environment configuration...")
        
        total_passed = 0
        total_failed = 0
        
        # Run all validations
        passed, failed = self.validate_security_settings()
        total_passed += passed
        total_failed += failed
        
        passed, failed = self.validate_azure_integration()
        total_passed += passed
        total_failed += failed
        
        passed, failed = self.validate_environment_settings()
        total_passed += passed
        total_failed += failed
        
        passed, failed = self.validate_file_paths()
        total_passed += passed
        total_failed += failed
        
        # Display summary
        return self.display_summary(total_passed, total_failed)

def main():
    """Main function"""
    try:
        validator = ConfigValidator()
        success = validator.run_validation()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print_info("\nValidation cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print_error(f"Validation failed with error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()