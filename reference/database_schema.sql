-- Credit Card Processor - PostgreSQL Database Schema
-- Enterprise-grade schema with comprehensive revision tracking and audit trails

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- 1. USER MANAGEMENT & AUTHENTICATION
-- ========================================

-- User roles enumeration
CREATE TYPE user_role AS ENUM ('admin', 'processor', reviewer', 'read_only');

-- Application users
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    azure_ad_object_id VARCHAR(36) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'processor',
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 2. PROCESSING SESSIONS & REVISIONS
-- ========================================

-- Processing session status
CREATE TYPE session_status AS ENUM ('processing', 'completed', 'failed', 'cancelled');

-- Main processing sessions table - tracks each report submission
CREATE TABLE processing_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    session_name VARCHAR(255) NOT NULL,
    status session_status DEFAULT 'processing',
    
    -- Source file information
    car_file_name VARCHAR(500) NOT NULL,
    car_file_size BIGINT,
    car_file_checksum VARCHAR(64), -- SHA-256 hash
    car_blob_url TEXT,
    
    receipt_file_name VARCHAR(500),
    receipt_file_size BIGINT,
    receipt_file_checksum VARCHAR(64),
    receipt_blob_url TEXT,
    
    -- Processing metadata
    total_employees INTEGER DEFAULT 0,
    employees_completed INTEGER DEFAULT 0,
    employees_with_issues INTEGER DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0.00,
    
    -- Revision tracking
    parent_session_id UUID REFERENCES processing_sessions(session_id),
    revision_number INTEGER DEFAULT 1,
    change_summary TEXT,
    
    -- Timestamps
    processing_started_at TIMESTAMPTZ DEFAULT NOW(),
    processing_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for performance
    CONSTRAINT session_revision_check CHECK (revision_number > 0)
);

-- ========================================
-- 3. EMPLOYEE DATA WITH REVISION TRACKING
-- ========================================

-- Employee record status
CREATE TYPE employee_status AS ENUM ('unfinished', 'in_progress', 'finished', 'on_hold');

-- Validation issue types
CREATE TYPE issue_type AS ENUM ('missing_coding_info', 'missing_receipt', 'missing_all_receipts', 'total_mismatch', 'invalid_amount', 'duplicate_transaction');

-- Employee records per session (maintains full history)
CREATE TABLE employee_revisions (
    revision_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES processing_sessions(session_id),
    employee_name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(10),
    card_number VARCHAR(20),
    
    -- Financial data
    car_total DECIMAL(15,2) DEFAULT 0.00,
    receipt_total DECIMAL(15,2) DEFAULT 0.00,
    amount_difference DECIMAL(15,2) GENERATED ALWAYS AS (car_total - receipt_total) STORED,
    
    -- Status and validation
    status employee_status DEFAULT 'unfinished',
    validation_flags JSONB DEFAULT '{}',
    
    -- Page ranges for PDF splitting
    car_page_range INTEGER[] DEFAULT '{}',
    receipt_page_range INTEGER[] DEFAULT '{}',
    
    -- Processing metadata
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    issues_resolved_count INTEGER DEFAULT 0,
    total_issues_count INTEGER DEFAULT 0,
    
    -- Change tracking
    changed_from_previous BOOLEAN DEFAULT FALSE,
    change_details JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 4. TRANSACTION & RECEIPT DETAILS
-- ========================================

-- Transaction types
CREATE TYPE transaction_type AS ENUM ('expense', 'refund', 'adjustment');
CREATE TYPE coding_type AS ENUM ('job_coding', 'gl_coding');

-- Individual transactions/receipts
CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_revision_id UUID NOT NULL REFERENCES employee_revisions(revision_id),
    
    -- Transaction identification
    external_transaction_id VARCHAR(50) NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_type transaction_type DEFAULT 'expense',
    
    -- Amount and description
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    purpose TEXT,
    
    -- Merchant information
    merchant_name VARCHAR(500),
    merchant_address TEXT,
    
    -- Coding information
    coding_type coding_type,
    job_number VARCHAR(20),
    job_phase VARCHAR(20),
    cost_type VARCHAR(20),
    gl_account VARCHAR(50),
    gl_description VARCHAR(500),
    
    -- Attachment and validation
    has_attachment BOOLEAN DEFAULT FALSE,
    attachment_name VARCHAR(500),
    is_coded BOOLEAN DEFAULT FALSE,
    
    -- Processing metadata
    extracted_via_ai BOOLEAN DEFAULT FALSE,
    confidence_score DECIMAL(3,2), -- AI extraction confidence (0.00-1.00)
    manual_review_required BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_amount CHECK (amount >= 0 OR transaction_type = 'refund'),
    CONSTRAINT valid_confidence CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1))
);

-- ========================================
-- 5. VALIDATION ISSUES TRACKING
-- ========================================

