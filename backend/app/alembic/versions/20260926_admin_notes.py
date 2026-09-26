"""Add admin notes."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260926_admin_notes"
down_revision = "20260926_favorite_folders"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "admin_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("author_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_type", sa.String(length=50), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["author_user_id"], ["market.users.id"]),
        schema="market",
    )
    op.create_index("ix_market_admin_notes_author_user_id", "admin_notes", ["author_user_id"], schema="market")
    op.create_index("ix_market_admin_notes_target_type", "admin_notes", ["target_type"], schema="market")
    op.create_index("ix_market_admin_notes_target_id", "admin_notes", ["target_id"], schema="market")


def downgrade():
    op.drop_index("ix_market_admin_notes_target_id", table_name="admin_notes", schema="market")
    op.drop_index("ix_market_admin_notes_target_type", table_name="admin_notes", schema="market")
    op.drop_index("ix_market_admin_notes_author_user_id", table_name="admin_notes", schema="market")
    op.drop_table("admin_notes", schema="market")
