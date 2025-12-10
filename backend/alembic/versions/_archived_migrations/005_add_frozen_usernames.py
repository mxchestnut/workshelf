"""add frozen usernames table

Revision ID: 005
Revises: 004
Create Date: 2025-12-03

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime, timezone


# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create frozen_usernames table
    op.create_table(
        'frozen_usernames',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(100), nullable=False),
        sa.Column('frozen_at', sa.DateTime(), nullable=False, default=datetime.now(timezone.utc)),
        sa.Column('thaw_at', sa.DateTime(), nullable=False),
        sa.Column('original_user_email', sa.String(255), nullable=False),
        sa.Column('original_keycloak_id', sa.String(255), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username')
    )
    
    # Create index on username for fast lookups
    op.create_index('ix_frozen_usernames_username', 'frozen_usernames', ['username'])
    
    # Create index on thaw_at for cleanup queries
    op.create_index('ix_frozen_usernames_thaw_at', 'frozen_usernames', ['thaw_at'])


def downgrade() -> None:
    op.drop_index('ix_frozen_usernames_thaw_at', 'frozen_usernames')
    op.drop_index('ix_frozen_usernames_username', 'frozen_usernames')
    op.drop_table('frozen_usernames')
