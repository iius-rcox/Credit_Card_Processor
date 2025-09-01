#!/usr/bin/env python3
"""
Credit Card Processor - Interactive Configuration Setup
======================================================

This script helps you configure your Credit Card Processor application
by creating a customized .env file based on your requirements.

Usage:
    python setup-config.py

Features:
- Interactive prompts for all configuration options
- Smart defaults based on your environment
- Security validation for critical settings
- Azure integration setup with existing infrastructure
- Production vs Development presets
"""

import os
import sys
import secrets
import re
from pathlib import Path
from typing import Dict, Any, Optional

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
    UNDERLINE = '\033[4m'

def print_header(text: str):
    """Print a formatted header"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'=' * len(text)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'=' * len(text)}{Colors.ENDC}")

def print_info(text: str):
    """Print informational text"""
    print(f"{Colors.OKBLUE}{text}{Colors.ENDC}")

def print_success(text: str):
    """Print success message"""
    print(f"{Colors.OKGREEN}✓ {text}{Colors.ENDC}")

def print_warning(text: str):
    """Print warning message"""
    print(f"{Colors.WARNING}⚠ {text}{Colors.ENDC}")

def print_error(text: str):
    """Print error message"""
    print(f"{Colors.FAIL}✗ {text}{Colors.ENDC}")

def get_user_input(prompt: str, default: str = "", required: bool = False, 
                  secret: bool = False, validate_func=None) -> str:
    """Get user input with validation"""
    while True:
        if default:
            display_prompt = f"{prompt} [{default}]: "
        else:
            display_prompt = f"{prompt}: "
        
        if secret:
            import getpass
            value = getpass.getpass(display_prompt)
        else:
            value = input(display_prompt).strip()
        
        # Use default if no input provided
        if not value and default:
            value = default
        
        # Check if required
        if required and not value:
            print_error("This field is required. Please provide a value.")
            continue
        
        # Run validation if provided
        if validate_func and value:
            try:
                validate_func(value)
            except ValueError as e:
                print_error(str(e))
                continue
        
        return value

def validate_email_list(emails: str) -> None:
    """Validate comma-separated email list"""
    if not emails:
        return
    
    email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    for email in emails.split(','):
        email = email.strip()
        if email and not email_pattern.match(email):
            raise ValueError(f"Invalid email address: {email}")

def validate_url(url: str) -> None:
    """Validate URL format"""
    if not url:
        return
    
    url_pattern = re.compile(
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)
    
    if not url_pattern.match(url):
        raise ValueError("Invalid URL format. Must start with http:// or https://")

def validate_secret_key(key: str) -> None:
    """Validate session secret key"""
    if not key:
        return
    
    if len(key) < 32:
        raise ValueError("Secret key must be at least 32 characters long")
    
    # Check for weak keys
    weak_keys = ['dev-session-secret', 'development-key', 'test-key', 'changeme', 'default']
    if any(weak in key.lower() for weak in weak_keys):
        raise ValueError("Secret key appears to be a default/weak key. Please use a strong, unique key.")

def generate_secret_key() -> str:
    """Generate a cryptographically secure secret key"""
    return secrets.token_urlsafe(64)

class ConfigSetup:
    def __init__(self):
        self.config: Dict[str, Any] = {}
        self.project_root = Path(__file__).parent
        self.env_file = self.project_root / ".env"
        
    def welcome(self):
        """Display welcome message"""
        os.system('clear' if os.name == 'posix' else 'cls')
        print_header("Credit Card Processor - Configuration Setup")
        print_info("This interactive setup will help you configure your application.")
        print_info("You can press Enter to use default values where provided.")
        print_info("Required fields are marked and must be filled in.")
        print()
        
        if self.env_file.exists():
            response = get_user_input(
                f"Found existing .env file. Do you want to overwrite it? (y/N)", 
                "n"
            ).lower()
            if response not in ['y', 'yes']:
                print_info("Configuration cancelled. Existing .env file preserved.")
                sys.exit(0)

    def choose_environment_preset(self):
        """Choose between development and production presets"""
        print_header("Environment Setup")
        print_info("Choose your deployment environment:")
        print("1. Development (Local development with debug features)")
        print("2. Staging (Testing environment with production-like settings)")
        print("3. Production (Live deployment with maximum security)")
        
        choice = get_user_input("Select environment (1/2/3)", "1")
        
        if choice == "1":
            self.environment = "development"
            self.is_production = False
        elif choice == "2":
            self.environment = "staging"
            self.is_production = True
        elif choice == "3":
            self.environment = "production"
            self.is_production = True
        else:
            print_warning("Invalid choice, defaulting to development")
            self.environment = "development"
            self.is_production = False
        
        print_success(f"Environment set to: {self.environment}")

    def configure_security(self):
        """Configure security settings"""
        print_header("Security Configuration")
        
        # Admin Users
        print_info("Configure administrator users:")
        print("Enter usernames of users who should have admin access.")
        print("These should match the usernames from your authentication system.")
        
        admin_users = get_user_input(
            "Admin users (comma-separated)",
            required=self.is_production
        )
        self.config['ADMIN_USERS'] = admin_users
        
        # Session Secret Key
        print_info("\nSession security configuration:")
        print("The session secret key is used to secure user sessions.")
        
        if self.is_production:
            print_warning("IMPORTANT: Use a strong, unique secret key for production!")
            
        generate_key = get_user_input(
            "Generate a secure session key automatically? (Y/n)", 
            "y"
        ).lower()
        
        if generate_key in ['y', 'yes', '']:
            session_key = generate_secret_key()
            print_success("Generated secure session key")
        else:
            session_key = get_user_input(
                "Enter session secret key (32+ characters)",
                required=True,
                secret=True,
                validate_func=validate_secret_key
            )
        
        self.config['SESSION_SECRET_KEY'] = session_key

    def configure_network(self):
        """Configure network and CORS settings"""
        print_header("Network Configuration")
        
        # CORS Origins
        print_info("Configure allowed frontend origins:")
        print("Enter the URLs where your frontend application will be hosted.")
        
        if self.is_production:
            default_origins = ""
            print("Example: https://myapp.com,https://www.myapp.com")
        else:
            default_origins = "http://localhost:3000"
            
        cors_origins = get_user_input(
            "CORS origins (comma-separated URLs)",
            default_origins,
            validate_func=lambda x: [validate_url(url.strip()) for url in x.split(',') if url.strip()]
        )
        self.config['CORS_ORIGINS'] = cors_origins
        
        # Trusted Hosts
        print_info("\nConfigure trusted hosts:")
        print("Enter the hostnames/domains that should be allowed to serve the application.")
        
        if self.is_production:
            default_hosts = ""
            print("Example: myapp.com,*.myapp.com")
        else:
            default_hosts = "localhost,127.0.0.1,*.local"
            
        trusted_hosts = get_user_input(
            "Trusted hosts (comma-separated)",
            default_hosts
        )
        self.config['TRUSTED_HOSTS'] = trusted_hosts

    def configure_azure(self):
        """Configure Azure integration"""
        print_header("Azure Integration (Optional)")
        print_info("Azure Document Intelligence provides enhanced OCR capabilities.")
        print_info("If not configured, the application will use local Tesseract OCR.")
        
        enable_azure = get_user_input(
            "Enable Azure Document Intelligence integration? (y/N)", 
            "n"
        ).lower()
        
        if enable_azure in ['y', 'yes']:
            print_info("\nBased on your infrastructure, here are the suggested values:")
            print_info("Service name: iius-doc-intelligence")
            print_info("Location: southcentralus")
            
            endpoint = get_user_input(
                "Azure Document Intelligence Endpoint",
                "https://iius-doc-intelligence.cognitiveservices.azure.com/",
                validate_func=validate_url
            )
            self.config['AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT'] = endpoint
            
            api_key = get_user_input(
                "Azure Document Intelligence API Key",
                required=True,
                secret=True
            )
            self.config['AZURE_DOCUMENT_INTELLIGENCE_KEY'] = api_key
            
            # Custom models
            print_info("\nCustom model IDs (optional):")
            print("If you have trained custom models, enter their IDs here.")
            
            car_model = get_user_input("CAR document model ID (optional)")
            receipt_model = get_user_input("Receipt document model ID (optional)")
            
            self.config['AZURE_CAR_MODEL_ID'] = car_model
            self.config['AZURE_RECEIPT_MODEL_ID'] = receipt_model
        else:
            print_info("Azure integration disabled. Using local OCR processing.")

    def configure_monitoring(self):
        """Configure monitoring and alerting"""
        print_header("Monitoring & Alerting (Optional)")
        
        enable_monitoring = get_user_input(
            "Configure monitoring and email alerts? (y/N)", 
            "n"
        ).lower()
        
        if enable_monitoring in ['y', 'yes']:
            # Grafana
            print_info("\nGrafana dashboard configuration:")
            grafana_user = get_user_input("Grafana admin username", "admin")
            grafana_pass = get_user_input("Grafana admin password", secret=True)
            
            self.config['GRAFANA_ADMIN_USER'] = grafana_user
            self.config['GRAFANA_ADMIN_PASSWORD'] = grafana_pass
            
            # Email alerts
            print_info("\nEmail alert configuration:")
            enable_email = get_user_input("Configure email alerts? (y/N)", "n").lower()
            
            if enable_email in ['y', 'yes']:
                smtp_host = get_user_input("SMTP server hostname", required=True)
                smtp_port = get_user_input("SMTP port", "587")
                smtp_user = get_user_input("SMTP username", required=True)
                smtp_pass = get_user_input("SMTP password", secret=True, required=True)
                from_email = get_user_input("From email address", required=True, validate_func=validate_email_list)
                alert_emails = get_user_input("Alert recipient emails (comma-separated)", 
                                            validate_func=validate_email_list)
                
                self.config.update({
                    'SMTP_HOST': smtp_host,
                    'SMTP_PORT': smtp_port,
                    'SMTP_USER': smtp_user,
                    'SMTP_PASSWORD': smtp_pass,
                    'SMTP_FROM_EMAIL': from_email,
                    'SMTP_USE_TLS': 'true',
                    'ALERT_EMAILS': alert_emails
                })

    def configure_environment_specific(self):
        """Configure environment-specific settings"""
        print_header("Environment Settings")
        
        # Set environment-specific defaults
        self.config.update({
            'ENVIRONMENT': self.environment,
            'DEBUG': 'false' if self.is_production else 'true',
            'FORCE_HTTPS': 'true' if self.is_production else 'false',
            'LOG_LEVEL': 'info' if self.is_production else 'debug'
        })
        
        # Tuning parameters
        print_info("Configure application tuning (optional):")
        
        session_timeout = get_user_input("Session timeout in minutes", "480")
        max_login_attempts = get_user_input("Maximum login attempts", "5")
        login_lockout_minutes = get_user_input("Login lockout duration (minutes)", "15")
        rate_limit_requests = get_user_input("Rate limit requests per period", "100")
        rate_limit_period = get_user_input("Rate limit period (seconds)", "60")
        
        self.config.update({
            'SESSION_TIMEOUT_MINUTES': session_timeout,
            'MAX_LOGIN_ATTEMPTS': max_login_attempts,
            'LOGIN_LOCKOUT_MINUTES': login_lockout_minutes,
            'RATE_LIMIT_REQUESTS': rate_limit_requests,
            'RATE_LIMIT_PERIOD': rate_limit_period,
            'ENABLE_SECURITY_HEADERS': 'true',
            'HSTS_MAX_AGE': '31536000'
        })

    def add_application_defaults(self):
        """Add application-specific defaults"""
        self.config.update({
            'APP_NAME': 'Credit Card Processor',
            'APP_VERSION': '1.0.0',
            'MAX_FILE_SIZE_MB': '100',
            'MAX_EMPLOYEES': '100',
            'DATABASE_PATH': './data/database.db',
            'UPLOAD_PATH': './data/uploads',
            'EXPORT_PATH': './data/exports'
        })
        
        # Development-specific settings
        if not self.is_production:
            self.config.update({
                'PYTHONDONTWRITEBYTECODE': '1',
                'PYTHONUNBUFFERED': '1',
                'CHOKIDAR_USEPOLLING': 'true',
                'WATCHPACK_POLLING': 'true',
                'NODE_ENV': 'development',
                'VITE_API_BASE_URL': 'http://localhost:8000',
                'VITE_APP_TITLE': 'Credit Card Processor (Development)'
            })

    def write_env_file(self):
        """Write the configuration to .env file"""
        print_header("Generating Configuration")
        
        env_content = []
        env_content.append("# Credit Card Processor - Environment Configuration")
        env_content.append("# Generated by setup-config.py")
        env_content.append(f"# Environment: {self.environment}")
        env_content.append("# DO NOT COMMIT THIS FILE TO VERSION CONTROL")
        env_content.append("")
        
        # Group settings logically
        sections = {
            "Security Settings": [
                'ADMIN_USERS', 'SESSION_SECRET_KEY', 'CORS_ORIGINS', 'TRUSTED_HOSTS'
            ],
            "Azure Integration": [
                'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT', 'AZURE_DOCUMENT_INTELLIGENCE_KEY',
                'AZURE_CAR_MODEL_ID', 'AZURE_RECEIPT_MODEL_ID'
            ],
            "Environment Settings": [
                'ENVIRONMENT', 'DEBUG', 'FORCE_HTTPS', 'LOG_LEVEL'
            ],
            "Session & Authentication": [
                'SESSION_TIMEOUT_MINUTES', 'MAX_LOGIN_ATTEMPTS', 'LOGIN_LOCKOUT_MINUTES'
            ],
            "Security & Rate Limiting": [
                'ENABLE_SECURITY_HEADERS', 'HSTS_MAX_AGE', 'RATE_LIMIT_REQUESTS', 'RATE_LIMIT_PERIOD'
            ],
            "Application Settings": [
                'APP_NAME', 'APP_VERSION', 'MAX_FILE_SIZE_MB', 'MAX_EMPLOYEES',
                'DATABASE_PATH', 'UPLOAD_PATH', 'EXPORT_PATH'
            ],
            "Monitoring": [
                'GRAFANA_ADMIN_USER', 'GRAFANA_ADMIN_PASSWORD',
                'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD',
                'SMTP_FROM_EMAIL', 'SMTP_USE_TLS', 'ALERT_EMAILS'
            ]
        }
        
        for section_name, keys in sections.items():
            section_vars = {k: v for k, v in self.config.items() if k in keys and v}
            if section_vars:
                env_content.append(f"# {section_name}")
                for key, value in section_vars.items():
                    env_content.append(f"{key}={value}")
                env_content.append("")
        
        # Add any remaining variables
        added_keys = set()
        for section_vars in sections.values():
            added_keys.update(section_vars)
        
        remaining = {k: v for k, v in self.config.items() if k not in added_keys and v}
        if remaining:
            env_content.append("# Additional Settings")
            for key, value in remaining.items():
                env_content.append(f"{key}={value}")
        
        # Write to file
        with open(self.env_file, 'w') as f:
            f.write('\n'.join(env_content))
        
        print_success(f"Configuration written to {self.env_file}")

    def display_summary(self):
        """Display configuration summary"""
        print_header("Configuration Summary")
        
        print(f"Environment: {Colors.OKGREEN}{self.environment}{Colors.ENDC}")
        print(f"Admin Users: {Colors.OKGREEN}{self.config.get('ADMIN_USERS', 'Not set')}{Colors.ENDC}")
        print(f"Azure Integration: {Colors.OKGREEN}{'Enabled' if self.config.get('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT') else 'Disabled'}{Colors.ENDC}")
        print(f"Monitoring: {Colors.OKGREEN}{'Enabled' if self.config.get('GRAFANA_ADMIN_USER') else 'Disabled'}{Colors.ENDC}")
        
        print_info("\nNext Steps:")
        print("1. Review the generated .env file")
        print("2. Start the application: docker-compose up")
        print("3. Check the application logs for any configuration issues")
        print("4. Access the application at http://localhost:3000")
        
        if self.is_production:
            print_warning("\nProduction Deployment Reminders:")
            print("• Ensure all secrets are properly secured")
            print("• Configure proper backup procedures")
            print("• Set up monitoring and alerting")
            print("• Review security settings before going live")

    def run(self):
        """Run the interactive configuration setup"""
        try:
            self.welcome()
            self.choose_environment_preset()
            self.configure_security()
            self.configure_network()
            self.configure_azure()
            self.configure_monitoring()
            self.configure_environment_specific()
            self.add_application_defaults()
            self.write_env_file()
            self.display_summary()
            
        except KeyboardInterrupt:
            print_info("\n\nConfiguration cancelled by user.")
            sys.exit(1)
        except Exception as e:
            print_error(f"\nAn error occurred: {str(e)}")
            sys.exit(1)

if __name__ == "__main__":
    setup = ConfigSetup()
    setup.run()