"""add azure_object_id to users

Revision ID: add_azure_object_id
Revises: 006
Create Date: 2025-12-18 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_azure_object_id'
down_revision: Union[str, None] = '006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add azure_object_id column to support Microsoft Entra ID authentication
    Make keycloak_id nullable for gradual migration from Keycloak to Azure AD
    """
    # Add azure_object_id column
    op.add_column('users', sa.Column('azure_object_id', sa.String(length=255), nullable=True))
    op.create_index(op.f('ix_users_azure_object_id'), 'users', ['azure_object_id'], unique=True)
    
    # Make keycloak_id nullable (it was required before)
    op.alter_column('users', 'keycloak_id',
               existing_type=sa.String(length=255),
               nullable=True)


def downgrade() -> None:
    """
    Remove azure_object_id column and restore keycloak_id as required
    """
    # Remove azure_object_id
    op.drop_index(op.f('ix_users_azure_object_id'), table_name='users')
    op.drop_column('users', 'azure_object_id')
    
    # Make keycloak_id required again
    op.alter_column('users', 'keycloak_id',
               existing_type=sa.String(length=255),
               nullable=False)
