"""Add book_suggestions table

Revision ID: 002_book_suggestions
Revises: 001_initial
Create Date: 2024-01-15

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_book_suggestions'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create book_suggestions table
    op.create_table(
        'book_suggestions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('query', sa.String(500), nullable=False),
        sa.Column('title', sa.String(500), nullable=True),
        sa.Column('author', sa.String(500), nullable=True),
        sa.Column('isbn', sa.String(20), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('PENDING', 'APPROVED', 'REJECTED', name='suggestionstatus'), nullable=False, server_default='PENDING'),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reviewed_by_admin_id', sa.Integer(), nullable=True),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewed_by_admin_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('ix_book_suggestions_user_id', 'book_suggestions', ['user_id'])
    op.create_index('ix_book_suggestions_status', 'book_suggestions', ['status'])


def downgrade() -> None:
    op.drop_index('ix_book_suggestions_status', 'book_suggestions')
    op.drop_index('ix_book_suggestions_user_id', 'book_suggestions')
    op.drop_table('book_suggestions')
    
    # Drop the enum type
    sa.Enum(name='suggestionstatus').drop(op.get_bind(), checkfirst=True)
