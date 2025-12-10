"""add moderation audit log and post locking

Revision ID: e8f2a3b4c5d6
Revises: d581419db814
Create Date: 2025-11-12 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'e8f2a3b4c5d6'
down_revision = 'd581419db814'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_locked column to group_posts table
    op.add_column('group_posts', sa.Column('is_locked', sa.Boolean(), nullable=False, server_default='false'))
    
    # Create moderation_actions table
    op.create_table(
        'moderation_actions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('moderator_id', sa.Integer(), nullable=True),
        sa.Column('action_type', sa.Enum(
            'DELETE_POST', 'DELETE_COMMENT', 'PIN_POST', 'UNPIN_POST',
            'LOCK_THREAD', 'UNLOCK_THREAD', 'BAN_MEMBER', 'KICK_MEMBER', 'WARN_MEMBER',
            name='moderationactiontype'
        ), nullable=False),
        sa.Column('target_type', sa.String(50), nullable=True),
        sa.Column('target_id', sa.Integer(), nullable=True),
        sa.Column('target_user_id', sa.Integer(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('action_metadata', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['moderator_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['target_user_id'], ['users.id'], ondelete='SET NULL'),
    )
    
    # Create indexes
    op.create_index('idx_moderation_group_date', 'moderation_actions', ['group_id', 'created_at'])
    op.create_index('idx_moderation_moderator', 'moderation_actions', ['moderator_id', 'created_at'])
    op.create_index('idx_moderation_action_type', 'moderation_actions', ['action_type', 'created_at'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_moderation_action_type', table_name='moderation_actions')
    op.drop_index('idx_moderation_moderator', table_name='moderation_actions')
    op.drop_index('idx_moderation_group_date', table_name='moderation_actions')
    
    # Drop moderation_actions table
    op.drop_table('moderation_actions')
    
    # Drop enum type
    op.execute('DROP TYPE moderationactiontype')
    
    # Remove is_locked column from group_posts
    op.drop_column('group_posts', 'is_locked')
