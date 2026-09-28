"""Add missing reputation profile counter columns."""

from alembic import op


revision = "20260928_reputation_counts"
down_revision = "20260928_reputation_trust_level"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        ALTER TABLE IF EXISTS market.reputation_profiles
        ADD COLUMN IF NOT EXISTS completed_transactions INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS completed_as_buyer INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS completed_as_seller INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cancelled_transactions INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3, 2),
        ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS business_verified BOOLEAN NOT NULL DEFAULT false
        """
    )


def downgrade():
    op.execute(
        """
        ALTER TABLE IF EXISTS market.reputation_profiles
        DROP COLUMN IF EXISTS business_verified,
        DROP COLUMN IF EXISTS identity_verified,
        DROP COLUMN IF EXISTS phone_verified,
        DROP COLUMN IF EXISTS average_rating,
        DROP COLUMN IF EXISTS review_count,
        DROP COLUMN IF EXISTS cancelled_transactions,
        DROP COLUMN IF EXISTS completed_as_seller,
        DROP COLUMN IF EXISTS completed_as_buyer,
        DROP COLUMN IF EXISTS completed_transactions
        """
    )
