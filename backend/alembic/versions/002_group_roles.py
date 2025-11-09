"""Add custom group roles system

Revision ID: 002_group_roles
Revises: 001_initial
Create Date: 2025-11-09

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '002_group_roles'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create group_roles table
    op.create_table('group_roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('color', sa.String(length=7), nullable=True),
        sa.Column('position', sa.Integer(), nullable=False, server_default='0'),
        
        # Content moderation permissions
        sa.Column('can_delete_posts', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('can_delete_comments', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('can_pin_posts', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('can_lock_threads', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('can_manage_tags', sa.Boolean(), nullable=False, server_default='false'),
        
        # Member management permissions
        sa.Column('can_approve_members', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('can_kick_members', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('can_ban_members', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('can_invite_members', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('can_view_member_list', sa.Boolean(), nullable=False, server_default='true'),
        
        # Publishing permissions
        sa.Column('can_approve_publications', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('can_edit_publications', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('can_feature_publications', sa.Boolean(), nullable=False, server_default='false'),
        
        # Settings permissions
        sa.Column('can_edit_group_info', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('can_manage_roles', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('can_view_analytics', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('can_export_data', sa.Boolean(), nullable=False, server_default='false'),
        
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ondelete='CASCADE'),
    )
    op.create_index('idx_group_roles', 'group_roles', ['group_id', 'position'])
    
    # Create group_member_custom_roles table
    op.create_table('group_member_custom_roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('group_member_id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('assigned_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['group_member_id'], ['group_members.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['group_roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_by'], ['users.id'], ondelete='SET NULL'),
    )
    op.create_index('idx_member_role', 'group_member_custom_roles', ['group_member_id', 'role_id'], unique=True)


def downgrade() -> None:
    op.drop_table('group_member_custom_roles')
    op.drop_table('group_roles')
