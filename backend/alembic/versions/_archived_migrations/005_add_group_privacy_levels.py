"""Add group privacy levels

Revision ID: 005_add_group_privacy_levels
Revises: 4c3672f2d9e6
Create Date: 2025-12-07 10:30:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005_add_group_privacy_levels'
down_revision = '4c3672f2d9e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum type for privacy levels
    privacy_level_enum = postgresql.ENUM(
        'public',    # Anyone can see (even not logged in)
        'guarded',   # Only logged-in users can see
        'private',   # Only members can see posts/members, but name is searchable
        'secret',    # Not searchable, only accessible by direct invitation
        name='privacylevel',
        create_type=True
    )
    privacy_level_enum.create(op.get_bind(), checkfirst=True)
    
    # Add privacy_level column with default based on is_public
    op.add_column('groups', 
        sa.Column('privacy_level', 
                  postgresql.ENUM('public', 'guarded', 'private', 'secret', 
                                name='privacylevel', create_type=False),
                  nullable=True)
    )
    
    # Migrate existing data: is_public=true -> public, is_public=false -> private
    op.execute("""
        UPDATE groups 
        SET privacy_level = CASE 
            WHEN is_public = true THEN 'public'::privacylevel
            ELSE 'private'::privacylevel
        END
    """)
    
    # Make privacy_level NOT NULL after migration
    op.alter_column('groups', 'privacy_level', nullable=False)
    
    # Keep is_public for backward compatibility (will be computed property)
    # Don't drop it yet to avoid breaking existing code


def downgrade() -> None:
    # Remove privacy_level column
    op.drop_column('groups', 'privacy_level')
    
    # Drop enum type
    op.execute('DROP TYPE IF EXISTS privacylevel')
