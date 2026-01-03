"""workspace_system_phase1

Phase 1 of workspace system implementation:
1. Rename collections → bookmark_folders (avoid naming conflict)
2. Create workspaces table (private collaboration spaces)
3. Create workspace_members table (with roles)
4. Create collections table (NEW - for workspace collaborative content)

Revision ID: 6b8b56621556
Revises: 418d089f04d8
Create Date: 2026-01-03 05:40:02.097149

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "6b8b56621556"
down_revision = "418d089f04d8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Step 1: Rename existing collections → bookmark_folders
    op.rename_table("collections", "bookmark_folders")
    op.rename_table("collection_items", "bookmark_folder_items")

    # Update foreign keys
    op.drop_constraint(
        "collection_items_collection_id_fkey",
        "bookmark_folder_items",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "bookmark_folder_items_folder_id_fkey",
        "bookmark_folder_items",
        "bookmark_folders",
        ["collection_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Rename column for clarity
    op.alter_column(
        "bookmark_folder_items", "collection_id", new_column_name="folder_id"
    )

    # Update indexes
    op.drop_index("idx_collection_items", table_name="bookmark_folder_items")
    op.create_index(
        "idx_bookmark_folder_items",
        "bookmark_folder_items",
        ["folder_id", "created_at"],
    )

    op.drop_index("idx_user_collections", table_name="bookmark_folders")
    op.create_index(
        "idx_user_bookmark_folders", "bookmark_folders", ["user_id", "created_at"]
    )

    # Update unique constraint
    op.drop_constraint("uq_collection_item", "bookmark_folder_items", type_="unique")
    op.create_unique_constraint(
        "uq_bookmark_folder_item",
        "bookmark_folder_items",
        ["folder_id", "item_type", "item_id"],
    )

    # Step 2: Create workspace_type enum
    workspace_type = postgresql.ENUM(
        "personal", "team", "project", name="workspacetype", create_type=False
    )
    workspace_type.create(op.get_bind(), checkfirst=True)

    # Step 3: Create workspace_role enum
    workspace_role = postgresql.ENUM(
        "owner", "admin", "editor", "viewer", name="workspacerole", create_type=False
    )
    workspace_role.create(op.get_bind(), checkfirst=True)

    # Step 4: Create workspace_visibility enum
    workspace_visibility = postgresql.ENUM(
        "private", "organization", name="workspacevisibility", create_type=False
    )
    workspace_visibility.create(op.get_bind(), checkfirst=True)

    # Step 5: Create workspaces table
    op.create_table(
        "workspaces",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "type",
            postgresql.ENUM(
                "personal", "team", "project", name="workspacetype", create_type=False
            ),
            nullable=False,
        ),
        sa.Column(
            "visibility",
            postgresql.ENUM(
                "private", "organization", name="workspacevisibility", create_type=False
            ),
            nullable=False,
            server_default="private",
        ),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_workspaces_owner_id", "workspaces", ["owner_id"])
    op.create_index("ix_workspaces_slug", "workspaces", ["slug"], unique=True)
    op.create_index("ix_workspaces_type", "workspaces", ["type"])

    # Step 6: Create workspace_members table
    op.create_table(
        "workspace_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "role",
            postgresql.ENUM(
                "owner",
                "admin",
                "editor",
                "viewer",
                name="workspacerole",
                create_type=False,
            ),
            nullable=False,
            server_default="editor",
        ),
        sa.Column(
            "can_create_collections",
            sa.Boolean(),
            nullable=False,
            server_default="true",
        ),
        sa.Column(
            "can_edit_workspace", sa.Boolean(), nullable=False, server_default="false"
        ),
        sa.Column(
            "can_invite_members", sa.Boolean(), nullable=False, server_default="false"
        ),
        sa.Column(
            "can_manage_roles", sa.Boolean(), nullable=False, server_default="false"
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["workspace_id"], ["workspaces.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("workspace_id", "user_id", name="uq_workspace_member"),
    )
    op.create_index(
        "ix_workspace_members_workspace_id", "workspace_members", ["workspace_id"]
    )
    op.create_index("ix_workspace_members_user_id", "workspace_members", ["user_id"])

    # Step 7: Create collection_status enum
    collection_status = postgresql.ENUM(
        "draft",
        "review",
        "published",
        "archived",
        name="collectionstatus",
        create_type=False,
    )
    collection_status.create(op.get_bind(), checkfirst=True)

    # Step 8: Create NEW collections table (for workspace collaborative content)
    op.create_table(
        "collections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(
                "draft",
                "review",
                "published",
                "archived",
                name="collectionstatus",
                create_type=False,
            ),
            nullable=False,
            server_default="draft",
        ),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_by", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["workspace_id"], ["workspaces.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["published_by"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_collections_workspace_id", "collections", ["workspace_id"])
    op.create_index("ix_collections_status", "collections", ["status"])
    op.create_index("ix_collections_created_by", "collections", ["created_by"])


def downgrade() -> None:
    # Drop new tables
    op.drop_index("ix_collections_created_by", table_name="collections")
    op.drop_index("ix_collections_status", table_name="collections")
    op.drop_index("ix_collections_workspace_id", table_name="collections")
    op.drop_table("collections")

    op.drop_index("ix_workspace_members_user_id", table_name="workspace_members")
    op.drop_index("ix_workspace_members_workspace_id", table_name="workspace_members")
    op.drop_table("workspace_members")

    op.drop_index("ix_workspaces_type", table_name="workspaces")
    op.drop_index("ix_workspaces_slug", table_name="workspaces")
    op.drop_index("ix_workspaces_owner_id", table_name="workspaces")
    op.drop_table("workspaces")

    # Drop enums
    sa.Enum(name="collectionstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="workspacevisibility").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="workspacerole").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="workspacetype").drop(op.get_bind(), checkfirst=True)

    # Restore original table names
    op.drop_constraint(
        "uq_bookmark_folder_item", "bookmark_folder_items", type_="unique"
    )
    op.create_unique_constraint(
        "uq_collection_item",
        "bookmark_folder_items",
        ["folder_id", "item_type", "item_id"],
    )

    op.drop_index("idx_user_bookmark_folders", table_name="bookmark_folders")
    op.create_index(
        "idx_user_collections", "bookmark_folders", ["user_id", "created_at"]
    )

    op.drop_index("idx_bookmark_folder_items", table_name="bookmark_folder_items")
    op.create_index(
        "idx_collection_items", "bookmark_folder_items", ["folder_id", "created_at"]
    )

    op.alter_column(
        "bookmark_folder_items", "folder_id", new_column_name="collection_id"
    )

    op.drop_constraint(
        "bookmark_folder_items_folder_id_fkey",
        "bookmark_folder_items",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "collection_items_collection_id_fkey",
        "bookmark_folder_items",
        "bookmark_folders",
        ["collection_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.rename_table("bookmark_folder_items", "collection_items")
    op.rename_table("bookmark_folders", "collections")
