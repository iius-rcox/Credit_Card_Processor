#!/bin/bash

# Environment Variable Validation Script
# Validates production environment configuration before deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENV_FILE="${1:-.env.production}"
ERRORS=0
WARNINGS=0

echo -e "${BLUE}🔍 Validating environment configuration: $ENV_FILE${NC}"
echo "========================================================"

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Environment file not found: $ENV_FILE${NC}"
    echo "   Create from template: cp .env.production.template $ENV_FILE"
    exit 1
fi

# Load environment file
source "$ENV_FILE"

# Helper functions
check_required() {
    local var_name="$1"
    local var_value="${!var_name}"
    local description="$2"
    
    if [ -z "$var_value" ]; then
        echo -e "${RED}❌ REQUIRED: $var_name is not set${NC}"
        echo "   $description"
        ((ERRORS++))
        return 1
    fi
    return 0
}

check_secure() {
    local var_name="$1"
    local var_value="${!var_name}"
    local min_length="$2"
    local description="$3"
    
    if [ -z "$var_value" ]; then
        echo -e "${RED}❌ SECURITY: $var_name is not set${NC}"
        echo "   $description"
        ((ERRORS++))
        return 1
    fi
    
    if [ ${#var_value} -lt $min_length ]; then
        echo -e "${RED}❌ SECURITY: $var_name is too short (minimum $min_length characters)${NC}"
        echo "   $description"
        ((ERRORS++))
        return 1
    fi
    
    return 0
}

check_url_format() {
    local var_name="$1"
    local var_value="${!var_name}"
    local description="$2"
    
    if [ -n "$var_value" ] && [[ ! "$var_value" =~ ^https?:// ]]; then
        echo -e "${YELLOW}⚠️  WARNING: $var_name should start with http:// or https://${NC}"
        echo "   Current value: $var_value"
        echo "   $description"
        ((WARNINGS++))
    fi
}

check_numeric() {
    local var_name="$1"
    local var_value="${!var_name}"
    local min_val="$2"
    local max_val="$3"
    local description="$4"
    
    if [ -n "$var_value" ]; then
        if ! [[ "$var_value" =~ ^[0-9]+$ ]]; then
            echo -e "${RED}❌ VALIDATION: $var_name must be a number${NC}"
            echo "   Current value: $var_value"
            echo "   $description"
            ((ERRORS++))
        elif [ "$var_value" -lt "$min_val" ] || [ "$var_value" -gt "$max_val" ]; then
            echo -e "${YELLOW}⚠️  WARNING: $var_name should be between $min_val and $max_val${NC}"
            echo "   Current value: $var_value"
            echo "   $description"
            ((WARNINGS++))
        fi
    fi
}

warn_default() {
    local var_name="$1"
    local var_value="${!var_name}"
    local default_pattern="$2"
    local description="$3"
    
    if [ -n "$var_value" ] && [[ "$var_value" == *"$default_pattern"* ]]; then
        echo -e "${YELLOW}⚠️  WARNING: $var_name appears to use default/template value${NC}"
        echo "   Current value: $var_value"
        echo "   $description"
        ((WARNINGS++))
    fi
}

echo -e "\n${BLUE}🔐 Critical Security Settings${NC}"
echo "--------------------------------"

# Critical security variables
check_secure "SESSION_SECRET_KEY" 32 "Generate a random 32+ character secret key"
warn_default "SESSION_SECRET_KEY" "CHANGE_ME" "Must be changed from template value"

check_required "ADMIN_USERS" "Comma-separated list of admin usernames"

echo -e "\n${BLUE}🌐 Network and Domain Configuration${NC}"
echo "------------------------------------"

check_required "CORS_ORIGINS" "Allowed CORS origins for API access"
check_required "TRUSTED_HOSTS" "Trusted host domains"

# Validate CORS origins
if [ -n "$CORS_ORIGINS" ]; then
    IFS=',' read -ra ORIGINS <<< "$CORS_ORIGINS"
    for origin in "${ORIGINS[@]}"; do
        origin=$(echo "$origin" | xargs) # trim whitespace
        if [[ ! "$origin" =~ ^https?:// ]]; then
            echo -e "${YELLOW}⚠️  WARNING: CORS origin should include protocol: $origin${NC}"
            ((WARNINGS++))
        fi
    done
fi

warn_default "CORS_ORIGINS" "yourdomain.com" "Update with actual production domains"
warn_default "TRUSTED_HOSTS" "yourdomain.com" "Update with actual production domains"

echo -e "\n${BLUE}⚙️  Application Configuration${NC}"
echo "------------------------------"

check_required "ENVIRONMENT" "Application environment (should be 'production')"
if [ "$ENVIRONMENT" != "production" ]; then
    echo -e "${YELLOW}⚠️  WARNING: ENVIRONMENT is not set to 'production'${NC}"
    echo "   Current value: $ENVIRONMENT"
    ((WARNINGS++))
fi

check_required "DATABASE_URL" "Database connection string"

echo -e "\n${BLUE}🛡️  Security Configuration${NC}"
echo "----------------------------"

check_numeric "SESSION_TIMEOUT_MINUTES" 5 1440 "Session timeout in minutes (5-1440)"
check_numeric "MAX_LOGIN_ATTEMPTS" 1 10 "Maximum login attempts (1-10)"
check_numeric "LOGIN_LOCKOUT_MINUTES" 1 60 "Login lockout duration in minutes (1-60)"
check_numeric "RATE_LIMIT_REQUESTS" 10 1000 "Rate limit requests per period (10-1000)"
check_numeric "RATE_LIMIT_PERIOD" 10 3600 "Rate limit period in seconds (10-3600)"

# Security headers
if [ "$ENABLE_SECURITY_HEADERS" != "true" ]; then
    echo -e "${YELLOW}⚠️  WARNING: ENABLE_SECURITY_HEADERS should be 'true' for production${NC}"
    ((WARNINGS++))
fi

if [ "$FORCE_HTTPS" != "true" ]; then
    echo -e "${YELLOW}⚠️  WARNING: FORCE_HTTPS should be 'true' for production${NC}"
    ((WARNINGS++))
fi

echo -e "\n${BLUE}📊 Performance and Limits${NC}"
echo "--------------------------"

check_numeric "MAX_UPLOAD_SIZE" 1048576 209715200 "Max upload size in bytes (1MB-200MB)"
check_numeric "BACKEND_WORKERS" 1 8 "Number of backend workers (1-8)"

echo -e "\n${BLUE}📧 External Services${NC}"
echo "--------------------"

# Optional but recommended for production
if [ -n "$SMTP_HOST" ]; then
    check_required "SMTP_USER" "SMTP username for email notifications"
    check_required "SMTP_PASSWORD" "SMTP password for email notifications"
    check_numeric "SMTP_PORT" 25 587 "SMTP port (typically 25, 465, or 587)"
fi

# Check for placeholder values
warn_default "SMTP_PASSWORD" "your_smtp_password" "Update with actual SMTP password"
warn_default "ALERT_EMAIL" "admin@yourdomain.com" "Update with actual admin email"

echo -e "\n${BLUE}🐳 Docker Configuration${NC}"
echo "------------------------"

# Resource limits validation
if [ -n "$BACKEND_MEMORY_LIMIT" ] && [[ ! "$BACKEND_MEMORY_LIMIT" =~ ^[0-9]+[mMgG]?$ ]]; then
    echo -e "${RED}❌ DOCKER: BACKEND_MEMORY_LIMIT format invalid (e.g., '512m', '1g')${NC}"
    ((ERRORS++))
fi

if [ -n "$BACKEND_CPU_LIMIT" ] && [[ ! "$BACKEND_CPU_LIMIT" =~ ^[0-9.]+$ ]]; then
    echo -e "${RED}❌ DOCKER: BACKEND_CPU_LIMIT format invalid (e.g., '1.0', '0.5')${NC}"
    ((ERRORS++))
fi

echo -e "\n${BLUE}🔍 Development Settings Check${NC}"
echo "-------------------------------"

# Check for development settings that shouldn't be in production
DEV_VARS=("DEBUG" "DEVELOPMENT_MODE" "MOCK_SERVICES")
for var in "${DEV_VARS[@]}"; do
    if [ -n "${!var}" ] && [ "${!var}" = "true" ]; then
        echo -e "${YELLOW}⚠️  WARNING: $var is enabled (should be disabled in production)${NC}"
        ((WARNINGS++))
    fi
done

echo -e "\n========================================================"
echo -e "${BLUE}📋 Validation Summary${NC}"
echo "========================================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ PASSED: Environment configuration is valid!${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  PASSED WITH WARNINGS: $WARNINGS warning(s) found${NC}"
    echo "   Consider addressing warnings before production deployment"
    exit 0
else
    echo -e "${RED}❌ FAILED: $ERRORS error(s) and $WARNINGS warning(s) found${NC}"
    echo "   Fix all errors before deploying to production"
    exit 1
fi