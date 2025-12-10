"""add feedback_document_id to beta_requests

Revision ID: 004
Revises: 003
Create Date: 2025-11-11

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    # Add feedback_document_id column to beta_requests
    op.add_column('beta_requests', 
        sa.Column('feedback_document_id', sa.Integer(), nullable=True)
    )
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_beta_requests_feedback_document',
        'beta_requests', 'documents',
        ['feedback_document_id'], ['id'],
        ondelete='SET NULL'
    )
    
    # Add index for better query performance
    op.create_index(
        'idx_beta_requests_feedback_document',
        'beta_requests',
        ['feedback_document_id']
    )


def downgrade():
    # Remove index
    op.drop_index('idx_beta_requests_feedback_document', table_name='beta_requests')
    
    # Remove foreign key
    op.drop_constraint('fk_beta_requests_feedback_document', 'beta_requests', type_='foreignkey')
    
    # Remove column
    op.drop_column('beta_requests', 'feedback_document_id')
