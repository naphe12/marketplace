"""Add administrable countries."""
from alembic import op
import sqlalchemy as sa

revision = "20260927_countries"
down_revision = "20260927_report_reason_values"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "countries",
        sa.Column("code", sa.String(length=2), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="BIF"),
        sa.Column("phone_prefix", sa.String(length=8), nullable=True),
        sa.Column("default_language", sa.String(length=8), nullable=False, server_default="fr"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code", name="uq_countries_code"),
        schema="market",
    )
    op.create_index("ix_market_countries_code", "countries", ["code"], unique=False, schema="market")
    op.add_column(
        "administrative_areas",
        sa.Column("country_code", sa.String(length=2), nullable=False, server_default="BI"),
        schema="market",
    )
    op.create_index("ix_market_administrative_areas_country_code", "administrative_areas", ["country_code"], schema="market")
    op.execute(
        """
        INSERT INTO market.countries (id, code, name, currency, phone_prefix, default_language, active, sort_order)
        VALUES (gen_random_uuid(), 'BI', 'Burundi', 'BIF', '+257', 'fr', true, 0)
        ON CONFLICT (code) DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_index("ix_market_administrative_areas_country_code", table_name="administrative_areas", schema="market")
    op.drop_column("administrative_areas", "country_code", schema="market")
    op.drop_index("ix_market_countries_code", table_name="countries", schema="market")
    op.drop_table("countries", schema="market")
