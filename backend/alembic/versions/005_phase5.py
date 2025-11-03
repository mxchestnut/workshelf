"""phase5_studio_customization

Revision ID: 005_phase5
Revises: 004_phase4
Create Date: 2025-11-03

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005_phase5'
down_revision = '004_phase4'
branch_labels = None
depends_on = None


def upgrade():
    # Create studio_themes table
    op.create_table('studio_themes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('studio_id', sa.Integer(), nullable=False),
        sa.Column('primary_color', sa.String(length=7), nullable=True, server_default='#3B82F6'),
        sa.Column('secondary_color', sa.String(length=7), nullable=True, server_default='#8B5CF6'),
        sa.Column('accent_color', sa.String(length=7), nullable=True, server_default='#10B981'),
        sa.Column('background_color', sa.String(length=7), nullable=True, server_default='#FFFFFF'),
        sa.Column('text_color', sa.String(length=7), nullable=True, server_default='#1F2937'),
        sa.Column('heading_font', sa.String(length=100), nullable=True, server_default='Inter'),
        sa.Column('body_font', sa.String(length=100), nullable=True, server_default='Inter'),
        sa.Column('code_font', sa.String(length=100), nullable=True, server_default='JetBrains Mono'),
        sa.Column('custom_css', sa.Text(), nullable=True),
        sa.Column('layout_config', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['studio_id'], ['studios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('studio_id')
    )
    op.create_index(op.f('ix_studio_themes_id'), 'studio_themes', ['id'])
    op.create_index(op.f('ix_studio_themes_studio_id'), 'studio_themes', ['studio_id'])

    # Create studio_custom_domains table
    op.create_table('studio_custom_domains',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('studio_id', sa.Integer(), nullable=False),
        sa.Column('domain', sa.String(length=255), nullable=False),
        sa.Column('subdomain', sa.String(length=100), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('verification_token', sa.String(length=100), nullable=True),
        sa.Column('verification_method', sa.String(length=20), nullable=True, server_default='TXT'),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ssl_enabled', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('ssl_certificate', sa.Text(), nullable=True),
        sa.Column('ssl_issued_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ssl_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('auto_renew_ssl', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('dns_records', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('status', sa.String(length=20), nullable=True, server_default='pending'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['studio_id'], ['studios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('domain')
    )
    op.create_index(op.f('ix_studio_custom_domains_domain'), 'studio_custom_domains', ['domain'])
    op.create_index(op.f('ix_studio_custom_domains_id'), 'studio_custom_domains', ['id'])
    op.create_index(op.f('ix_studio_custom_domains_studio_id'), 'studio_custom_domains', ['studio_id'])

    # Create document_views table
    op.create_table('document_views',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('view_duration', sa.Integer(), nullable=True),
        sa.Column('scroll_depth', sa.Integer(), nullable=True),
        sa.Column('referrer', sa.String(length=500), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('country_code', sa.String(length=2), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('is_unique', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('session_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_document_views', 'document_views', ['document_id', 'created_at'])
    op.create_index('idx_user_views', 'document_views', ['user_id', 'created_at'])
    op.create_index('idx_session_views', 'document_views', ['session_id', 'created_at'])
    op.create_index(op.f('ix_document_views_document_id'), 'document_views', ['document_id'])
    op.create_index(op.f('ix_document_views_id'), 'document_views', ['id'])
    op.create_index(op.f('ix_document_views_session_id'), 'document_views', ['session_id'])
    op.create_index(op.f('ix_document_views_user_id'), 'document_views', ['user_id'])

    # Create studio_analytics table
    op.create_table('studio_analytics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('studio_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('period_type', sa.String(length=20), nullable=True, server_default='daily'),
        sa.Column('total_views', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('unique_views', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('avg_view_duration', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('total_users', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('new_users', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('returning_users', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('total_documents', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('published_documents', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('total_words', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('total_comments', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('total_reactions', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('total_shares', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('total_bookmarks', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('top_countries', sa.JSON(), nullable=True),
        sa.Column('top_referrers', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['studio_id'], ['studios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_studio_analytics_date', 'studio_analytics', ['studio_id', 'date', 'period_type'])
    op.create_index(op.f('ix_studio_analytics_date'), 'studio_analytics', ['date'])
    op.create_index(op.f('ix_studio_analytics_id'), 'studio_analytics', ['id'])
    op.create_index(op.f('ix_studio_analytics_studio_id'), 'studio_analytics', ['studio_id'])


def downgrade():
    op.drop_table('studio_analytics')
    op.drop_table('document_views')
    op.drop_table('studio_custom_domains')
    op.drop_table('studio_themes')
