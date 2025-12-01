"""add phase 5 studio customization tables

Revision ID: 005_phase5_tables
Revises: 004_add_feedback_document_to_beta_requests
Create Date: 2025-12-01 09:00:00.000000

Creates the Phase 5 Studio Customization tables:
- studio_themes: Custom visual branding (colors, fonts, CSS)
- studio_custom_domains: Custom domain management and verification
- document_views: View tracking for analytics
- studio_analytics: Aggregated analytics metrics
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '005_phase5_tables'
down_revision: Union[str, None] = 'merge_all_heads_final'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create Phase 5 studio customization tables."""
    
    # ============================================================================
    # studio_themes - Custom visual branding for studios
    # ============================================================================
    op.create_table(
        'studio_themes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('studio_id', sa.Integer(), nullable=False),
        
        # Colors
        sa.Column('primary_color', sa.String(length=7), nullable=True, server_default='#3B82F6'),
        sa.Column('secondary_color', sa.String(length=7), nullable=True, server_default='#8B5CF6'),
        sa.Column('accent_color', sa.String(length=7), nullable=True, server_default='#10B981'),
        sa.Column('background_color', sa.String(length=7), nullable=True, server_default='#FFFFFF'),
        sa.Column('text_color', sa.String(length=7), nullable=True, server_default='#1F2937'),
        
        # Typography
        sa.Column('heading_font', sa.String(length=100), nullable=True, server_default='Inter'),
        sa.Column('body_font', sa.String(length=100), nullable=True, server_default='Inter'),
        sa.Column('code_font', sa.String(length=100), nullable=True, server_default='JetBrains Mono'),
        
        # Custom CSS
        sa.Column('custom_css', sa.Text(), nullable=True),
        
        # Layout preferences (JSON)
        sa.Column('layout_config', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        
        # Active state
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        
        # Constraints
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['studio_id'], ['studios.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('studio_id')
    )
    
    # Indexes
    op.create_index('ix_studio_themes_id', 'studio_themes', ['id'])
    op.create_index('ix_studio_themes_studio_id', 'studio_themes', ['studio_id'])
    
    # ============================================================================
    # studio_custom_domains - Custom domain management
    # ============================================================================
    op.create_table(
        'studio_custom_domains',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('studio_id', sa.Integer(), nullable=False),
        
        # Domain info
        sa.Column('domain', sa.String(length=255), nullable=False),
        sa.Column('subdomain', sa.String(length=100), nullable=True),
        
        # Verification
        sa.Column('is_verified', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('verification_token', sa.String(length=100), nullable=True),
        sa.Column('verification_method', sa.String(length=20), nullable=True, server_default='TXT'),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        
        # SSL/TLS
        sa.Column('ssl_enabled', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('ssl_certificate', sa.Text(), nullable=True),
        sa.Column('ssl_issued_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ssl_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('auto_renew_ssl', sa.Boolean(), nullable=True, server_default='true'),
        
        # DNS settings (JSON)
        sa.Column('dns_records', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        
        # Status
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('status', sa.String(length=20), nullable=True, server_default='pending'),
        sa.Column('error_message', sa.Text(), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        
        # Constraints
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['studio_id'], ['studios.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('domain')
    )
    
    # Indexes
    op.create_index('ix_studio_custom_domains_id', 'studio_custom_domains', ['id'])
    op.create_index('ix_studio_custom_domains_studio_id', 'studio_custom_domains', ['studio_id'])
    op.create_index('ix_studio_custom_domains_domain', 'studio_custom_domains', ['domain'])
    
    # ============================================================================
    # document_views - View tracking for analytics
    # ============================================================================
    op.create_table(
        'document_views',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),  # Nullable for anonymous views
        
        # View metadata
        sa.Column('view_duration', sa.Integer(), nullable=True),  # Duration in seconds
        sa.Column('scroll_depth', sa.Integer(), nullable=True),  # Percentage 0-100
        sa.Column('referrer', sa.String(length=500), nullable=True),
        
        # Device/browser info
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),  # IPv4 or IPv6
        sa.Column('country_code', sa.String(length=2), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        
        # Engagement metrics
        sa.Column('is_unique', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('session_id', sa.String(length=100), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        
        # Constraints
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL')
    )
    
    # Indexes
    op.create_index('ix_document_views_id', 'document_views', ['id'])
    op.create_index('ix_document_views_document_id', 'document_views', ['document_id'])
    op.create_index('ix_document_views_user_id', 'document_views', ['user_id'])
    op.create_index('ix_document_views_session_id', 'document_views', ['session_id'])
    
    # ============================================================================
    # studio_analytics - Aggregated analytics metrics
    # ============================================================================
    op.create_table(
        'studio_analytics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('studio_id', sa.Integer(), nullable=False),
        
        # Time period
        sa.Column('date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('period_type', sa.String(length=20), nullable=True, server_default='daily'),
        
        # View metrics
        sa.Column('total_views', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('unique_views', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('avg_view_duration', sa.Integer(), nullable=True, server_default='0'),
        
        # User metrics
        sa.Column('total_users', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('new_users', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('returning_users', sa.Integer(), nullable=True, server_default='0'),
        
        # Content metrics
        sa.Column('total_documents', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('published_documents', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('total_words', sa.Integer(), nullable=True, server_default='0'),
        
        # Engagement metrics
        sa.Column('total_comments', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('total_reactions', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('total_shares', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('total_bookmarks', sa.Integer(), nullable=True, server_default='0'),
        
        # Geographic data (JSON)
        sa.Column('top_countries', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        
        # Referral data (JSON)
        sa.Column('top_referrers', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        
        # Constraints
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['studio_id'], ['studios.id'], ondelete='CASCADE')
    )
    
    # Indexes
    op.create_index('ix_studio_analytics_id', 'studio_analytics', ['id'])
    op.create_index('ix_studio_analytics_studio_id', 'studio_analytics', ['studio_id'])
    op.create_index('ix_studio_analytics_date', 'studio_analytics', ['date'])


def downgrade() -> None:
    """Drop Phase 5 studio customization tables."""
    
    # Drop tables in reverse order (to handle dependencies)
    op.drop_table('studio_analytics')
    op.drop_table('document_views')
    op.drop_table('studio_custom_domains')
    op.drop_table('studio_themes')
