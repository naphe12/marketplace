"""Add user country code."""
from alembic import op
import sqlalchemy as sa

revision = "20260927_user_country_code"
down_revision = "20260927_listing_country_code"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("country_code", sa.String(length=2), nullable=False, server_default="BI"),
        schema="market",
    )
    op.create_index("ix_market_users_country_code", "users", ["country_code"], schema="market")


def downgrade() -> None:
    op.drop_index("ix_market_users_country_code", table_name="users", schema="market")
    op.drop_column("users", "country_code", schema="market")
