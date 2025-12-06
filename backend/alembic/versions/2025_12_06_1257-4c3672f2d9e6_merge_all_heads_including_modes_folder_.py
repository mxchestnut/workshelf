"""merge all heads including modes, folder_id

Revision ID: 4c3672f2d9e6
Revises: 005_add_document_modes, 006, 008_folder_id
Create Date: 2025-12-06 12:57:13.526290

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4c3672f2d9e6'
down_revision = ('005_add_document_modes', '006', '008_folder_id')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
