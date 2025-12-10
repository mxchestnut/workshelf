"""Add Matrix account connection fields

Revision ID: 006_add_matrix_account_connection
Revises: 005_add_phase5_studio_customization_tables
Create Date: 2025-12-01

This migration adds fields to support connecting external Matrix accounts instead of
managing Matrix users on our own homeserver.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '006_add_matrix_account_connection'
down_revision = '005_phase5_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add columns for user-provided Matrix credentials
    op.add_column('users', sa.Column('matrix_access_token', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('matrix_homeserver', sa.String(255), nullable=True))
    
    # Create index for faster lookups
    op.create_index('ix_users_matrix_user_id', 'users', ['matrix_user_id'])


def downgrade() -> None:
    op.drop_index('ix_users_matrix_user_id', 'users')
    op.drop_column('users', 'matrix_homeserver')
    op.drop_column('users', 'matrix_access_token')
