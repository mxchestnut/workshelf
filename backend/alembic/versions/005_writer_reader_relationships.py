"""
Create writer_reader_relationships table

Revision ID: 005_writer_reader_relationships
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '005_writer_reader_relationships'
down_revision = 'add_folder_id_documents'
branch_labels = None
depends_on = None


def upgrade():
    # Create enum type for reader roles
    reader_role_enum = postgresql.ENUM('alpha', 'beta', name='readerrole', create_type=True)
    reader_role_enum.create(op.get_bind(), checkfirst=True)
    
    # Create writer_reader_relationships table
    op.create_table(
        'writer_reader_relationships',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('writer_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('reader_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', reader_role_enum, nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('custom_label', sa.String(100), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('documents_shared', sa.Integer(), nullable=False, default=0),
        sa.Column('feedback_provided', sa.Integer(), nullable=False, default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )
    
    # Create indexes
    op.create_index('idx_writer_reader_role', 'writer_reader_relationships', ['writer_id', 'reader_id', 'role'], unique=True)
    op.create_index('idx_reader_role_active', 'writer_reader_relationships', ['reader_id', 'role', 'is_active'])
    op.create_index('idx_writer_id', 'writer_reader_relationships', ['writer_id'])
    op.create_index('idx_reader_id', 'writer_reader_relationships', ['reader_id'])


def downgrade():
    # Drop table
    op.drop_table('writer_reader_relationships')
    
    # Drop enum type
    reader_role_enum = postgresql.ENUM('alpha', 'beta', name='readerrole')
    reader_role_enum.drop(op.get_bind(), checkfirst=True)
