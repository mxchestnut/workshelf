"""add matrix credentials to users

Revision ID: g1h2i3j4k5l6
Revises: f9a2b3c4d5e6
Create Date: 2025-11-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'g1h2i3j4k5l6'
down_revision = 'f9a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add Matrix messaging credentials to users table"""
    
    # Add Matrix user ID column
    op.add_column(
        'users',
        sa.Column('matrix_user_id', sa.String(255), nullable=True)
    )
    
    # Add Matrix access token column
    op.add_column(
        'users',
        sa.Column('matrix_access_token', sa.Text(), nullable=True)
    )
    
    # Add Matrix homeserver URL column
    op.add_column(
        'users',
        sa.Column('matrix_homeserver', sa.String(255), nullable=True, server_default='https://matrix.workshelf.dev')
    )
    
    # Create index on matrix_user_id for fast lookups
    op.create_index(
        'ix_users_matrix_user_id',
        'users',
        ['matrix_user_id'],
        unique=True
    )


def downgrade() -> None:
    """Remove Matrix credentials from users table"""
    
    # Drop index first
    op.drop_index('ix_users_matrix_user_id', table_name='users')
    
    # Drop columns
    op.drop_column('users', 'matrix_homeserver')
    op.drop_column('users', 'matrix_access_token')
    op.drop_column('users', 'matrix_user_id')
