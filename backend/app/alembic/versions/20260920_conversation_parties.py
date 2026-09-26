"""Add buyer and seller fields to conversations."""

from alembic import op


revision = "20260920_conv_parties"
down_revision = "20260920_mod_cols"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        ALTER TABLE IF EXISTS market.conversations
        ADD COLUMN IF NOT EXISTS buyer_id UUID NULL
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.conversations
        ADD COLUMN IF NOT EXISTS seller_id UUID NULL
        """
    )
    op.execute(
        """
        UPDATE market.conversations AS c
        SET buyer_id = c.created_by_user_id
        WHERE c.buyer_id IS NULL
          AND c.created_by_user_id IS NOT NULL
        """
    )
    op.execute(
        """
        UPDATE market.conversations AS c
        SET seller_id = l.seller_id
        FROM market.listings AS l
        WHERE c.seller_id IS NULL
          AND c.listing_id = l.id
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.conversations
        ALTER COLUMN buyer_id SET NOT NULL
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.conversations
        ALTER COLUMN seller_id SET NOT NULL
        """
    )
    op.execute(
        """
        DROP INDEX IF EXISTS market.uq_conversation_listing_buyer
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.conversations
        DROP CONSTRAINT IF EXISTS uq_conversation_listing_buyer
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'uq_conversation_listing_buyer_seller'
                  AND conrelid = 'market.conversations'::regclass
            ) THEN
                ALTER TABLE market.conversations
                ADD CONSTRAINT uq_conversation_listing_buyer_seller
                UNIQUE (listing_id, buyer_id, seller_id);
            END IF;
        END
        $$
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_market_conversations_buyer_id
        ON market.conversations (buyer_id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_market_conversations_seller_id
        ON market.conversations (seller_id)
        """
    )


def downgrade():
    op.execute(
        """
        ALTER TABLE IF EXISTS market.conversations
        DROP CONSTRAINT IF EXISTS uq_conversation_listing_buyer_seller
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.conversations
        ADD CONSTRAINT uq_conversation_listing_buyer
        UNIQUE (listing_id, created_by_user_id)
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.conversations
        DROP COLUMN IF EXISTS seller_id
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.conversations
        DROP COLUMN IF EXISTS buyer_id
        """
    )
