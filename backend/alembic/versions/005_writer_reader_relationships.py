"""
Create writer_reader_relationships table

Revision ID: 005_writer_reader_relationships
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "005_writer_reader_relationships"
down_revision = "add_folder_id_documents"
branch_labels = None
depends_on = None


def upgrade():
    # Create enum type for reader roles if it doesn't exist
    # Use raw SQL to handle the case where the enum already exists
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE readerrole AS ENUM ('alpha', 'beta');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """
    )

    # Check if table already exists (from Base.metadata.create_all)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "writer_reader_relationships" in inspector.get_table_names():
        return

    # Create writer_reader_relationships table
    op.create_table(
        "writer_reader_relationships",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "writer_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "reader_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "role",
            postgresql.ENUM("alpha", "beta", name="readerrole", create_type=False),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, default=True),
        sa.Column("custom_label", sa.String(100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("documents_shared", sa.Integer(), nullable=False, default=0),
        sa.Column("feedback_provided", sa.Integer(), nullable=False, default=0),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )

    # Create indexes
    op.create_index(
        "idx_writer_reader_role",
        "writer_reader_relationships",
        ["writer_id", "reader_id", "role"],
        unique=True,
    )
    op.create_index(
        "idx_reader_role_active",
        "writer_reader_relationships",
        ["reader_id", "role", "is_active"],
    )
    op.create_index("idx_writer_id", "writer_reader_relationships", ["writer_id"])
    op.create_index("idx_reader_id", "writer_reader_relationships", ["reader_id"])


def downgrade():
    # Drop table
    op.drop_table("writer_reader_relationships")

    # Drop enum type
    reader_role_enum = postgresql.ENUM("alpha", "beta", name="readerrole")
    reader_role_enum.drop(op.get_bind(), checkfirst=True)
