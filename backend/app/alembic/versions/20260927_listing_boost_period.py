"""Add listing boost period."""

from alembic import op
import sqlalchemy as sa


revision = "20260927_listing_boost_period"
down_revision = "20260927_deliveries"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "listings",
        sa.Column("boost_starts_at", sa.DateTime(timezone=True), nullable=True),
        schema="market",
    )
    op.add_column(
        "listings",
        sa.Column("boost_ends_at", sa.DateTime(timezone=True), nullable=True),
        schema="market",
    )
    op.create_index(
        "ix_market_listings_boost_starts_at",
        "listings",
        ["boost_starts_at"],
        schema="market",
    )
    op.create_index(
        "ix_market_listings_boost_ends_at",
        "listings",
        ["boost_ends_at"],
        schema="market",
    )


def downgrade():
    op.drop_index(
        "ix_market_listings_boost_ends_at",
        table_name="listings",
        schema="market",
    )
    op.drop_index(
        "ix_market_listings_boost_starts_at",
        table_name="listings",
        schema="market",
    )
    op.drop_column("listings", "boost_ends_at", schema="market")
    op.drop_column("listings", "boost_starts_at", schema="market")
