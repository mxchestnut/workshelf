"""Phase 7: Add integrity_checks and export_jobs tables

Revision ID: 007_phase7
Revises: 006_add_store_item_to_bookshelf
Create Date: 2025-12-17 16:20:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

# revision identifiers
revision = '007_phase7'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade():
    # Create enums for integrity checks (only if they don't exist)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE integritychecktype AS ENUM ('plagiarism', 'ai_detection', 'combined');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE integritycheckstatus AS ENUM ('pending', 'processing', 'completed', 'failed');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Create enums for export jobs (only if they don't exist)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE exporttype AS ENUM ('document', 'studio', 'gdpr_data', 'backup');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE exportformat AS ENUM ('pdf', 'docx', 'markdown', 'html', 'epub', 'txt', 'json');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE exportstatus AS ENUM ('pending', 'processing', 'completed', 'failed', 'expired');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Create integrity_checks table
    op.create_table(
        'integrity_checks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('check_type', sa.Enum('plagiarism', 'ai_detection', 'combined', name='integritychecktype'), nullable=False),
        sa.Column('status', sa.Enum('pending', 'processing', 'completed', 'failed', name='integritycheckstatus'), nullable=False),
        sa.Column('content_snapshot', sa.Text(), nullable=False),
        sa.Column('word_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('plagiarism_score', sa.Integer(), nullable=True),
        sa.Column('plagiarism_matches', JSON, nullable=True),
        sa.Column('total_matches', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('ai_score', sa.Integer(), nullable=True),
        sa.Column('ai_confidence', sa.Integer(), nullable=True),
        sa.Column('ai_details', JSON, nullable=True),
        sa.Column('external_check_id', sa.String(255), nullable=True),
        sa.Column('external_service', sa.String(100), nullable=True),
        sa.Column('processing_started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('processing_completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('cost_cents', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for integrity_checks
    op.create_index('ix_integrity_checks_document_id', 'integrity_checks', ['document_id'])
    op.create_index('ix_integrity_checks_user_id', 'integrity_checks', ['user_id'])
    op.create_index('ix_integrity_checks_check_type', 'integrity_checks', ['check_type'])
    op.create_index('ix_integrity_checks_status', 'integrity_checks', ['status'])
    op.create_index('ix_integrity_checks_external_check_id', 'integrity_checks', ['external_check_id'])
    op.create_index('idx_document_checks', 'integrity_checks', ['document_id', 'created_at'])
    op.create_index('idx_user_checks', 'integrity_checks', ['user_id', 'created_at'])
    
    # Create export_jobs table
    op.create_table(
        'export_jobs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('export_type', sa.Enum('document', 'studio', 'gdpr_data', 'backup', name='exporttype'), nullable=False),
        sa.Column('export_format', sa.Enum('pdf', 'docx', 'markdown', 'html', 'epub', 'txt', 'json', name='exportformat'), nullable=False),
        sa.Column('status', sa.Enum('pending', 'processing', 'completed', 'failed', 'expired', name='exportstatus'), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=True),
        sa.Column('studio_id', sa.Integer(), nullable=True),
        sa.Column('include_metadata', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('include_comments', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('include_version_history', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('file_url', sa.String(1024), nullable=True),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('file_name', sa.String(255), nullable=True),
        sa.Column('processing_started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('processing_completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['studio_id'], ['studios.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for export_jobs
    op.create_index('ix_export_jobs_user_id', 'export_jobs', ['user_id'])
    op.create_index('ix_export_jobs_export_type', 'export_jobs', ['export_type'])
    op.create_index('ix_export_jobs_export_format', 'export_jobs', ['export_format'])
    op.create_index('ix_export_jobs_status', 'export_jobs', ['status'])
    op.create_index('ix_export_jobs_document_id', 'export_jobs', ['document_id'])
    op.create_index('ix_export_jobs_studio_id', 'export_jobs', ['studio_id'])


def downgrade():
    # Drop tables
    op.drop_table('export_jobs')
    op.drop_table('integrity_checks')
    
    # Drop enums
    op.execute('DROP TYPE exportstatus')
    op.execute('DROP TYPE exportformat')
    op.execute('DROP TYPE exporttype')
    op.execute('DROP TYPE integritycheckstatus')
    op.execute('DROP TYPE integritychecktype')
