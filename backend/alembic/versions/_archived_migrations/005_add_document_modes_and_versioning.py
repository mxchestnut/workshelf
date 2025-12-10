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
down_revision = 'merge_all_heads_final'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop existing enum if it has wrong case
    op.execute("DROP TYPE IF EXISTS documentmode CASCADE")
    
    # Create DocumentMode enum type with lowercase values using raw SQL
    op.execute("CREATE TYPE documentmode AS ENUM ('alpha', 'beta', 'publish', 'read')")
    
    # Add mode column to documents table
    op.execute("ALTER TABLE documents ADD COLUMN mode documentmode NOT NULL DEFAULT 'alpha'")
    
    # Add mode tracking columns to document_versions table
    op.execute("ALTER TABLE document_versions ADD COLUMN mode documentmode NOT NULL DEFAULT 'alpha'")
    op.execute("ALTER TABLE document_versions ADD COLUMN previous_mode documentmode")
    op.execute("ALTER TABLE document_versions ADD COLUMN is_mode_transition BOOLEAN NOT NULL DEFAULT false")
    
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
