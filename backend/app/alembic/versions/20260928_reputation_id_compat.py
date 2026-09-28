"""Add missing reputation profile id column."""

from alembic import op


revision = "20260928_reputation_id"
down_revision = "20260928_reputation_counts"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute(
        """
        ALTER TABLE IF EXISTS market.reputation_profiles
        ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid()
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF to_regclass('market.reputation_profiles') IS NOT NULL THEN
                UPDATE market.reputation_profiles
                SET id = gen_random_uuid()
                WHERE id IS NULL;
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.reputation_profiles
        ALTER COLUMN id SET NOT NULL
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS ix_market_reputation_profiles_id
        ON market.reputation_profiles (id)
        """
    )


def downgrade():
    op.execute("DROP INDEX IF EXISTS market.ix_market_reputation_profiles_id")
    op.execute(
        """
        ALTER TABLE IF EXISTS market.reputation_profiles
        DROP COLUMN IF EXISTS id
        """
    )
