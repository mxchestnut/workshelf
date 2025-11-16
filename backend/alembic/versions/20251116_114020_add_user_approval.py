"""add user approval system

Revision ID: add_user_approval
Revises: 
Create Date: 2025-11-16

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_user_approval'
down_revision = '8fa573749fa2'  # Depends on matrix onboarding field
branch_labels = None
depends_on = None


def upgrade():
    # Add is_approved column, defaulting to True for existing users
    op.add_column('users', sa.Column('is_approved', sa.Boolean(), nullable=False, server_default='true'))
    
    # Set staff users to approved
    op.execute("UPDATE users SET is_approved = true WHERE is_staff = true")


def downgrade():
    op.drop_column('users', 'is_approved')
