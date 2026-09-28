"""Add missing trust_level column to reputation profiles."""

from alembic import op


revision = "20260928_reputation_trust_level"
down_revision = "20260928_reports_status_compat"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        ALTER TABLE IF EXISTS market.reputation_profiles
        ADD COLUMN IF NOT EXISTS trust_level VARCHAR(30) NOT NULL DEFAULT 'NEW'
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF to_regclass('market.reputation_profiles') IS NOT NULL THEN
                UPDATE market.reputation_profiles
                SET trust_level = CASE
                    WHEN trust_score >= 85 THEN 'TRUSTED'
                    WHEN trust_score >= 60 THEN 'RELIABLE'
                    WHEN trust_score >= 30 THEN 'STANDARD'
                    ELSE 'NEW'
                END
                WHERE trust_level = 'NEW';
            END IF;
        END $$;
        """
    )


def downgrade():
    op.execute(
        """
        ALTER TABLE IF EXISTS market.reputation_profiles
        DROP COLUMN IF EXISTS trust_level
        """
    )
