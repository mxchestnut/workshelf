"""add trash bin for soft deletes

Revision ID: 006
Revises: 005
Create Date: 2025-12-03

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime, timezone


# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add soft delete columns to documents table
    op.add_column('documents', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('documents', sa.Column('deleted_at', sa.DateTime(), nullable=True))
    
    # Add index on is_deleted for efficient filtering
    op.create_index('ix_documents_is_deleted', 'documents', ['is_deleted'])
    
    # Add soft delete columns to projects table
    op.add_column('projects', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('projects', sa.Column('deleted_at', sa.DateTime(), nullable=True))
    
    # Add index on is_deleted for projects
    op.create_index('ix_projects_is_deleted', 'projects', ['is_deleted'])


def downgrade() -> None:
    # Remove indexes
    op.drop_index('ix_projects_is_deleted', 'projects')
    op.drop_index('ix_documents_is_deleted', 'documents')
    
    # Remove columns
    op.drop_column('projects', 'deleted_at')
    op.drop_column('projects', 'is_deleted')
    op.drop_column('documents', 'deleted_at')
    op.drop_column('documents', 'is_deleted')
