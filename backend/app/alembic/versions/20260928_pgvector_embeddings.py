"""Add pgvector embeddings for listings and wanted requests."""

from alembic import op


revision = "20260928_pgvector_embeddings"
down_revision = "20260928_wanted_requests"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("ALTER TABLE market.listings ADD COLUMN IF NOT EXISTS embedding vector(384)")
    op.execute("ALTER TABLE market.wanted_requests ADD COLUMN IF NOT EXISTS embedding vector(384)")
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_market_listings_embedding
        ON market.listings USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_market_wanted_requests_embedding
        ON market.wanted_requests USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS market.ix_market_wanted_requests_embedding")
    op.execute("DROP INDEX IF EXISTS market.ix_market_listings_embedding")
    op.execute("ALTER TABLE market.wanted_requests DROP COLUMN IF EXISTS embedding")
    op.execute("ALTER TABLE market.listings DROP COLUMN IF EXISTS embedding")
