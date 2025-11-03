"""phase6_monetization

Revision ID: 006_phase6
Revises: 005_phase5
Create Date: 2024-11-03

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '006_phase6'
down_revision = '005_phase5'
branch_labels = None
depends_on = None


def upgrade():
    # Create subscription_tiers table
    op.create_table('subscription_tiers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tier_type', sa.Enum('FREE', 'READER', 'CREATOR', 'PREMIUM', 'ENTERPRISE', name='subscriptiontiertype'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('monthly_price_cents', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('yearly_price_cents', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('max_documents', sa.Integer(), nullable=True),
        sa.Column('max_storage_mb', sa.Integer(), nullable=True),
        sa.Column('max_studios', sa.Integer(), nullable=True),
        sa.Column('max_collaborators', sa.Integer(), nullable=True),
        sa.Column('custom_domains', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('priority_support', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('analytics', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('monetization_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('api_access', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('stripe_monthly_price_id', sa.String(length=255), nullable=True),
        sa.Column('stripe_yearly_price_id', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tier_type')
    )
    op.create_index(op.f('ix_subscription_tiers_id'), 'subscription_tiers', ['id'])
    op.create_index(op.f('ix_subscription_tiers_tier_type'), 'subscription_tiers', ['tier_type'])

    # Create subscriptions table
    op.create_table('subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('tier_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'UNPAID', 'INCOMPLETE', name='subscriptionstatus'), nullable=False, server_default='ACTIVE'),
        sa.Column('interval', sa.Enum('MONTHLY', 'YEARLY', name='billinginterval'), nullable=False, server_default='MONTHLY'),
        sa.Column('current_period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('current_period_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('cancel_at_period_end', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('canceled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('trial_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('trial_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('stripe_customer_id', sa.String(length=255), nullable=True),
        sa.Column('stripe_subscription_id', sa.String(length=255), nullable=True),
        sa.Column('stripe_payment_method_id', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['tier_id'], ['subscription_tiers.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('stripe_subscription_id')
    )
    op.create_index('idx_subscription_period', 'subscriptions', ['current_period_start', 'current_period_end'])
    op.create_index('idx_user_status', 'subscriptions', ['user_id', 'status'])
    op.create_index(op.f('ix_subscriptions_id'), 'subscriptions', ['id'])
    op.create_index(op.f('ix_subscriptions_stripe_customer_id'), 'subscriptions', ['stripe_customer_id'])
    op.create_index(op.f('ix_subscriptions_stripe_subscription_id'), 'subscriptions', ['stripe_subscription_id'])
    op.create_index(op.f('ix_subscriptions_tier_id'), 'subscriptions', ['tier_id'])
    op.create_index(op.f('ix_subscriptions_user_id'), 'subscriptions', ['user_id'])

    # Create payments table
    op.create_table('payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('subscription_id', sa.Integer(), nullable=True),
        sa.Column('amount_cents', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='USD'),
        sa.Column('status', sa.Enum('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'CANCELED', name='paymentstatus'), nullable=False, server_default='PENDING'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('invoice_url', sa.String(length=500), nullable=True),
        sa.Column('receipt_url', sa.String(length=500), nullable=True),
        sa.Column('stripe_payment_intent_id', sa.String(length=255), nullable=True),
        sa.Column('stripe_charge_id', sa.String(length=255), nullable=True),
        sa.Column('stripe_invoice_id', sa.String(length=255), nullable=True),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('refunded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['subscription_id'], ['subscriptions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('stripe_payment_intent_id')
    )
    op.create_index('idx_payment_status', 'payments', ['status', 'created_at'])
    op.create_index('idx_user_payments', 'payments', ['user_id', 'created_at'])
    op.create_index(op.f('ix_payments_id'), 'payments', ['id'])
    op.create_index(op.f('ix_payments_status'), 'payments', ['status'])
    op.create_index(op.f('ix_payments_stripe_charge_id'), 'payments', ['stripe_charge_id'])
    op.create_index(op.f('ix_payments_stripe_invoice_id'), 'payments', ['stripe_invoice_id'])
    op.create_index(op.f('ix_payments_stripe_payment_intent_id'), 'payments', ['stripe_payment_intent_id'])
    op.create_index(op.f('ix_payments_subscription_id'), 'payments', ['subscription_id'])
    op.create_index(op.f('ix_payments_user_id'), 'payments', ['user_id'])

    # Create creator_earnings table
    op.create_table('creator_earnings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('total_earned_cents', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('pending_payout_cents', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('paid_out_cents', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('subscriber_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('monthly_recurring_revenue_cents', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('platform_fee_percentage', sa.Integer(), nullable=False, server_default='15'),
        sa.Column('stripe_connect_account_id', sa.String(length=255), nullable=True),
        sa.Column('stripe_connect_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('stripe_connect_account_id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_creator_earnings_id'), 'creator_earnings', ['id'])
    op.create_index(op.f('ix_creator_earnings_stripe_connect_account_id'), 'creator_earnings', ['stripe_connect_account_id'])
    op.create_index(op.f('ix_creator_earnings_user_id'), 'creator_earnings', ['user_id'])

    # Create payouts table
    op.create_table('payouts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('creator_earnings_id', sa.Integer(), nullable=False),
        sa.Column('amount_cents', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='USD'),
        sa.Column('fee_cents', sa.Integer(), nullable=False),
        sa.Column('net_amount_cents', sa.Integer(), nullable=False),
        sa.Column('payout_method', sa.String(length=50), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELED', name='payoutstatus'), nullable=False, server_default='PENDING'),
        sa.Column('stripe_payout_id', sa.String(length=255), nullable=True),
        sa.Column('requested_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['creator_earnings_id'], ['creator_earnings.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('stripe_payout_id')
    )
    op.create_index('idx_creator_payouts', 'payouts', ['creator_earnings_id', 'created_at'])
    op.create_index('idx_payout_status', 'payouts', ['status', 'requested_at'])
    op.create_index(op.f('ix_payouts_creator_earnings_id'), 'payouts', ['creator_earnings_id'])
    op.create_index(op.f('ix_payouts_id'), 'payouts', ['id'])
    op.create_index(op.f('ix_payouts_status'), 'payouts', ['status'])
    op.create_index(op.f('ix_payouts_stripe_payout_id'), 'payouts', ['stripe_payout_id'])

    # Seed default subscription tiers
    op.execute("""
        INSERT INTO subscription_tiers (tier_type, name, description, monthly_price_cents, yearly_price_cents, max_documents, max_storage_mb, custom_domains, analytics, monetization_enabled)
        VALUES 
            ('FREE', 'Free', 'Perfect for trying out Work Shelf', 0, 0, 5, 100, false, false, false),
            ('READER', 'Reader', 'For dedicated readers', 499, 4990, NULL, 5000, false, true, false),
            ('CREATOR', 'Creator', 'For serious writers', 1499, 14990, NULL, 50000, true, true, true),
            ('PREMIUM', 'Premium', 'For professional authors', 2999, 29990, NULL, NULL, true, true, true),
            ('ENTERPRISE', 'Enterprise', 'For teams and organizations', 9999, 99990, NULL, NULL, true, true, true)
    """)


def downgrade():
    op.drop_table('payouts')
    op.drop_table('creator_earnings')
    op.drop_table('payments')
    op.drop_table('subscriptions')
    op.drop_table('subscription_tiers')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS payoutstatus')
    op.execute('DROP TYPE IF EXISTS paymentstatus')
    op.execute('DROP TYPE IF EXISTS billinginterval')
    op.execute('DROP TYPE IF EXISTS subscriptionstatus')
    op.execute('DROP TYPE IF EXISTS subscriptiontiertype')
