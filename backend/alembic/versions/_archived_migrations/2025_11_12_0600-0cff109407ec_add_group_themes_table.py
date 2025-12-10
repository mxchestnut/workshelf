"""add_group_themes_table

Revision ID: 0cff109407ec
Revises: 
Create Date: 2025-11-12 06:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0cff109407ec'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add group_themes table for custom group branding."""
    op.create_table(
        'group_themes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('primary_color', sa.String(length=7), nullable=True, server_default='#B34B0C'),
        sa.Column('secondary_color', sa.String(length=7), nullable=True, server_default='#524944'),
        sa.Column('accent_color', sa.String(length=7), nullable=True, server_default='#D97706'),
        sa.Column('background_color', sa.String(length=7), nullable=True, server_default='#1F1B18'),
        sa.Column('text_color', sa.String(length=7), nullable=True, server_default='#FFFFFF'),
        sa.Column('heading_font', sa.String(length=100), nullable=True, server_default='Inter'),
        sa.Column('body_font', sa.String(length=100), nullable=True, server_default='Inter'),
        sa.Column('logo_url', sa.String(length=500), nullable=True),
        sa.Column('banner_url', sa.String(length=500), nullable=True),
        sa.Column('favicon_url', sa.String(length=500), nullable=True),
        sa.Column('custom_css', sa.Text(), nullable=True),
        sa.Column('layout_config', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_group_themes_group_id'), 'group_themes', ['group_id'], unique=True)


def downgrade() -> None:
    """Remove group_themes table."""
    op.drop_index(op.f('ix_group_themes_group_id'), table_name='group_themes')
    op.drop_table('group_themes')
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0cff109407ec'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
