"""Add roleplay studio models

Revision ID: add_roleplay_models
Revises: add_folder_id_documents
Create Date: 2025-12-13 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, ARRAY

# revision identifiers, used by Alembic.
revision = 'add_roleplay_models'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade():
    # Create enum types
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE roleplaygenre AS ENUM (
                'fantasy', 'sci-fi', 'modern', 'historical', 'horror', 
                'romance', 'mystery', 'post-apocalyptic', 'cyberpunk', 
                'supernatural', 'other'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE roleplayrating AS ENUM (
                'G', 'PG', 'PG-13', 'R', 'mature'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE postingorder AS ENUM (
                'free-form', 'turn-based', 'round-robin'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE dicesystem AS ENUM (
                'd20', 'd6-pool', 'fate', 'percentile', 'custom', 'none'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Create roleplay_projects table
    op.create_table(
        'roleplay_projects',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('genre', sa.Enum(
            'fantasy', 'sci-fi', 'modern', 'historical', 'horror', 
            'romance', 'mystery', 'post-apocalyptic', 'cyberpunk', 
            'supernatural', 'other',
            name='roleplaygenre'
        ), nullable=False, server_default='fantasy'),
        sa.Column('rating', sa.Enum(
            'G', 'PG', 'PG-13', 'R', 'mature',
            name='roleplayrating'
        ), nullable=False, server_default='PG-13'),
        sa.Column('posting_order', sa.Enum(
            'free-form', 'turn-based', 'round-robin',
            name='postingorder'
        ), nullable=False, server_default='free-form'),
        sa.Column('min_post_length', sa.Integer(), nullable=True),
        sa.Column('dice_system', sa.Enum(
            'd20', 'd6-pool', 'fate', 'percentile', 'custom', 'none',
            name='dicesystem'
        ), nullable=False, server_default='none'),
        sa.Column('dice_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('has_lore_wiki', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('has_character_sheets', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('has_maps', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('folder_ic_posts', sa.Integer(), nullable=True),
        sa.Column('folder_ooc', sa.Integer(), nullable=True),
        sa.Column('folder_characters', sa.Integer(), nullable=True),
        sa.Column('folder_lore', sa.Integer(), nullable=True),
        sa.Column('folder_maps', sa.Integer(), nullable=True),
        sa.Column('folder_compiled', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['folder_ic_posts'], ['folders.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['folder_ooc'], ['folders.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['folder_characters'], ['folders.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['folder_lore'], ['folders.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['folder_maps'], ['folders.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['folder_compiled'], ['folders.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('project_id')
    )
    op.create_index('ix_roleplay_projects_id', 'roleplay_projects', ['id'])
    op.create_index('ix_roleplay_projects_project_id', 'roleplay_projects', ['project_id'])
    
    # Create roleplay_scenes table
    op.create_table(
        'roleplay_scenes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('roleplay_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('sequence_number', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_archived', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['roleplay_id'], ['roleplay_projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_roleplay_scenes_id', 'roleplay_scenes', ['id'])
    op.create_index('ix_roleplay_scenes_roleplay_id', 'roleplay_scenes', ['roleplay_id'])
    op.create_index('idx_roleplay_scenes_sequence', 'roleplay_scenes', ['roleplay_id', 'sequence_number'])
    
    # Create roleplay_characters table
    op.create_table(
        'roleplay_characters',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('roleplay_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('pronouns', sa.String(50), nullable=True),
        sa.Column('species', sa.String(100), nullable=True),
        sa.Column('age', sa.String(50), nullable=True),
        sa.Column('avatar_url', sa.String(500), nullable=True),
        sa.Column('short_description', sa.Text(), nullable=True),
        sa.Column('full_bio', sa.Text(), nullable=True),
        sa.Column('stats', JSONB, nullable=True),
        sa.Column('traits', ARRAY(sa.String()), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_npc', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['roleplay_id'], ['roleplay_projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_roleplay_characters_id', 'roleplay_characters', ['id'])
    op.create_index('ix_roleplay_characters_roleplay_id', 'roleplay_characters', ['roleplay_id'])
    op.create_index('ix_roleplay_characters_user_id', 'roleplay_characters', ['user_id'])
    op.create_index('idx_roleplay_characters_active', 'roleplay_characters', ['roleplay_id', 'is_active'])
    op.create_index('idx_roleplay_characters_user', 'roleplay_characters', ['roleplay_id', 'user_id'])
    
    # Create roleplay_passages table
    op.create_table(
        'roleplay_passages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('roleplay_id', sa.Integer(), nullable=False),
        sa.Column('scene_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('character_id', sa.Integer(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('word_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('sequence_number', sa.Integer(), nullable=False),
        sa.Column('parent_passage_id', sa.Integer(), nullable=True),
        sa.Column('dice_rolls', JSONB, nullable=True),
        sa.Column('is_edited', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('reaction_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['roleplay_id'], ['roleplay_projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['scene_id'], ['roleplay_scenes.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['character_id'], ['roleplay_characters.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['parent_passage_id'], ['roleplay_passages.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_roleplay_passages_id', 'roleplay_passages', ['id'])
    op.create_index('ix_roleplay_passages_roleplay_id', 'roleplay_passages', ['roleplay_id'])
    op.create_index('ix_roleplay_passages_scene_id', 'roleplay_passages', ['scene_id'])
    op.create_index('ix_roleplay_passages_user_id', 'roleplay_passages', ['user_id'])
    op.create_index('idx_roleplay_passages_sequence', 'roleplay_passages', ['roleplay_id', 'sequence_number'])
    op.create_index('idx_roleplay_passages_scene', 'roleplay_passages', ['scene_id', 'sequence_number'])
    op.create_index('idx_roleplay_passages_user', 'roleplay_passages', ['user_id', 'created_at'])
    
    # Create lore_entries table
    op.create_table(
        'lore_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('roleplay_id', sa.Integer(), nullable=False),
        sa.Column('author_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('tags', ARRAY(sa.String()), nullable=True),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['roleplay_id'], ['roleplay_projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_lore_entries_id', 'lore_entries', ['id'])
    op.create_index('ix_lore_entries_roleplay_id', 'lore_entries', ['roleplay_id'])
    op.create_index('ix_lore_entries_author_id', 'lore_entries', ['author_id'])
    op.create_index('idx_lore_entries_category', 'lore_entries', ['roleplay_id', 'category'])
    op.create_index('idx_lore_entries_author', 'lore_entries', ['author_id', 'created_at'])
    
    # Create passage_reactions table
    op.create_table(
        'passage_reactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('passage_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('reaction_type', sa.String(20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['passage_id'], ['roleplay_passages.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_passage_reactions_id', 'passage_reactions', ['id'])
    op.create_index('ix_passage_reactions_passage_id', 'passage_reactions', ['passage_id'])
    op.create_index('ix_passage_reactions_user_id', 'passage_reactions', ['user_id'])
    op.create_index('idx_passage_reactions_unique', 'passage_reactions', ['passage_id', 'user_id'], unique=True)
    op.create_index('idx_passage_reactions_type', 'passage_reactions', ['passage_id', 'reaction_type'])
    
    # Create dice_rolls table
    op.create_table(
        'dice_rolls',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('roleplay_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('character_id', sa.Integer(), nullable=True),
        sa.Column('roll_expression', sa.String(100), nullable=False),
        sa.Column('result', sa.Integer(), nullable=False),
        sa.Column('individual_rolls', ARRAY(sa.Integer()), nullable=True),
        sa.Column('reason', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['roleplay_id'], ['roleplay_projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['character_id'], ['roleplay_characters.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_dice_rolls_id', 'dice_rolls', ['id'])
    op.create_index('ix_dice_rolls_roleplay_id', 'dice_rolls', ['roleplay_id'])
    op.create_index('ix_dice_rolls_user_id', 'dice_rolls', ['user_id'])
    op.create_index('idx_dice_rolls_roleplay', 'dice_rolls', ['roleplay_id', 'created_at'])
    op.create_index('idx_dice_rolls_character', 'dice_rolls', ['character_id', 'created_at'])


def downgrade():
    # Drop tables in reverse order
    op.drop_table('dice_rolls')
    op.drop_table('passage_reactions')
    op.drop_table('lore_entries')
    op.drop_table('roleplay_passages')
    op.drop_table('roleplay_characters')
    op.drop_table('roleplay_scenes')
    op.drop_table('roleplay_projects')
    
    # Drop enum types
    op.execute("DROP TYPE IF EXISTS dicesystem")
    op.execute("DROP TYPE IF EXISTS postingorder")
    op.execute("DROP TYPE IF EXISTS roleplayrating")
    op.execute("DROP TYPE IF EXISTS roleplaygenre")
