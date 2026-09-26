"""Add listing views."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260926_listing_views"
down_revision = "20260926_admin_notes"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "listing_views",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("listing_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["market.listings.id"], ondelete="CASCADE"),
        schema="market",
    )
    op.create_index("ix_market_listing_views_listing_id", "listing_views", ["listing_id"], schema="market")


def downgrade():
    op.drop_index("ix_market_listing_views_listing_id", table_name="listing_views", schema="market")
    op.drop_table("listing_views", schema="market")
