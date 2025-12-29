"""Remove Matrix integration columns

Revision ID: remove_matrix_columns
Revises: add_folder_id_documents
Create Date: 2025-12-29

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'remove_matrix_columns'
down_revision = 'add_folder_id_documents'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Remove Matrix columns from users table
    op.drop_column('users', 'matrix_user_id')
    op.drop_column('users', 'matrix_password')
    
    # Remove Matrix column from groups table
    op.drop_column('groups', 'matrix_space_id')


def downgrade() -> None:
    # Restore Matrix columns if needed
    op.add_column('users', sa.Column('matrix_user_id', sa.String(), nullable=True))
    op.add_column('users', sa.Column('matrix_password', sa.String(), nullable=True))
    op.add_column('groups', sa.Column('matrix_space_id', sa.String(), nullable=True))
