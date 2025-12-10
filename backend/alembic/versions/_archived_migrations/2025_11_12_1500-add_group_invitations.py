"""add group invitations

Revision ID: f9a2b3c4d5e6
Revises: e8f2a3b4c5d6
Create Date: 2025-11-12 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'f9a2b3c4d5e6'
down_revision = 'e8f2a3b4c5d6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create group_invitations table
    # Note: groupmemberrole enum already exists, we'll reference it
    op.create_table(
        'group_invitations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('token', sa.String(100), nullable=False),
        sa.Column('invited_by', sa.Integer(), nullable=True),
        sa.Column('role', postgresql.ENUM('OWNER', 'ADMIN', 'MODERATOR', 'MEMBER', name='groupmemberrole', create_type=False), nullable=False, server_default='MEMBER'),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum(
            'PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED',
            name='groupinvitationstatus'
        ), nullable=False, server_default='PENDING'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('accepted_by', sa.Integer(), nullable=True),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['invited_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['accepted_by'], ['users.id'], ondelete='SET NULL'),
    )
    
    # Create indexes
    op.create_index('idx_group_invitations_group_email', 'group_invitations', ['group_id', 'email'])
    op.create_index('idx_group_invitations_status', 'group_invitations', ['status', 'expires_at'])
    op.create_index(op.f('ix_group_invitations_email'), 'group_invitations', ['email'])
    op.create_index(op.f('ix_group_invitations_group_id'), 'group_invitations', ['group_id'])
    op.create_index(op.f('ix_group_invitations_token'), 'group_invitations', ['token'], unique=True)


def downgrade() -> None:
    # Drop indexes
    op.drop_index(op.f('ix_group_invitations_token'), table_name='group_invitations')
    op.drop_index(op.f('ix_group_invitations_group_id'), table_name='group_invitations')
    op.drop_index(op.f('ix_group_invitations_email'), table_name='group_invitations')
    op.drop_index('idx_group_invitations_status', table_name='group_invitations')
    op.drop_index('idx_group_invitations_group_email', table_name='group_invitations')
    
    # Drop table
    op.drop_table('group_invitations')
    
    # Drop enum types
    op.execute('DROP TYPE IF EXISTS groupinvitationstatus')
    # Note: Don't drop groupmemberrole as it's used by other tables
