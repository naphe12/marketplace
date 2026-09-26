"""Add favorite folders."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260926_favorite_folders"
down_revision = "20260926_saved_searches"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "favorite_folders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["market.users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "name", name="uq_favorite_folder_user_name"),
        schema="market",
    )
    op.create_index(
        "ix_market_favorite_folders_user_id",
        "favorite_folders",
        ["user_id"],
        schema="market",
    )
    op.add_column(
        "favorites",
        sa.Column("folder_id", postgresql.UUID(as_uuid=True), nullable=True),
        schema="market",
    )
    op.create_foreign_key(
        "fk_favorites_folder_id_favorite_folders",
        "favorites",
        "favorite_folders",
        ["folder_id"],
        ["id"],
        source_schema="market",
        referent_schema="market",
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_market_favorites_folder_id",
        "favorites",
        ["folder_id"],
        schema="market",
    )


def downgrade():
    op.drop_index("ix_market_favorites_folder_id", table_name="favorites", schema="market")
    op.drop_constraint(
        "fk_favorites_folder_id_favorite_folders",
        "favorites",
        schema="market",
        type_="foreignkey",
    )
    op.drop_column("favorites", "folder_id", schema="market")
    op.drop_index("ix_market_favorite_folders_user_id", table_name="favorite_folders", schema="market")
    op.drop_table("favorite_folders", schema="market")
