"""007_store_system

Create WorkShelf Store tables for purchasing and selling books

Revision ID: 007_store_system
Revises: 006_epub_submissions
Create Date: 2025-01-07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '007_store_system'
down_revision = '006_epub_submissions'
branch_labels = None
depends_on = None


def upgrade():
    # Create authors table
    op.create_table('authors',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=500), nullable=False),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('photo_url', sa.String(length=1000), nullable=True),
        sa.Column('website', sa.String(length=500), nullable=True),
        sa.Column('social_links', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('genres', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('books_published', sa.Integer(), default=0),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('is_verified', sa.Boolean(), default=False),
        sa.Column('is_bestseller', sa.Boolean(), default=False),
        sa.Column('follower_count', sa.Integer(), default=0),
        sa.Column('total_sales', sa.Integer(), default=0),
        sa.Column('total_views', sa.Integer(), default=0),
        sa.Column('stripe_account_id', sa.String(length=255), nullable=True),
        sa.Column('payout_enabled', sa.Boolean(), default=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        sa.UniqueConstraint('user_id'),
        sa.UniqueConstraint('stripe_account_id')
    )
    op.create_index('idx_authors_verified', 'authors', ['is_verified', 'name'])
    op.create_index(op.f('ix_authors_id'), 'authors', ['id'], unique=False)
    op.create_index(op.f('ix_authors_name'), 'authors', ['name'], unique=True)

    # Create store_items table
    op.create_table('store_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('author_name', sa.String(length=255), nullable=False),
        sa.Column('author_id', sa.Integer(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('long_description', sa.Text(), nullable=True),
        sa.Column('genres', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('isbn', sa.String(length=20), nullable=True),
        sa.Column('publisher', sa.String(length=255), nullable=True),
        sa.Column('publication_date', sa.DateTime(), nullable=True),
        sa.Column('language', sa.String(length=10), default='en'),
        sa.Column('page_count', sa.Integer(), nullable=True),
        sa.Column('price_usd', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), default='USD'),
        sa.Column('discount_percentage', sa.Integer(), default=0),
        sa.Column('epub_blob_url', sa.String(length=1000), nullable=False),
        sa.Column('cover_blob_url', sa.String(length=1000), nullable=True),
        sa.Column('sample_blob_url', sa.String(length=1000), nullable=True),
        sa.Column('file_hash', sa.String(length=64), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), default='draft'),
        sa.Column('seller_id', sa.Integer(), nullable=False),
        sa.Column('moderator_id', sa.Integer(), nullable=True),
        sa.Column('moderator_notes', sa.Text(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('total_sales', sa.Integer(), default=0),
        sa.Column('total_revenue', sa.Numeric(precision=10, scale=2), default=0.00),
        sa.Column('view_count', sa.Integer(), default=0),
        sa.Column('rating_average', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('rating_count', sa.Integer(), default=0),
        sa.Column('is_featured', sa.Boolean(), default=False),
        sa.Column('featured_at', sa.DateTime(), nullable=True),
        sa.Column('is_bestseller', sa.Boolean(), default=False),
        sa.Column('is_new_release', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['author_id'], ['authors.id'], ),
        sa.ForeignKeyConstraint(['moderator_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['seller_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('file_hash')
    )
    op.create_index('idx_store_items_status_price', 'store_items', ['status', 'price_usd'])
    op.create_index('idx_store_items_author', 'store_items', ['author_id', 'status'])
    op.create_index('idx_store_items_bestseller', 'store_items', ['is_bestseller', 'status'])
    op.create_index(op.f('ix_store_items_author_name'), 'store_items', ['author_name'], unique=False)
    op.create_index(op.f('ix_store_items_id'), 'store_items', ['id'], unique=False)
    op.create_index(op.f('ix_store_items_isbn'), 'store_items', ['isbn'], unique=False)
    op.create_index(op.f('ix_store_items_status'), 'store_items', ['status'], unique=False)
    op.create_index(op.f('ix_store_items_title'), 'store_items', ['title'], unique=False)

    # Create purchases table
    op.create_table('purchases',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('store_item_id', sa.Integer(), nullable=False),
        sa.Column('amount_paid', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), default='USD'),
        sa.Column('stripe_payment_intent_id', sa.String(length=255), nullable=False),
        sa.Column('stripe_charge_id', sa.String(length=255), nullable=True),
        sa.Column('payment_method', sa.String(length=50), nullable=True),
        sa.Column('status', sa.String(length=20), default='pending'),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('refunded_at', sa.DateTime(), nullable=True),
        sa.Column('refund_reason', sa.Text(), nullable=True),
        sa.Column('bookshelf_item_id', sa.Integer(), nullable=True),
        sa.Column('access_granted', sa.Boolean(), default=False),
        sa.Column('access_granted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['bookshelf_item_id'], ['bookshelf_items.id'], ),
        sa.ForeignKeyConstraint(['store_item_id'], ['store_items.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('stripe_payment_intent_id')
    )
    op.create_index('idx_purchases_user_completed', 'purchases', ['user_id', 'completed_at'])
    op.create_index('idx_purchases_store_item', 'purchases', ['store_item_id', 'status'])
    op.create_index(op.f('ix_purchases_created_at'), 'purchases', ['created_at'], unique=False)
    op.create_index(op.f('ix_purchases_id'), 'purchases', ['id'], unique=False)
    op.create_index(op.f('ix_purchases_status'), 'purchases', ['status'], unique=False)
    op.create_index(op.f('ix_purchases_store_item_id'), 'purchases', ['store_item_id'], unique=False)
    op.create_index(op.f('ix_purchases_stripe_payment_intent_id'), 'purchases', ['stripe_payment_intent_id'], unique=True)
    op.create_index(op.f('ix_purchases_user_id'), 'purchases', ['user_id'], unique=False)

    # Create author_earnings table
    op.create_table('author_earnings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('author_id', sa.Integer(), nullable=False),
        sa.Column('store_item_id', sa.Integer(), nullable=False),
        sa.Column('purchase_id', sa.Integer(), nullable=False),
        sa.Column('sale_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('platform_fee', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('author_earnings', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('payment_processing_fee', sa.Numeric(precision=10, scale=2), default=0.00),
        sa.Column('payout_status', sa.String(length=20), default='pending'),
        sa.Column('payout_date', sa.DateTime(), nullable=True),
        sa.Column('stripe_payout_id', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['author_id'], ['authors.id'], ),
        sa.ForeignKeyConstraint(['purchase_id'], ['purchases.id'], ),
        sa.ForeignKeyConstraint(['store_item_id'], ['store_items.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('purchase_id')
    )
    op.create_index('idx_author_earnings_status', 'author_earnings', ['author_id', 'payout_status'])
    op.create_index('idx_author_earnings_payout', 'author_earnings', ['payout_status', 'created_at'])
    op.create_index(op.f('ix_author_earnings_author_id'), 'author_earnings', ['author_id'], unique=False)
    op.create_index(op.f('ix_author_earnings_id'), 'author_earnings', ['id'], unique=False)
    op.create_index(op.f('ix_author_earnings_payout_status'), 'author_earnings', ['payout_status'], unique=False)


def downgrade():
    # Drop tables in reverse order
    op.drop_table('author_earnings')
    op.drop_table('purchases')
    op.drop_table('store_items')
    op.drop_table('authors')
