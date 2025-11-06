"""make tenant_id nullable for MVP

Revision ID: 014_make_tenant_id_nullable
Revises: 013_registration_fields
Create Date: 2025-11-06

Makes tenant_id nullable on users table for MVP.
Users can be created without a tenant during registration.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '014_make_tenant_id_nullable'
down_revision = '013_registration_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Make tenant_id nullable
    op.alter_column('users', 'tenant_id',
               existing_type=sa.INTEGER(),
               nullable=True)


def downgrade() -> None:
    # Revert to NOT NULL (will fail if there are users without tenant_id)
    op.alter_column('users', 'tenant_id',
               existing_type=sa.INTEGER(),
               nullable=False)
