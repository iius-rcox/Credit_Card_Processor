"""add_session_closure_fields

Revision ID: a65a60ab28c9
Revises: 33f13e04dd33
Create Date: 2025-09-10 16:22:10.288035

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a65a60ab28c9'
down_revision: Union[str, Sequence[str], None] = '33f13e04dd33'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add session closure tracking fields to processing_sessions table."""
    # Add is_closed field
    op.add_column('processing_sessions', sa.Column('is_closed', sa.Boolean(), nullable=False, server_default='false'))
    
    # Add closure tracking fields
    op.add_column('processing_sessions', sa.Column('closure_reason', sa.String(500), nullable=True))
    op.add_column('processing_sessions', sa.Column('closed_by', sa.String(100), nullable=True))
    op.add_column('processing_sessions', sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True))
    
    # Create index for closed sessions
    op.create_index('idx_session_closed_status', 'processing_sessions', ['is_closed', 'status'])
    
    # Update existing PAUSED sessions to be closed (migration strategy from plan)
    op.execute("UPDATE processing_sessions SET is_closed = true WHERE status = 'PAUSED'")


def downgrade() -> None:
    """Remove session closure tracking fields."""
    # Drop index
    op.drop_index('idx_session_closed_status', 'processing_sessions')
    
    # Drop columns
    op.drop_column('processing_sessions', 'closed_at')
    op.drop_column('processing_sessions', 'closed_by')
    op.drop_column('processing_sessions', 'closure_reason')
    op.drop_column('processing_sessions', 'is_closed')
    
    # Convert any CLOSED sessions back to PAUSED for compatibility
    op.execute("UPDATE processing_sessions SET status = 'PAUSED' WHERE status = 'CLOSED'")
