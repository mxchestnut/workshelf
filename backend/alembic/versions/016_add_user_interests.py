"""add user interests

Revision ID: 016
Revises: 015
Create Date: 2025-11-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY


# revision identifiers
revision = '016'
down_revision = '015'
branch_labels = None
depends_on = None


def upgrade():
    # Add interests array column to users table
    op.add_column('users', sa.Column('interests', ARRAY(sa.String()), nullable=True))


def downgrade():
    op.drop_column('users', 'interests')
