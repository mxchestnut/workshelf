"""Add beta reader profiles for marketplace

Revision ID: 005
Revises: 004
Create Date: 2025-11-09

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade():
    # Create beta_reader_profiles table
    op.create_table(
        'beta_reader_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('availability', sa.String(20), nullable=False, server_default='available'),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('genres', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('specialties', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('hourly_rate', sa.Integer(), nullable=True),
        sa.Column('per_word_rate', sa.Integer(), nullable=True),
        sa.Column('per_manuscript_rate', sa.Integer(), nullable=True),
        sa.Column('turnaround_days', sa.Integer(), nullable=True),
        sa.Column('max_concurrent_projects', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('portfolio_links', sa.JSON(), nullable=True),
        sa.Column('preferred_contact', sa.String(50), nullable=False, server_default='platform'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_featured', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('total_projects_completed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('average_rating', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()'), onupdate=sa.text('NOW()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    
    # Create indexes for marketplace queries
    op.create_index('ix_beta_reader_profiles_user_id', 'beta_reader_profiles', ['user_id'], unique=True)
    op.create_index('ix_beta_reader_profiles_availability', 'beta_reader_profiles', ['availability'])
    op.create_index('ix_beta_reader_profiles_is_active', 'beta_reader_profiles', ['is_active'])
    op.create_index('ix_beta_reader_profiles_is_featured', 'beta_reader_profiles', ['is_featured'])
    op.create_index('ix_beta_reader_profiles_genres', 'beta_reader_profiles', ['genres'], postgresql_using='gin')
    
    # Composite index for marketplace browsing (active profiles sorted by rating)
    op.create_index(
        'ix_beta_reader_profiles_marketplace',
        'beta_reader_profiles',
        ['is_active', 'average_rating'],
        postgresql_where=sa.text('is_active = true')
    )


def downgrade():
    op.drop_index('ix_beta_reader_profiles_marketplace', table_name='beta_reader_profiles')
    op.drop_index('ix_beta_reader_profiles_genres', table_name='beta_reader_profiles')
    op.drop_index('ix_beta_reader_profiles_is_featured', table_name='beta_reader_profiles')
    op.drop_index('ix_beta_reader_profiles_is_active', table_name='beta_reader_profiles')
    op.drop_index('ix_beta_reader_profiles_availability', table_name='beta_reader_profiles')
    op.drop_index('ix_beta_reader_profiles_user_id', table_name='beta_reader_profiles')
    op.drop_table('beta_reader_profiles')
