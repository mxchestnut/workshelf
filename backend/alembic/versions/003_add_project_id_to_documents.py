"""add project_id to documents

Revision ID: 003
Revises: 002
Create Date: 2025-11-10 19:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add project_id column to documents table"""
    # Check if column exists before adding (for idempotency)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'documents' 
                AND column_name = 'project_id'
            ) THEN
                ALTER TABLE documents 
                ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL;
                
                CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
            END IF;
        END $$;
    """)


def downgrade() -> None:
    """Remove project_id column from documents table"""
    op.drop_index('idx_documents_project_id', table_name='documents', if_exists=True)
    op.drop_column('documents', 'project_id')
