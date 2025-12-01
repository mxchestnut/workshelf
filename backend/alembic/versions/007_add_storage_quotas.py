"""Add storage quotas and subscription tracking

Revision ID: 007_storage_quotas
Revises: 006_add_matrix_account_connection
Create Date: 2025-12-01

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '007_storage_quotas'
down_revision = '006_add_matrix_account_connection'
branch_labels = None
depends_on = None


def upgrade():
    # Add storage columns to users table
    op.add_column('users', sa.Column('storage_used_bytes', sa.BigInteger(), server_default='0', nullable=False))
    op.add_column('users', sa.Column('storage_limit_bytes', sa.BigInteger(), server_default='104857600', nullable=False))  # 100MB default
    
    # Add subscription tracking columns
    op.add_column('users', sa.Column('subscription_tier', sa.String(50), server_default='free', nullable=False))
    op.add_column('users', sa.Column('stripe_customer_id', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('stripe_subscription_id', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('subscription_status', sa.String(50), nullable=True))
    op.add_column('users', sa.Column('subscription_expires_at', sa.DateTime(), nullable=True))
    
    # Create indexes for subscription queries
    op.create_index('ix_users_subscription_tier', 'users', ['subscription_tier'])
    op.create_index('ix_users_stripe_customer_id', 'users', ['stripe_customer_id'])
    
    # Add storage columns to tenants table (for multi-tenant quotas)
    op.add_column('tenants', sa.Column('storage_used_bytes', sa.BigInteger(), server_default='0', nullable=False))
    op.add_column('tenants', sa.Column('storage_limit_bytes', sa.BigInteger(), server_default='1073741824', nullable=False))  # 1GB default


def downgrade():
    # Drop indexes
    op.drop_index('ix_users_stripe_customer_id', table_name='users')
    op.drop_index('ix_users_subscription_tier', table_name='users')
    
    # Drop user columns
    op.drop_column('users', 'subscription_expires_at')
    op.drop_column('users', 'subscription_status')
    op.drop_column('users', 'stripe_subscription_id')
    op.drop_column('users', 'stripe_customer_id')
    op.drop_column('users', 'subscription_tier')
    op.drop_column('users', 'storage_limit_bytes')
    op.drop_column('users', 'storage_used_bytes')
    
    # Drop tenant columns
    op.drop_column('tenants', 'storage_limit_bytes')
    op.drop_column('tenants', 'storage_used_bytes')
