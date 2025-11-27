"""Add matrix_space_id to groups table

Revision ID: add_matrix_space_to_groups
Revises: 
Create Date: 2025-11-16

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_matrix_space_to_groups'
down_revision = '004'  # Chain from consolidated migrations
branch_labels = None
depends_on = None


def upgrade():
    # Add matrix_space_id column to groups table
    op.add_column('groups', sa.Column('matrix_space_id', sa.String(255), nullable=True))
    op.create_index('ix_groups_matrix_space_id', 'groups', ['matrix_space_id'], unique=False)


def downgrade():
    op.drop_index('ix_groups_matrix_space_id', table_name='groups')
    op.drop_column('groups', 'matrix_space_id')
