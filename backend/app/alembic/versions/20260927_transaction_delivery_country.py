"""Add transaction and delivery country code."""
from alembic import op

revision = "20260927_tx_delivery_country"
down_revision = "20260927_package_country_code"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE market.transactions
        ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) NOT NULL DEFAULT 'BI'
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_market_transactions_country_code
        ON market.transactions (country_code)
        """
    )
    op.execute(
        """
        UPDATE market.transactions AS tx
        SET country_code = listing.country_code
        FROM market.listings AS listing
        WHERE tx.listing_id = listing.id
        """
    )

    op.execute(
        """
        ALTER TABLE market.deliveries
        ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) NOT NULL DEFAULT 'BI'
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_market_deliveries_country_code
        ON market.deliveries (country_code)
        """
    )
    op.execute(
        """
        UPDATE market.deliveries AS delivery
        SET country_code = tx.country_code
        FROM market.transactions AS tx
        WHERE delivery.transaction_id = tx.id
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS market.ix_market_deliveries_country_code")
    op.execute("ALTER TABLE market.deliveries DROP COLUMN IF EXISTS country_code")
    op.execute("DROP INDEX IF EXISTS market.ix_market_transactions_country_code")
    op.execute("ALTER TABLE market.transactions DROP COLUMN IF EXISTS country_code")
