"""Add studio templates and search tracking

Revision ID: 011
Revises: 010
Create Date: 2025-11-04 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade():
    # Create project_templates table
    op.create_table(
        'project_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(100), nullable=True),  # 'creative', 'business', 'academic', 'technical', 'gaming'
        sa.Column('icon', sa.String(50), nullable=True),  # emoji or icon identifier
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('sort_order', sa.Integer(), default=0, nullable=False),  # for display ordering
        sa.Column('usage_count', sa.Integer(), default=0, nullable=False),  # how many times used
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug')
    )
    op.create_index('ix_project_templates_category', 'project_templates', ['category'])
    op.create_index('ix_project_templates_is_active', 'project_templates', ['is_active'])
    op.create_index('ix_project_templates_usage_count', 'project_templates', ['usage_count'])
    
    # Create template_sections table (pre-defined sections for each template)
    op.create_table(
        'template_sections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.Column('parent_section_id', sa.Integer(), nullable=True),  # for nested sections
        sa.Column('ai_prompts', postgresql.JSONB(astext_type=sa.Text()), nullable=True),  # array of prompt objects
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['template_id'], ['project_templates.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parent_section_id'], ['template_sections.id'], ondelete='CASCADE')
    )
    op.create_index('ix_template_sections_template_id', 'template_sections', ['template_id'])
    op.create_index('ix_template_sections_order_index', 'template_sections', ['order_index'])
    
    # Create template_searches table (track what users search for)
    op.create_table(
        'template_searches',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('search_query', sa.String(255), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),  # optional - track who searched
        sa.Column('found_results', sa.Boolean(), default=False, nullable=False),
        sa.Column('selected_template_id', sa.Integer(), nullable=True),  # if they selected a template
        sa.Column('created_blank', sa.Boolean(), default=False, nullable=False),  # if they chose "start from scratch"
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['selected_template_id'], ['project_templates.id'], ondelete='SET NULL')
    )
    op.create_index('ix_template_searches_search_query', 'template_searches', ['search_query'])
    op.create_index('ix_template_searches_created_at', 'template_searches', ['created_at'])
    
    # Add template_id to studios table (optional - tracks which template was used)
    op.add_column('studios', sa.Column('template_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_studios_template_id', 'studios', 'project_templates', ['template_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_studios_template_id', 'studios', ['template_id'])


def downgrade():
    # Drop indices and foreign key from studios
    op.drop_index('ix_studios_template_id', table_name='studios')
    op.drop_constraint('fk_studios_template_id', 'studios', type_='foreignkey')
    op.drop_column('studios', 'template_id')
    
    # Drop template_searches table
    op.drop_index('ix_template_searches_created_at', table_name='template_searches')
    op.drop_index('ix_template_searches_search_query', table_name='template_searches')
    op.drop_table('template_searches')
    
    # Drop template_sections table
    op.drop_index('ix_template_sections_order_index', table_name='template_sections')
    op.drop_index('ix_template_sections_template_id', table_name='template_sections')
    op.drop_table('template_sections')
    
    # Drop project_templates table
    op.drop_index('ix_project_templates_usage_count', table_name='project_templates')
    op.drop_index('ix_project_templates_is_active', table_name='project_templates')
    op.drop_index('ix_project_templates_category', table_name='project_templates')
    op.drop_table('project_templates')
