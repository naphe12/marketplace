"""Create marketplace publication settings."""

from alembic import op


revision = "20260928_marketplace_settings"
down_revision = "20260927_tx_delivery_country"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS market.marketplace_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            setting_key VARCHAR(30) NOT NULL UNIQUE DEFAULT 'GLOBAL',
            listing_payment_enabled BOOLEAN NOT NULL DEFAULT false,
            free_listing_duration_days INTEGER NOT NULL DEFAULT 30,
            updated_by_user_id UUID NULL REFERENCES market.users(id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        INSERT INTO market.marketplace_settings (
            setting_key,
            listing_payment_enabled,
            free_listing_duration_days
        )
        VALUES ('GLOBAL', false, 30)
        ON CONFLICT (setting_key) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS market.marketplace_settings")
