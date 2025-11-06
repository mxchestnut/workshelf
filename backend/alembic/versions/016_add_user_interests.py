"""add user interests

Revision ID: 016_add_user_interests
Revises: 015_make_username_nullable
Create Date: 2025-11-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY


# revision identifiers
revision = '016_add_user_interests'
down_revision = '015_make_username_nullable'
branch_labels = None
depends_on = None


def upgrade():
    # Add interests array column to users table
    op.add_column('users', sa.Column('interests', ARRAY(sa.String()), nullable=True))


def downgrade():
    op.drop_column('users', 'interests')
