"""add_group_analytics_table

Revision ID: d581419db814
Revises: 596e4c63ad90
Create Date: 2025-11-12 06:31:44.291145

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'd581419db814'
down_revision = '596e4c63ad90'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create group_analytics table
    op.create_table(
        'group_analytics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('period_type', sa.String(20), nullable=True, server_default='daily'),
        
        # View metrics
        sa.Column('total_views', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('unique_views', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('post_views', sa.Integer(), nullable=True, server_default='0'),
        
        # Follower metrics
        sa.Column('total_followers', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('new_followers', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('unfollowed', sa.Integer(), nullable=True, server_default='0'),
        
        # Member metrics
        sa.Column('total_members', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('new_members', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('active_members', sa.Integer(), nullable=True, server_default='0'),
        
        # Content metrics
        sa.Column('total_posts', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('new_posts', sa.Integer(), nullable=True, server_default='0'),
        
        # Engagement metrics
        sa.Column('total_comments', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('total_reactions', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('total_shares', sa.Integer(), nullable=True, server_default='0'),
        
        # Growth metrics
        sa.Column('follower_growth_rate', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('member_growth_rate', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('engagement_rate', sa.Integer(), nullable=True, server_default='0'),
        
        # Top content
        sa.Column('top_posts', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ondelete='CASCADE')
    )
    
    # Create indexes
    op.create_index(op.f('ix_group_analytics_group_id'), 'group_analytics', ['group_id'])
    op.create_index(op.f('ix_group_analytics_date'), 'group_analytics', ['date'])
    op.create_index('idx_group_analytics_period', 'group_analytics', ['group_id', 'date', 'period_type'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_group_analytics_period', table_name='group_analytics')
    op.drop_index(op.f('ix_group_analytics_date'), table_name='group_analytics')
    op.drop_index(op.f('ix_group_analytics_group_id'), table_name='group_analytics')
    
    # Drop table
    op.drop_table('group_analytics')
