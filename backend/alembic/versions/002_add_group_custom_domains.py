"""Add custom domain support for groups

Revision ID: 002_add_group_custom_domains
Revises: 001_initial
Create Date: 2025-11-04 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002_add_group_custom_domains'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade():
    # Add custom domain capability flag to groups
    op.add_column('groups', sa.Column('can_use_custom_domain', sa.Boolean(), nullable=False, server_default='false'))
    
    # Create group_custom_domains table
    op.create_table('group_custom_domains',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('domain', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('dns_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('dns_verification_token', sa.String(length=255), nullable=True),
        sa.Column('ssl_status', sa.String(length=50), nullable=True),
        sa.Column('requested_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('approved_by', sa.Integer(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_group_custom_domains_domain'), 'group_custom_domains', ['domain'], unique=True)
    op.create_index(op.f('ix_group_custom_domains_group_id'), 'group_custom_domains', ['group_id'])
    op.create_index(op.f('ix_group_custom_domains_status'), 'group_custom_domains', ['status'])


def downgrade():
    op.drop_index(op.f('ix_group_custom_domains_status'), table_name='group_custom_domains')
    op.drop_index(op.f('ix_group_custom_domains_group_id'), table_name='group_custom_domains')
    op.drop_index(op.f('ix_group_custom_domains_domain'), table_name='group_custom_domains')
    op.drop_table('group_custom_domains')
    op.drop_column('groups', 'can_use_custom_domain')
