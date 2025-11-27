"""merge_matrix_and_moderation_migrations

Revision ID: 0551cb5318e6
Revises: g1h2i3j4k5l6, add_matrix_space_to_groups
Create Date: 2025-11-16 06:22:26.449389

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0551cb5318e6'
down_revision = ('g1h2i3j4k5l6', 'add_matrix_space_to_groups')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
