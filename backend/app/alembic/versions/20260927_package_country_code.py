"""Add listing package country code."""
from alembic import op
import sqlalchemy as sa

revision = "20260927_package_country_code"
down_revision = "20260927_user_country_code"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "listing_packages",
        sa.Column("country_code", sa.String(length=2), nullable=False, server_default="BI"),
        schema="market",
    )
    op.create_index("ix_market_listing_packages_country_code", "listing_packages", ["country_code"], schema="market")


def downgrade() -> None:
    op.drop_index("ix_market_listing_packages_country_code", table_name="listing_packages", schema="market")
    op.drop_column("listing_packages", "country_code", schema="market")
