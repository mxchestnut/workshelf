"""make username nullable for onboarding

Revision ID: 015_make_username_nullable
Revises: 014_make_tenant_id_nullable
Create Date: 2025-11-06

Makes username nullable on users table.
Username is set during onboarding, not at registration.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '015_make_username_nullable'
down_revision = '014_make_tenant_id_nullable'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Make username nullable
    op.alter_column('users', 'username',
               existing_type=sa.VARCHAR(length=100),
               nullable=True)


def downgrade() -> None:
    # Revert to NOT NULL (will fail if there are users without username)
    op.alter_column('users', 'username',
               existing_type=sa.VARCHAR(length=100),
               nullable=False)
