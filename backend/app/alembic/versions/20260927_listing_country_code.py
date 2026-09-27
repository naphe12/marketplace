"""Add listing country code."""
from alembic import op
import sqlalchemy as sa

revision = "20260927_listing_country_code"
down_revision = "20260927_countries"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "listings",
        sa.Column("country_code", sa.String(length=2), nullable=False, server_default="BI"),
        schema="market",
    )
    op.create_index("ix_market_listings_country_code", "listings", ["country_code"], schema="market")
    op.execute(
        """
        UPDATE market.listings AS listing
        SET country_code = area.country_code
        FROM market.administrative_areas AS area
        WHERE listing.administrative_area_id = area.id
        """
    )


def downgrade() -> None:
    op.drop_index("ix_market_listings_country_code", table_name="listings", schema="market")
    op.drop_column("listings", "country_code", schema="market")
