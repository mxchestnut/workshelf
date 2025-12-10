"""Add soft delete to projects

Revision ID: add_soft_delete_projects
Revises: consolidated_dec_2025
Create Date: 2025-12-10 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_soft_delete_projects'
down_revision = 'consolidated_dec_2025'
branch_labels = None
depends_on = None


def upgrade():
    # Add soft delete columns to projects table
    op.execute("""
        ALTER TABLE projects 
        ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL;
    """)
    
    op.execute("""
        ALTER TABLE projects 
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
    """)
    
    # Create index for is_deleted column
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_projects_is_deleted 
        ON projects(is_deleted);
    """)


def downgrade():
    # Remove index
    op.execute("DROP INDEX IF EXISTS ix_projects_is_deleted;")
    
    # Remove columns
    op.execute("ALTER TABLE projects DROP COLUMN IF EXISTS deleted_at;")
    op.execute("ALTER TABLE projects DROP COLUMN IF EXISTS is_deleted;")
