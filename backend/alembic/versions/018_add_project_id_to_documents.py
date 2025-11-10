"""add project_id to documents

Revision ID: 018
Revises: 017
Create Date: 2025-11-09

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '018'
down_revision = '017'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add project_id column to documents (nullable for existing documents)
    op.add_column('documents', sa.Column('project_id', sa.Integer(), nullable=True))
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_documents_project_id',
        'documents', 'projects',
        ['project_id'], ['id'],
        ondelete='SET NULL'
    )
    
    # Add index for better query performance
    op.create_index('ix_documents_project_id', 'documents', ['project_id'])


def downgrade() -> None:
    op.drop_index('ix_documents_project_id', table_name='documents')
    op.drop_constraint('fk_documents_project_id', 'documents', type_='foreignkey')
    op.drop_column('documents', 'project_id')
