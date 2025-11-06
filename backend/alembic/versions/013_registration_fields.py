"""add registration fields to users

Revision ID: 013_registration_fields
Revises: 012_ai_templates
Create Date: 2025-11-05

Adds fields needed for enhanced user registration:
- phone_number: Unique phone number for SMS verification
- newsletter_opt_in: Whether user wants newsletter emails
- sms_opt_in: Whether user wants SMS notifications
- house_rules_accepted: Whether user accepted house rules
- birth_year: Year of birth for age verification (18+)
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '013_registration_fields'
down_revision = '012_ai_generated_templates'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add registration-related columns to users table
    op.add_column('users', sa.Column('phone_number', sa.String(length=20), nullable=True))
    op.add_column('users', sa.Column('newsletter_opt_in', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('sms_opt_in', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('house_rules_accepted', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('birth_year', sa.Integer(), nullable=True))
    
    # Create unique index on phone_number (for uniqueness constraint)
    op.create_index(op.f('ix_users_phone_number'), 'users', ['phone_number'], unique=True)


def downgrade() -> None:
    # Remove the index and columns in reverse order
    op.drop_index(op.f('ix_users_phone_number'), table_name='users')
    op.drop_column('users', 'birth_year')
    op.drop_column('users', 'house_rules_accepted')
    op.drop_column('users', 'sms_opt_in')
    op.drop_column('users', 'newsletter_opt_in')
    op.drop_column('users', 'phone_number')
