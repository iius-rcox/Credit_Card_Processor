"""Add Phase 4 models for receipt versioning and change tracking

Revision ID: phase4_models
Revises: a65a60ab28c9
Create Date: 2025-01-10 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = 'phase4_models'
down_revision = 'a65a60ab28c9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add Phase 4 models for advanced session management"""
    
    # Create receipt_versions table
    op.create_table('receipt_versions',
        sa.Column('version_id', sa.CHAR(36), nullable=False),
        sa.Column('session_id', sa.CHAR(36), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('file_checksum', sa.String(64), nullable=False),
        sa.Column('uploaded_by', sa.String(100), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('employee_count', sa.Integer(), nullable=True),
        sa.Column('processing_status', sa.String(50), nullable=False),
        sa.Column('processing_started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('processing_completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['processing_sessions.session_id'], ),
        sa.PrimaryKeyConstraint('version_id')
    )
    
    # Create indexes for receipt_versions
    op.create_index('idx_receipt_version_session', 'receipt_versions', ['session_id', 'version_number'])
    op.create_index('idx_receipt_version_status', 'receipt_versions', ['processing_status'])
    op.create_index('idx_receipt_version_uploaded', 'receipt_versions', ['uploaded_at'])
    
    # Create employee_change_log table
    op.create_table('employee_change_log',
        sa.Column('change_id', sa.CHAR(36), nullable=False),
        sa.Column('session_id', sa.CHAR(36), nullable=False),
        sa.Column('employee_id', sa.String(50), nullable=True),
        sa.Column('employee_name', sa.String(255), nullable=False),
        sa.Column('change_type', sa.String(50), nullable=False),
        sa.Column('old_values', sa.JSON(), nullable=True),
        sa.Column('new_values', sa.JSON(), nullable=True),
        sa.Column('change_timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('changed_by', sa.String(100), nullable=False),
        sa.Column('receipt_version', sa.Integer(), nullable=False),
        sa.Column('change_confidence', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('change_reason', sa.String(255), nullable=True),
        sa.Column('requires_review', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['processing_sessions.session_id'], ),
        sa.PrimaryKeyConstraint('change_id')
    )
    
    # Create indexes for employee_change_log
    op.create_index('idx_employee_change_session', 'employee_change_log', ['session_id', 'change_type'])
    op.create_index('idx_employee_change_timestamp', 'employee_change_log', ['change_timestamp'])
    op.create_index('idx_employee_change_review', 'employee_change_log', ['requires_review'])
    op.create_index('idx_employee_change_employee', 'employee_change_log', ['employee_id', 'session_id'])
    
    # Create export_history table
    op.create_table('export_history',
        sa.Column('export_id', sa.CHAR(36), nullable=False),
        sa.Column('session_id', sa.CHAR(36), nullable=False),
        sa.Column('export_type', sa.String(50), nullable=False),
        sa.Column('export_batch_id', sa.String(50), nullable=False),
        sa.Column('employee_count', sa.Integer(), nullable=False),
        sa.Column('exported_by', sa.String(100), nullable=False),
        sa.Column('export_timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('file_size', sa.BigInteger(), nullable=True),
        sa.Column('file_path', sa.String(500), nullable=True),
        sa.Column('delta_only', sa.Boolean(), nullable=False),
        sa.Column('new_employees', sa.Integer(), nullable=False),
        sa.Column('changed_employees', sa.Integer(), nullable=False),
        sa.Column('previously_exported', sa.Integer(), nullable=False),
        sa.Column('export_status', sa.String(50), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['processing_sessions.session_id'], ),
        sa.PrimaryKeyConstraint('export_id')
    )
    
    # Create indexes for export_history
    op.create_index('idx_export_history_session', 'export_history', ['session_id', 'export_timestamp'])
    op.create_index('idx_export_history_batch', 'export_history', ['export_batch_id'])
    op.create_index('idx_export_history_type', 'export_history', ['export_type', 'export_timestamp'])
    op.create_index('idx_export_history_delta', 'export_history', ['delta_only', 'export_timestamp'])
    
    # Create session_processing_states table
    op.create_table('session_processing_states',
        sa.Column('state_id', sa.CHAR(36), nullable=False),
        sa.Column('session_id', sa.CHAR(36), nullable=False),
        sa.Column('state_type', sa.String(50), nullable=False),
        sa.Column('state_data', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.String(100), nullable=False),
        sa.Column('state_version', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['processing_sessions.session_id'], ),
        sa.PrimaryKeyConstraint('state_id')
    )
    
    # Create indexes for session_processing_states
    op.create_index('idx_session_state_type', 'session_processing_states', ['session_id', 'state_type'])
    op.create_index('idx_session_state_active', 'session_processing_states', ['is_active', 'created_at'])
    
    # Create user_notifications table
    op.create_table('user_notifications',
        sa.Column('notification_id', sa.CHAR(36), nullable=False),
        sa.Column('user_id', sa.String(100), nullable=False),
        sa.Column('session_id', sa.CHAR(36), nullable=True),
        sa.Column('notification_type', sa.String(50), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('priority', sa.String(20), nullable=False),
        sa.Column('action_required', sa.Boolean(), nullable=False),
        sa.Column('action_url', sa.String(500), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['processing_sessions.session_id'], ),
        sa.PrimaryKeyConstraint('notification_id')
    )
    
    # Create indexes for user_notifications
    op.create_index('idx_notification_user', 'user_notifications', ['user_id', 'read_at'])
    op.create_index('idx_notification_type', 'user_notifications', ['notification_type', 'created_at'])
    op.create_index('idx_notification_priority', 'user_notifications', ['priority', 'created_at'])
    op.create_index('idx_notification_action', 'user_notifications', ['action_required', 'created_at'])


def downgrade() -> None:
    """Remove Phase 4 models"""
    
    # Drop tables in reverse order
    op.drop_table('user_notifications')
    op.drop_table('session_processing_states')
    op.drop_table('export_history')
    op.drop_table('employee_change_log')
    op.drop_table('receipt_versions')

