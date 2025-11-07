"""Fix ISBN constraint to allow books without ISBN

Revision ID: 003_fix_isbn_constraint
Revises: 002_bookshelf
Create Date: 2025-11-07

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003_fix_isbn_constraint'
down_revision = '002_bookshelf'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Remove old constraint requiring ISBN for books
    Add new constraint that only requires title for books
    """
    # Drop the old constraint
    op.drop_constraint('check_bookshelf_item_valid', 'bookshelf_items', type_='check')
    
    # Add new constraint: ISBN is optional, only title required for books
    op.create_check_constraint(
        'check_bookshelf_item_valid',
        'bookshelf_items',
        "(item_type = 'document' AND document_id IS NOT NULL) OR "
        "(item_type = 'book' AND title IS NOT NULL)"
    )


def downgrade() -> None:
    """
    Revert to old constraint requiring ISBN
    """
    # Drop the new constraint
    op.drop_constraint('check_bookshelf_item_valid', 'bookshelf_items', type_='check')
    
    # Restore old constraint
    op.create_check_constraint(
        'check_bookshelf_item_valid',
        'bookshelf_items',
        "(item_type = 'document' AND document_id IS NOT NULL) OR "
        "(item_type = 'book' AND isbn IS NOT NULL AND title IS NOT NULL)"
    )
