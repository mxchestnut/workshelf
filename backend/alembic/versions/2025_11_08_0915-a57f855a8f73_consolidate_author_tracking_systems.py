"""consolidate_author_tracking_systems

Revision ID: a57f855a8f73
Revises: 7555b5a5c245
Create Date: 2025-11-08 09:15:41.698867

Consolidates the old AuthorFollow system with the new Author + UserFollowsAuthor system.

Migration Strategy:
1. Add new columns to user_follows_authors (is_favorite, status, notes, discovery_source)
2. Create Author records from unique AuthorFollow.author_name entries
3. Migrate data from author_follows to user_follows_authors
4. Update bookshelf items to reference Author table (add author_id column)
5. Drop author_follows table (old system)

This preserves:
- User's favorite author flags (for recommendations)
- Reading status tracking (reading, read, want-to-read, favorites)
- Private notes about authors
- Discovery sources
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY


# revision identifiers, used by Alembic.
revision = 'a57f855a8f73'
down_revision = '7555b5a5c245'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if columns already exist before adding
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Step 1: Add new columns to user_follows_authors if they don't exist
    existing_columns = {col['name'] for col in inspector.get_columns('user_follows_authors')}
    
    if 'is_favorite' not in existing_columns:
        op.add_column('user_follows_authors', 
            sa.Column('is_favorite', sa.Boolean(), nullable=False, server_default='false'))
        op.create_index('idx_user_follows_authors_favorite', 'user_follows_authors', ['is_favorite'])
    
    if 'status' not in existing_columns:
        op.add_column('user_follows_authors', 
            sa.Column('status', sa.String(20), nullable=False, server_default='want-to-read'))
        op.create_index('idx_user_follows_authors_status', 'user_follows_authors', ['status'])
    
    if 'notes' not in existing_columns:
        op.add_column('user_follows_authors', 
            sa.Column('notes', sa.Text(), nullable=True))
    
    if 'discovery_source' not in existing_columns:
        op.add_column('user_follows_authors', 
            sa.Column('discovery_source', sa.String(100), nullable=True))
    
    # Step 2: Add author_id to bookshelf_items if it doesn't exist
    bookshelf_columns = {col['name'] for col in inspector.get_columns('bookshelf_items')}
    
    if 'author_id' not in bookshelf_columns:
        op.add_column('bookshelf_items', 
            sa.Column('author_id', sa.Integer(), nullable=True))
        op.create_foreign_key(
            'fk_bookshelf_items_author_id', 'bookshelf_items', 'authors',
            ['author_id'], ['id'], ondelete='SET NULL'
        )
        op.create_index('idx_bookshelf_items_author_id', 'bookshelf_items', ['author_id'])
    
    # Step 3: Check if author_follows table exists before migration
    tables = inspector.get_table_names()
    
    if 'author_follows' in tables:
        # Create Author records from unique author_name entries in author_follows
        op.execute("""
            INSERT INTO authors (name, bio, photo_url, website, genres, created_at, updated_at)
            SELECT DISTINCT ON (author_name)
                author_name,
                author_bio,
                author_photo_url,
                author_website,
                genres,
                NOW(),
                NOW()
            FROM author_follows
            WHERE author_name IS NOT NULL
            ON CONFLICT (name) DO NOTHING
        """)
        
        # Migrate data from author_follows to user_follows_authors
        op.execute("""
            INSERT INTO user_follows_authors 
                (user_id, author_id, notify_new_releases, is_favorite, status, notes, discovery_source, created_at)
            SELECT 
                af.user_id,
                a.id,
                true,
                af.is_favorite,
                af.status,
                af.notes,
                af.discovery_source,
                af.added_at
            FROM author_follows af
            INNER JOIN authors a ON a.name = af.author_name
            ON CONFLICT (user_id, author_id) DO UPDATE SET
                is_favorite = EXCLUDED.is_favorite,
                status = EXCLUDED.status,
                notes = EXCLUDED.notes,
                discovery_source = EXCLUDED.discovery_source
        """)
        
        # Link bookshelf items to Author table
        op.execute("""
            UPDATE bookshelf_items bi
            SET author_id = a.id
            FROM authors a
            WHERE bi.author = a.name
            AND bi.item_type = 'book'
        """)
        
        # Step 4: Drop the old author_follows table
        op.drop_table('author_follows')


def downgrade() -> None:
    # Recreate author_follows table
    op.create_table(
        'author_follows',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('author_name', sa.String(500), nullable=False),
        sa.Column('author_bio', sa.Text(), nullable=True),
        sa.Column('author_photo_url', sa.String(1000), nullable=True),
        sa.Column('author_website', sa.String(500), nullable=True),
        sa.Column('genres', ARRAY(sa.String()), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='want-to-read'),
        sa.Column('is_favorite', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('discovery_source', sa.String(100), nullable=True),
        sa.Column('added_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )
    
    # Recreate indexes
    op.create_index('idx_author_follows_user_id', 'author_follows', ['user_id'])
    op.create_index('idx_author_follows_author_name', 'author_follows', ['author_name'])
    op.create_index('idx_author_follows_status', 'author_follows', ['status'])
    op.create_index('idx_author_follows_is_favorite', 'author_follows', ['is_favorite'])
    op.create_index('idx_author_follows_user_author', 'author_follows', ['user_id', 'author_name'], unique=True)
    
    # Migrate data back from user_follows_authors to author_follows
    op.execute("""
        INSERT INTO author_follows 
            (user_id, author_name, author_bio, author_photo_url, author_website, genres, 
             status, is_favorite, notes, discovery_source, added_at)
        SELECT 
            ufa.user_id,
            a.name,
            a.bio,
            a.photo_url,
            a.website,
            a.genres,
            ufa.status,
            ufa.is_favorite,
            ufa.notes,
            ufa.discovery_source,
            ufa.created_at
        FROM user_follows_authors ufa
        INNER JOIN authors a ON a.id = ufa.author_id
        WHERE ufa.is_favorite = true OR ufa.status != 'want-to-read'
    """)
    
    # Remove added columns from user_follows_authors
    op.drop_index('idx_user_follows_authors_favorite', 'user_follows_authors')
    op.drop_index('idx_user_follows_authors_status', 'user_follows_authors')
    op.drop_column('user_follows_authors', 'discovery_source')
    op.drop_column('user_follows_authors', 'notes')
    op.drop_column('user_follows_authors', 'status')
    op.drop_column('user_follows_authors', 'is_favorite')
    
    # Remove author_id from bookshelf_items
    op.drop_index('idx_bookshelf_items_author_id', 'bookshelf_items')
    op.drop_constraint('fk_bookshelf_items_author_id', 'bookshelf_items', type_='foreignkey')
    op.drop_column('bookshelf_items', 'author_id')

