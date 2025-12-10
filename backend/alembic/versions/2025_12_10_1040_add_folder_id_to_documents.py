"""Add folder_id to documents

Revision ID: add_folder_id_documents
Revises: add_soft_delete_projects
Create Date: 2025-12-10 10:40:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_folder_id_documents'
down_revision = 'add_soft_delete_projects'
branch_labels = None
depends_on = None


def upgrade():
    # Add folder_id column to documents table
    op.execute("""
        ALTER TABLE documents 
        ADD COLUMN IF NOT EXISTS folder_id INTEGER;
    """)
    
    # Add foreign key constraint (check if it doesn't exist first)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'fk_documents_folder_id'
            ) THEN
                ALTER TABLE documents 
                ADD CONSTRAINT fk_documents_folder_id 
                FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL;
            END IF;
        END $$;
    """)
    
    # Create index for folder_id column
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_documents_folder_id 
        ON documents(folder_id);
    """)
    
    # Add studio_id column to documents table
    op.execute("""
        ALTER TABLE documents 
        ADD COLUMN IF NOT EXISTS studio_id INTEGER;
    """)
    
    # Add foreign key constraint for studio_id (check if it doesn't exist first)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'fk_documents_studio_id'
            ) THEN
                ALTER TABLE documents 
                ADD CONSTRAINT fk_documents_studio_id 
                FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE SET NULL;
            END IF;
        END $$;
    """)
    
    # Create index for studio_id column
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_documents_studio_id 
        ON documents(studio_id);
    """)


def downgrade():
    # Remove indexes
    op.execute("DROP INDEX IF EXISTS ix_documents_studio_id;")
    op.execute("DROP INDEX IF EXISTS ix_documents_folder_id;")
    
    # Remove foreign key constraints
    op.execute("ALTER TABLE documents DROP CONSTRAINT IF EXISTS fk_documents_studio_id;")
    op.execute("ALTER TABLE documents DROP CONSTRAINT IF EXISTS fk_documents_folder_id;")
    
    # Remove columns
    op.execute("ALTER TABLE documents DROP COLUMN IF EXISTS studio_id;")
    op.execute("ALTER TABLE documents DROP COLUMN IF EXISTS folder_id;")
