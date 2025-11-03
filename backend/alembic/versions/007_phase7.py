"""phase7_advanced_features

Revision ID: 007_phase7
Revises: 006_phase6
Create Date: 2025-11-03 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '007_phase7'
down_revision = '006_phase6'
branch_labels = None
depends_on = None


def upgrade():
    # Drop existing enum types if they exist (from failed migration attempts)
    op.execute("DROP TYPE IF EXISTS integritychecktype CASCADE")
    op.execute("DROP TYPE IF EXISTS integritycheckstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS exportformat CASCADE")
    op.execute("DROP TYPE IF EXISTS exportstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS exporttype CASCADE")
    
    # Create enum types
    op.execute("CREATE TYPE integritychecktype AS ENUM ('plagiarism', 'ai_detection', 'combined')")
    op.execute("CREATE TYPE integritycheckstatus AS ENUM ('pending', 'processing', 'completed', 'failed')")
    op.execute("CREATE TYPE exportformat AS ENUM ('pdf', 'docx', 'markdown', 'html', 'epub', 'txt', 'json')")
    op.execute("CREATE TYPE exportstatus AS ENUM ('pending', 'processing', 'completed', 'failed', 'expired')")
    op.execute("CREATE TYPE exporttype AS ENUM ('document', 'studio', 'gdpr_data', 'backup')")
    
    # Create integrity_checks table
    op.create_table('integrity_checks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('check_type', postgresql.ENUM('plagiarism', 'ai_detection', 'combined', name='integritychecktype', create_type=False), nullable=False),
        sa.Column('status', postgresql.ENUM('pending', 'processing', 'completed', 'failed', name='integritycheckstatus', create_type=False), nullable=False, server_default='pending'),
        sa.Column('content_snapshot', sa.Text(), nullable=False),
        sa.Column('word_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('plagiarism_score', sa.Integer(), nullable=True),
        sa.Column('plagiarism_matches', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('total_matches', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('ai_score', sa.Integer(), nullable=True),
        sa.Column('ai_confidence', sa.Integer(), nullable=True),
        sa.Column('ai_details', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('external_check_id', sa.String(length=255), nullable=True),
        sa.Column('external_service', sa.String(length=100), nullable=True),
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
    op.create_index('idx_check_status', 'integrity_checks', ['status', 'check_type'])
    op.create_index('idx_document_checks', 'integrity_checks', ['document_id', 'created_at'])
    op.create_index('idx_user_checks', 'integrity_checks', ['user_id', 'created_at'])
    op.create_index(op.f('ix_integrity_checks_check_type'), 'integrity_checks', ['check_type'])
    op.create_index(op.f('ix_integrity_checks_document_id'), 'integrity_checks', ['document_id'])
    op.create_index(op.f('ix_integrity_checks_external_check_id'), 'integrity_checks', ['external_check_id'])
    op.create_index(op.f('ix_integrity_checks_id'), 'integrity_checks', ['id'])
    op.create_index(op.f('ix_integrity_checks_status'), 'integrity_checks', ['status'])
    op.create_index(op.f('ix_integrity_checks_user_id'), 'integrity_checks', ['user_id'])
    
    # Create export_jobs table
    op.create_table('export_jobs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('export_type', postgresql.ENUM('document', 'studio', 'gdpr_data', 'backup', name='exporttype', create_type=False), nullable=False),
        sa.Column('export_format', postgresql.ENUM('pdf', 'docx', 'markdown', 'html', 'epub', 'txt', 'json', name='exportformat', create_type=False), nullable=False),
        sa.Column('status', postgresql.ENUM('pending', 'processing', 'completed', 'failed', 'expired', name='exportstatus', create_type=False), nullable=False, server_default='pending'),
        sa.Column('document_id', sa.Integer(), nullable=True),
        sa.Column('studio_id', sa.Integer(), nullable=True),
        sa.Column('include_metadata', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('include_comments', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('include_version_history', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('file_url', sa.String(length=1024), nullable=True),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('file_name', sa.String(length=255), nullable=True),
        sa.Column('processing_started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('processing_completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('total_items', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('processed_items', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['studio_id'], ['studios.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_expiration', 'export_jobs', ['expires_at', 'status'])
    op.create_index('idx_export_status', 'export_jobs', ['status', 'export_type'])
    op.create_index('idx_user_exports', 'export_jobs', ['user_id', 'created_at'])
    op.create_index(op.f('ix_export_jobs_document_id'), 'export_jobs', ['document_id'])
    op.create_index(op.f('ix_export_jobs_export_format'), 'export_jobs', ['export_format'])
    op.create_index(op.f('ix_export_jobs_export_type'), 'export_jobs', ['export_type'])
    op.create_index(op.f('ix_export_jobs_id'), 'export_jobs', ['id'])
    op.create_index(op.f('ix_export_jobs_status'), 'export_jobs', ['status'])
    op.create_index(op.f('ix_export_jobs_studio_id'), 'export_jobs', ['studio_id'])
    op.create_index(op.f('ix_export_jobs_user_id'), 'export_jobs', ['user_id'])
    
    # Add accessibility_settings to users table
    op.add_column('users', sa.Column('accessibility_settings', postgresql.JSON(astext_type=sa.Text()), nullable=True))


def downgrade():
    # Remove accessibility_settings from users
    op.drop_column('users', 'accessibility_settings')
    
    # Drop export_jobs table
    op.drop_index(op.f('ix_export_jobs_user_id'), table_name='export_jobs')
    op.drop_index(op.f('ix_export_jobs_studio_id'), table_name='export_jobs')
    op.drop_index(op.f('ix_export_jobs_status'), table_name='export_jobs')
    op.drop_index(op.f('ix_export_jobs_id'), table_name='export_jobs')
    op.drop_index(op.f('ix_export_jobs_export_type'), table_name='export_jobs')
    op.drop_index(op.f('ix_export_jobs_export_format'), table_name='export_jobs')
    op.drop_index(op.f('ix_export_jobs_document_id'), table_name='export_jobs')
    op.drop_index('idx_user_exports', table_name='export_jobs')
    op.drop_index('idx_export_status', table_name='export_jobs')
    op.drop_index('idx_expiration', table_name='export_jobs')
    op.drop_table('export_jobs')
    
    # Drop integrity_checks table
    op.drop_index(op.f('ix_integrity_checks_user_id'), table_name='integrity_checks')
    op.drop_index(op.f('ix_integrity_checks_status'), table_name='integrity_checks')
    op.drop_index(op.f('ix_integrity_checks_id'), table_name='integrity_checks')
    op.drop_index(op.f('ix_integrity_checks_external_check_id'), table_name='integrity_checks')
    op.drop_index(op.f('ix_integrity_checks_document_id'), table_name='integrity_checks')
    op.drop_index(op.f('ix_integrity_checks_check_type'), table_name='integrity_checks')
    op.drop_index('idx_user_checks', table_name='integrity_checks')
    op.drop_index('idx_document_checks', table_name='integrity_checks')
    op.drop_index('idx_check_status', table_name='integrity_checks')
    op.drop_table('integrity_checks')
    
    # Drop enum types
    op.execute('DROP TYPE exporttype')
    op.execute('DROP TYPE exportstatus')
    op.execute('DROP TYPE exportformat')
    op.execute('DROP TYPE integritycheckstatus')
    op.execute('DROP TYPE integritychecktype')
