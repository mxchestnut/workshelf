"""Add beta reader appointments and releases

Revision ID: 004_beta_appointments
Revises: 003_user_scores_badges
Create Date: 2025-11-09

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '004_beta_appointments'
down_revision = '003_user_scores_badges'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create beta_reader_appointments table
    op.create_table('beta_reader_appointments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('writer_id', sa.Integer(), nullable=False),
        sa.Column('beta_reader_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='active'),
        sa.Column('appointment_title', sa.String(length=255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('releases_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('completed_reads', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['writer_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['beta_reader_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('idx_writer_beta_reader', 'beta_reader_appointments', ['writer_id', 'beta_reader_id'], unique=True)
    op.create_index('idx_beta_reader_active', 'beta_reader_appointments', ['beta_reader_id', 'status'])
    
    # Create beta_releases table
    op.create_table('beta_releases',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('appointment_id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('release_message', sa.Text(), nullable=True),
        sa.Column('release_date', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('deadline', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='unread'),
        sa.Column('started_reading_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_reading_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('feedback_submitted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('feedback_submitted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['appointment_id'], ['beta_reader_appointments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
    )
    op.create_index('idx_beta_reader_feed', 'beta_releases', ['appointment_id', 'release_date'])
    op.create_index('idx_document_releases', 'beta_releases', ['document_id', 'release_date'])


def downgrade() -> None:
    op.drop_table('beta_releases')
    op.drop_table('beta_reader_appointments')
