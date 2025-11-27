"""add_group_followers_table

Revision ID: 345bc8390dc7
Revises: 0cff109407ec
Create Date: 2025-11-12 06:21:00.045077

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '345bc8390dc7'
down_revision = '0cff109407ec'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create group_followers table
    op.create_table(
        'group_followers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    
    # Create indexes
    op.create_index('idx_group_follower', 'group_followers', ['group_id', 'user_id'], unique=True)
    op.create_index('idx_group_followers_active', 'group_followers', ['group_id', 'is_active'])
    op.create_index(op.f('ix_group_followers_group_id'), 'group_followers', ['group_id'])
    op.create_index(op.f('ix_group_followers_user_id'), 'group_followers', ['user_id'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index(op.f('ix_group_followers_user_id'), table_name='group_followers')
    op.drop_index(op.f('ix_group_followers_group_id'), table_name='group_followers')
    op.drop_index('idx_group_followers_active', table_name='group_followers')
    op.drop_index('idx_group_follower', table_name='group_followers')
    
    # Drop table
    op.drop_table('group_followers')

