"""add store_item_id to bookshelf

Revision ID: 006
Revises: 005
Create Date: 2025-01-08 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "006"
down_revision = "005_writer_reader_relationships"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if column already exists
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col["name"] for col in inspector.get_columns("vault_articles")]

    if "store_item_id" in columns:
        return

    # Add store_item_id column to vault_articles
    op.add_column(
        "vault_articles", sa.Column("store_item_id", sa.Integer(), nullable=True)
    )

    # Add foreign key constraint
    op.create_foreign_key(
        "fk_vault_articles_store_item_id",
        "vault_articles",
        "store_items",
        ["store_item_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Add index for faster lookups
    op.create_index(
        "ix_vault_articles_store_item_id", "vault_articles", ["store_item_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_vault_articles_store_item_id", "vault_articles")
    op.drop_constraint(
        "fk_vault_articles_store_item_id", "vault_articles", type_="foreignkey"
    )
    op.drop_column("vault_articles", "store_item_id")
