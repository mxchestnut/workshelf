"""Add scholarship system

Revision ID: 010_add_scholarship_system
Revises: 009_add_group_custom_domains
Create Date: 2025-11-04 21:50:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '010_add_scholarship_system'
down_revision = '009_add_group_custom_domains'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create scholarship_requests table
    op.create_table(
        'scholarship_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('request_type', sa.String(50), nullable=False),  # 'free', 'sliding_scale'
        sa.Column('current_financial_situation', sa.Text(), nullable=False),
        sa.Column('why_important', sa.Text(), nullable=False),
        sa.Column('how_will_use', sa.Text(), nullable=False),
        sa.Column('additional_info', sa.Text()),
        sa.Column('monthly_budget', sa.Numeric(10, 2)),  # Optional: what they can afford
        sa.Column('approved_plan', sa.String(50)),  # 'free', 'basic', 'pro', 'custom'
        sa.Column('approved_discount_percent', sa.Integer()),  # 0-100
        sa.Column('approved_monthly_price', sa.Numeric(10, 2)),
        sa.Column('staff_notes', sa.Text()),
        sa.Column('rejection_reason', sa.Text()),
        sa.Column('requested_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(timezone=True)),
        sa.Column('reviewed_by', sa.Integer()),
        sa.Column('expires_at', sa.DateTime(timezone=True)),  # When scholarship expires
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ondelete='SET NULL'),
    )
    
    op.create_index('idx_scholarship_status', 'scholarship_requests', ['status'])
    op.create_index('idx_scholarship_group', 'scholarship_requests', ['group_id'])
    op.create_index('idx_scholarship_user', 'scholarship_requests', ['user_id'])
    
    # Add scholarship fields to groups table
    op.add_column('groups', sa.Column('has_scholarship', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('groups', sa.Column('scholarship_plan', sa.String(50)))  # Which plan they got
    op.add_column('groups', sa.Column('scholarship_discount_percent', sa.Integer()))
    op.add_column('groups', sa.Column('scholarship_monthly_price', sa.Numeric(10, 2)))
    op.add_column('groups', sa.Column('scholarship_expires_at', sa.DateTime(timezone=True)))


def downgrade() -> None:
    # Remove columns from groups
    op.drop_column('groups', 'scholarship_expires_at')
    op.drop_column('groups', 'scholarship_monthly_price')
    op.drop_column('groups', 'scholarship_discount_percent')
    op.drop_column('groups', 'scholarship_plan')
    op.drop_column('groups', 'has_scholarship')
    
    # Drop indexes
    op.drop_index('idx_scholarship_user', 'scholarship_requests')
    op.drop_index('idx_scholarship_group', 'scholarship_requests')
    op.drop_index('idx_scholarship_status', 'scholarship_requests')
    
    # Drop table
    op.drop_table('scholarship_requests')
