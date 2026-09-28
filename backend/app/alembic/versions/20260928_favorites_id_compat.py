"""Add favorites id compatibility column."""

from alembic import op


revision = "20260928_favorites_id_compat"
down_revision = "20260928_pgvector_embeddings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute(
        """
        ALTER TABLE market.favorites
        ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid()
        """
    )
    op.execute(
        """
        UPDATE market.favorites
        SET id = gen_random_uuid()
        WHERE id IS NULL
        """
    )
    op.execute(
        """
        ALTER TABLE market.favorites
        ALTER COLUMN id SET NOT NULL
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS ix_market_favorites_id
        ON market.favorites (id)
        """
    )
    op.execute(
        """
        ALTER TABLE market.favorites
        ADD COLUMN IF NOT EXISTS folder_id UUID NULL
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'fk_favorites_folder_id_favorite_folders'
            ) THEN
                ALTER TABLE market.favorites
                ADD CONSTRAINT fk_favorites_folder_id_favorite_folders
                FOREIGN KEY (folder_id)
                REFERENCES market.favorite_folders(id)
                ON DELETE SET NULL;
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_market_favorites_folder_id
        ON market.favorites (folder_id)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS market.ix_market_favorites_folder_id")
    op.execute("ALTER TABLE market.favorites DROP CONSTRAINT IF EXISTS fk_favorites_folder_id_favorite_folders")
    op.execute("ALTER TABLE market.favorites DROP COLUMN IF EXISTS folder_id")
    op.execute("DROP INDEX IF EXISTS market.ix_market_favorites_id")
    op.execute("ALTER TABLE market.favorites DROP COLUMN IF EXISTS id")
