"""add_matrix_onboarding_seen_field

Revision ID: 8fa573749fa2
Revises: 0551cb5318e6
Create Date: 2025-11-16 06:22:35.197019

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8fa573749fa2'
down_revision = '0551cb5318e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add matrix_onboarding_seen column to users table
    op.add_column('users', sa.Column('matrix_onboarding_seen', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    # Remove matrix_onboarding_seen column
    op.drop_column('users', 'matrix_onboarding_seen')
