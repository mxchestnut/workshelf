"""Consolidated schema - December 2025

This migration represents the complete current database schema as of December 10, 2025.
All previous migrations have been flattened into this single migration.

Revision ID: consolidated_dec_2025
Revises: 
Create Date: 2025-12-10 09:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'consolidated_dec_2025'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    This migration assumes the database already has the complete schema.
    It exists only to establish a clean migration baseline.
    
    The actual schema was created through models and previous migrations.
    This consolidates them into a single reference point.
    """
    # No operations needed - schema already exists
    pass


def downgrade() -> None:
    """
    Cannot downgrade from consolidated schema.
    If you need to reset, drop and recreate the database.
    """
    raise Exception(
        "Cannot downgrade from consolidated schema. "
        "Drop and recreate the database if you need to start fresh."
    )
