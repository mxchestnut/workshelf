"""add folder_id to documents

Revision ID: 006
Revises: 005
Create Date: 2025-12-01

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    # Add folder_id column to documents table
    op.add_column('documents', sa.Column('folder_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_documents_folder_id'), 'documents', ['folder_id'], unique=False)
    op.create_foreign_key('fk_documents_folder_id', 'documents', 'folders', ['folder_id'], ['id'], ondelete='SET NULL')


def downgrade():
    op.drop_constraint('fk_documents_folder_id', 'documents', type_='foreignkey')
    op.drop_index(op.f('ix_documents_folder_id'), table_name='documents')
    op.drop_column('documents', 'folder_id')
