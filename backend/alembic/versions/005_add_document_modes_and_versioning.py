"""Add document modes and enhanced versioning

Revision ID: 005_add_document_modes
Revises: 004_add_feedback_document_to_beta_requests
Create Date: 2025-12-06 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005_add_document_modes'
down_revision = '004_add_feedback_document_to_beta_requests'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create DocumentMode enum type
    document_mode_enum = postgresql.ENUM(
        'alpha', 'beta', 'publish', 'read',
        name='documentmode',
        create_type=True
    )
    document_mode_enum.create(op.get_bind(), checkfirst=True)
    
    # Add mode column to documents table
    op.add_column('documents', sa.Column('mode', sa.Enum('alpha', 'beta', 'publish', 'read', name='documentmode'), 
                                         nullable=False, server_default='alpha'))
    
    # Add mode tracking columns to document_versions table
    op.add_column('document_versions', sa.Column('mode', sa.Enum('alpha', 'beta', 'publish', 'read', name='documentmode'), 
                                                  nullable=False, server_default='alpha'))
    op.add_column('document_versions', sa.Column('previous_mode', sa.Enum('alpha', 'beta', 'publish', 'read', name='documentmode'), 
                                                  nullable=True))
    op.add_column('document_versions', sa.Column('is_mode_transition', sa.Boolean(), 
                                                  nullable=False, server_default='false'))
    
    # Create index on mode for better query performance
    op.create_index('ix_documents_mode', 'documents', ['mode'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_documents_mode', table_name='documents')
    
    # Drop columns from document_versions
    op.drop_column('document_versions', 'is_mode_transition')
    op.drop_column('document_versions', 'previous_mode')
    op.drop_column('document_versions', 'mode')
    
    # Drop column from documents
    op.drop_column('documents', 'mode')
    
    # Drop enum type
    document_mode_enum = postgresql.ENUM(name='documentmode', create_type=False)
    document_mode_enum.drop(op.get_bind(), checkfirst=True)
