"""add_group_homepage_fields

Revision ID: 596e4c63ad90
Revises: 345bc8390dc7
Create Date: 2025-11-12 06:27:38.784513

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '596e4c63ad90'
down_revision = '345bc8390dc7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add homepage content fields to groups table
    op.add_column('groups', sa.Column('tagline', sa.String(500), nullable=True))
    op.add_column('groups', sa.Column('hero_image_url', sa.String(500), nullable=True))
    op.add_column('groups', sa.Column('about_page', sa.Text(), nullable=True))
    op.add_column('groups', sa.Column('featured_posts', postgresql.JSON(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    # Remove homepage content fields
    op.drop_column('groups', 'featured_posts')
    op.drop_column('groups', 'about_page')
    op.drop_column('groups', 'hero_image_url')
    op.drop_column('groups', 'tagline')
