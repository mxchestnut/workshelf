"""Add user reputation scores

Revision ID: 002
Revises: 001
Create Date: 2025-11-10

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001_consolidated'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add reputation score columns to users table
    op.add_column('users', sa.Column('reading_score', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('beta_score', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('writer_score', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    # Remove reputation score columns
    op.drop_column('users', 'writer_score')
    op.drop_column('users', 'beta_score')
    op.drop_column('users', 'reading_score')