-- Individual validation issues
CREATE TABLE validation_issues (
    issue_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_revision_id UUID NOT NULL REFERENCES employee_revisions(revision_id),
    transaction_id UUID REFERENCES transactions(transaction_id),
    
    -- Issue details
    issue_type issue_type NOT NULL,
    severity VARCHAR(10) DEFAULT 'medium', -- high, medium, low
    description TEXT NOT NULL,
    suggested_resolution TEXT,
    
    -- Financial impact
    amount_impact DECIMAL(15,2) DEFAULT 0.00,
    
    -- Resolution tracking
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES users(user_id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    resolution_method VARCHAR(100),
    
    -- Timestamps
    identified_at TIMESTAMPTZ DEFAULT NOW(),
    due_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 6. FILE MANAGEMENT & DOCUMENT TRACKING
-- ========================================

-- Document types
CREATE TYPE document_type AS ENUM ('car_pdf', 'receipt_pdf', 'combined_pdf', 'excel_report', 'csv_export', 'split_car', 'split_receipt');

-- File storage tracking
CREATE TABLE document_files (
    file_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES processing_sessions(session_id),
    employee_revision_id UUID REFERENCES employee_revisions(revision_id),
    
    -- File details
    file_name VARCHAR(500) NOT NULL,
    file_type document_type NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    
    -- Storage location
    blob_container VARCHAR(100),
    blob_path TEXT NOT NULL,
    blob_url TEXT,
    
    -- Processing metadata
    page_count INTEGER,
    processing_duration_ms INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 7. AUDIT TRAIL & CHANGE HISTORY
-- ========================================

-- Action types for audit trail
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'process', 'resolve_issue', 'export', 'login', 'upload');

-- Comprehensive audit trail
CREATE TABLE audit_trail (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id),
    session_id UUID REFERENCES processing_sessions(session_id),
    
    -- Action details
    action audit_action NOT NULL,
    entity_type VARCHAR(100) NOT NULL, -- table name
    entity_id UUID, -- record ID
    
    -- Change details
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Context
    description TEXT,
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 8. REPORTING & ANALYTICS
-- ========================================

-- Report generation tracking
CREATE TABLE report_exports (
    export_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES processing_sessions(session_id),
    user_id UUID NOT NULL REFERENCES users(user_id),
    
    -- Report details
    report_type VARCHAR(50) NOT NULL, -- excel_summary, csv_import, audit_trail
    report_name VARCHAR(255),
    file_size BIGINT,
    
    -- Filters applied
    date_range_start DATE,
    date_range_end DATE,
    employee_filter TEXT[],
    status_filter VARCHAR(50)[],
    
    -- Storage
    blob_url TEXT,
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- ========================================
-- 9. SYSTEM CONFIGURATION
-- ========================================

-- Application settings
CREATE TABLE system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    updated_by UUID REFERENCES users(user_id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 10. PERFORMANCE INDEXES
-- ========================================

-- Processing sessions indexes
CREATE INDEX idx_processing_sessions_user_date ON processing_sessions(user_id, created_at DESC);
CREATE INDEX idx_processing_sessions_status ON processing_sessions(status);
CREATE INDEX idx_processing_sessions_parent ON processing_sessions(parent_session_id);

-- Employee revisions indexes
CREATE INDEX idx_employee_revisions_session ON employee_revisions(session_id);
CREATE INDEX idx_employee_revisions_name ON employee_revisions(employee_name);
CREATE INDEX idx_employee_revisions_status ON employee_revisions(status);
CREATE INDEX idx_employee_revisions_date ON employee_revisions(processed_at DESC);

-- Transactions indexes
CREATE INDEX idx_transactions_employee ON transactions(employee_revision_id);
CREATE INDEX idx_transactions_external_id ON transactions(external_transaction_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_amount ON transactions(amount);

-- Validation issues indexes
CREATE INDEX idx_validation_issues_employee ON validation_issues(employee_revision_id);
CREATE INDEX idx_validation_issues_resolved ON validation_issues(is_resolved, created_at);
CREATE INDEX idx_validation_issues_type ON validation_issues(issue_type);

-- Audit trail indexes
CREATE INDEX idx_audit_trail_user ON audit_trail(user_id, created_at DESC);
CREATE INDEX idx_audit_trail_session ON audit_trail(session_id, created_at DESC);
CREATE INDEX idx_audit_trail_entity ON audit_trail(entity_type, entity_id);

-- ========================================
-- 11. UPDATED_AT TRIGGERS
-- ========================================

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 12. INITIAL DATA SETUP
-- ========================================

-- Default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('max_file_size_mb', '100', 'number', 'Maximum file size for uploads in MB'),
('session_timeout_hours', '8', 'number', 'User session timeout in hours'),
('auto_cleanup_days', '90', 'number', 'Days to keep old files and sessions'),
('default_page_size', '50', 'number', 'Default pagination size for API responses'),
('enable_ai_extraction', 'true', 'boolean', 'Enable Azure Document Intelligence for PDF extraction'),
('notification_email_enabled', 'true', 'boolean', 'Enable email notifications for completed processing');

-- ========================================
-- 13. DATABASE FUNCTIONS & PROCEDURES
-- ========================================

-- Function to calculate session statistics
CREATE OR REPLACE FUNCTION calculate_session_stats(session_uuid UUID)
RETURNS TABLE (
    total_employees INTEGER,
    completed_employees INTEGER,
    employees_with_issues INTEGER,
    total_amount DECIMAL,
    completion_percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_employees,
        COUNT(CASE WHEN er.status = 'finished' THEN 1 END)::INTEGER as completed_employees,
        COUNT(CASE WHEN er.total_issues_count > 0 THEN 1 END)::INTEGER as employees_with_issues,
        COALESCE(SUM(er.car_total), 0) as total_amount,
        CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND((COUNT(CASE WHEN er.status = 'finished' THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2)
        END as completion_percentage
    FROM employee_revisions er
    WHERE er.session_id = session_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to get latest employee revision per session
CREATE OR REPLACE FUNCTION get_latest_employee_revisions(session_uuid UUID)
RETURNS TABLE (
    revision_id UUID,
    employee_name VARCHAR,
    status employee_status,
    car_total DECIMAL,
    receipt_total DECIMAL,
    issue_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_revisions AS (
        SELECT DISTINCT ON (er.employee_name) 
            er.revision_id,
            er.employee_name,
            er.status,
            er.car_total,
            er.receipt_total,
            er.processed_at
        FROM employee_revisions er
        WHERE er.session_id = session_uuid
        ORDER BY er.employee_name, er.processed_at DESC
    )
    SELECT 
        lr.revision_id,
        lr.employee_name,
        lr.status,
        lr.car_total,
        lr.receipt_total,
        COUNT(vi.issue_id) as issue_count
    FROM latest_revisions lr
    LEFT JOIN validation_issues vi ON lr.revision_id = vi.employee_revision_id AND vi.is_resolved = FALSE
    GROUP BY lr.revision_id, lr.employee_name, lr.status, lr.car_total, lr.receipt_total
    ORDER BY lr.employee_name;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 14. VIEWS FOR COMMON QUERIES
-- ========================================

-- View for active sessions with statistics
CREATE VIEW active_sessions_summary AS
SELECT 
    ps.session_id,
    ps.session_name,
    ps.user_id,
    u.display_name as user_name,
    ps.status,
    ps.revision_number,
    ps.car_file_name,
    ps.receipt_file_name,
    ps.total_employees,
    ps.employees_completed,
    ps.employees_with_issues,
    ps.total_amount,
    CASE 
        WHEN ps.total_employees = 0 THEN 0
        ELSE ROUND((ps.employees_completed::DECIMAL / ps.total_employees) * 100, 2)
    END as completion_percentage,
    ps.processing_started_at,
    ps.processing_completed_at,
    ps.created_at
FROM processing_sessions ps
JOIN users u ON ps.user_id = u.user_id
WHERE ps.status IN ('processing', 'completed')
ORDER BY ps.created_at DESC;

-- View for outstanding issues summary
CREATE VIEW outstanding_issues_summary AS
SELECT 
    vi.issue_type,
    COUNT(*) as issue_count,
    SUM(vi.amount_impact) as total_amount_impact,
    AVG(EXTRACT(DAYS FROM (NOW() - vi.identified_at))) as avg_age_days,
    COUNT(CASE WHEN vi.severity = 'high' THEN 1 END) as high_severity_count
FROM validation_issues vi
WHERE vi.is_resolved = FALSE
GROUP BY vi.issue_type
ORDER BY issue_count DESC;

-- ========================================
-- 15. PERFORMANCE OPTIMIZATION
-- ========================================

-- Partial indexes for better performance
CREATE INDEX idx_validation_issues_unresolved ON validation_issues(employee_revision_id, created_at)
    WHERE is_resolved = FALSE;

CREATE INDEX idx_employee_revisions_active ON employee_revisions(session_id, status)
    WHERE status IN ('unfinished', 'in_progress');

-- ========================================
-- 16. DATA RETENTION POLICIES
-- ========================================

-- Function to clean up old data (to be called by scheduled job)
CREATE OR REPLACE FUNCTION cleanup_old_data(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Delete old audit trail entries (keep more recent ones)
    DELETE FROM audit_trail 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete expired report exports
    DELETE FROM report_exports 
    WHERE expires_at < NOW();
    
    -- Add to deleted count
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;