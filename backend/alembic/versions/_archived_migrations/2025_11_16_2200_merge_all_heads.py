"""merge all migration heads

Revision ID: merge_all_heads_final
Revises: 002, add_user_approval
Create Date: 2025-11-16 22:00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'merge_all_heads_final'
down_revision = ('002', 'add_user_approval')
branch_labels = None
depends_on = None


def upgrade():
    # This is a merge migration - no schema changes needed
    pass


def downgrade():
    # This is a merge migration - no schema changes needed
    pass
