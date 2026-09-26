"""Add saved searches."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260926_saved_searches"
down_revision = "20260920_conv_parties"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "saved_searches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("query_params", sa.JSON(), nullable=False),
        sa.Column("alerts_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["market.users.id"], ondelete="CASCADE"),
        schema="market",
    )
    op.create_index(
        "ix_market_saved_searches_user_id",
        "saved_searches",
        ["user_id"],
        schema="market",
    )


def downgrade():
    op.drop_index(
        "ix_market_saved_searches_user_id",
        table_name="saved_searches",
        schema="market",
    )
    op.drop_table("saved_searches", schema="market")
