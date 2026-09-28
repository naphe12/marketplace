"""Add wanted requests reverse marketplace."""

from alembic import op


revision = "20260928_wanted_requests"
down_revision = "20260928_marketplace_settings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS market.wanted_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            buyer_id UUID NOT NULL REFERENCES market.users(id),
            category_id UUID NULL REFERENCES market.categories(id),
            title VARCHAR(200) NOT NULL,
            description TEXT NULL,
            budget_min NUMERIC(18, 2) NULL,
            budget_max NUMERIC(18, 2) NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'BIF',
            country_code VARCHAR(2) NOT NULL DEFAULT 'BI',
            administrative_area_id UUID NULL REFERENCES market.administrative_areas(id),
            radius_km NUMERIC(8, 2) NULL,
            condition VARCHAR(30) NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
            expires_at TIMESTAMPTZ NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_market_wanted_requests_buyer_id ON market.wanted_requests (buyer_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_market_wanted_requests_category_id ON market.wanted_requests (category_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_market_wanted_requests_country_code ON market.wanted_requests (country_code)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_market_wanted_requests_status ON market.wanted_requests (status)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS market.wanted_request_attributes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            wanted_request_id UUID NOT NULL REFERENCES market.wanted_requests(id) ON DELETE CASCADE,
            attribute_id UUID NOT NULL REFERENCES market.category_attributes(id),
            value_text TEXT NULL,
            value_integer INTEGER NULL,
            value_decimal NUMERIC(18, 4) NULL,
            value_boolean BOOLEAN NULL,
            value_date DATE NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_wanted_request_attribute UNIQUE (wanted_request_id, attribute_id)
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_market_wanted_request_attributes_request_id ON market.wanted_request_attributes (wanted_request_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_market_wanted_request_attributes_attribute_id ON market.wanted_request_attributes (attribute_id)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS market.wanted_matches (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            wanted_request_id UUID NOT NULL REFERENCES market.wanted_requests(id) ON DELETE CASCADE,
            listing_id UUID NOT NULL REFERENCES market.listings(id) ON DELETE CASCADE,
            match_score INTEGER NOT NULL DEFAULT 0,
            status VARCHAR(30) NOT NULL DEFAULT 'SUGGESTED',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_wanted_match_listing UNIQUE (wanted_request_id, listing_id)
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_market_wanted_matches_wanted_request_id ON market.wanted_matches (wanted_request_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_market_wanted_matches_listing_id ON market.wanted_matches (listing_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_market_wanted_matches_status ON market.wanted_matches (status)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS market.wanted_offers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            wanted_request_id UUID NOT NULL REFERENCES market.wanted_requests(id) ON DELETE CASCADE,
            seller_id UUID NOT NULL REFERENCES market.users(id),
            listing_id UUID NULL REFERENCES market.listings(id) ON DELETE SET NULL,
            amount NUMERIC(14, 2) NOT NULL,
            currency VARCHAR(3) NOT NULL,
            message TEXT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
            responded_at TIMESTAMPTZ NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_market_wanted_offers_request_id ON market.wanted_offers (wanted_request_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_market_wanted_offers_seller_id ON market.wanted_offers (seller_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_market_wanted_offers_listing_id ON market.wanted_offers (listing_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_market_wanted_offers_status ON market.wanted_offers (status)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS market.wanted_offers")
    op.execute("DROP TABLE IF EXISTS market.wanted_matches")
    op.execute("DROP TABLE IF EXISTS market.wanted_request_attributes")
    op.execute("DROP TABLE IF EXISTS market.wanted_requests")
