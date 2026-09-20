"""Backfill moderation columns used by admin queries."""

from alembic import op


revision = "20260920_mod_cols"
down_revision = "20260920_backfill_ts"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        ALTER TABLE IF EXISTS market.fraud_signals
        ADD COLUMN IF NOT EXISTS user_id UUID NULL
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.fraud_signals
        ADD COLUMN IF NOT EXISTS listing_id UUID NULL
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.fraud_signals
        ADD COLUMN IF NOT EXISTS signal_type VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN'
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.fraud_signals
        ADD COLUMN IF NOT EXISTS risk_score NUMERIC(5, 2) NOT NULL DEFAULT 0
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.fraud_signals
        ADD COLUMN IF NOT EXISTS severity VARCHAR(20) NOT NULL DEFAULT 'LOW'
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.fraud_signals
        ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'OPEN'
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.fraud_signals
        ADD COLUMN IF NOT EXISTS signal_data JSON NULL
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.fraud_signals
        ADD COLUMN IF NOT EXISTS reviewed_by_user_id UUID NULL
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.fraud_signals
        ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ NULL
        """
    )

    op.execute(
        """
        ALTER TABLE IF EXISTS market.reports
        ADD COLUMN IF NOT EXISTS reporter_id UUID NULL
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.reports
        ADD COLUMN IF NOT EXISTS target_type VARCHAR(30) NOT NULL DEFAULT 'UNKNOWN'
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.reports
        ADD COLUMN IF NOT EXISTS target_id UUID NULL
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.reports
        ADD COLUMN IF NOT EXISTS reason VARCHAR(50) NOT NULL DEFAULT 'OTHER'
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.reports
        ADD COLUMN IF NOT EXISTS description TEXT NULL
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.reports
        ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.reports
        ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL'
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.reports
        ADD COLUMN IF NOT EXISTS reviewed_by_user_id UUID NULL
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.reports
        ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ NULL
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.reports
        ADD COLUMN IF NOT EXISTS resolution_note TEXT NULL
        """
    )

    op.execute(
        """
        ALTER TABLE IF EXISTS market.moderation_actions
        ADD COLUMN IF NOT EXISTS admin_user_id UUID NULL
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.moderation_actions
        ADD COLUMN IF NOT EXISTS target_type VARCHAR(30) NOT NULL DEFAULT 'UNKNOWN'
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.moderation_actions
        ADD COLUMN IF NOT EXISTS target_id UUID NULL
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.moderation_actions
        ADD COLUMN IF NOT EXISTS report_id UUID NULL
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.moderation_actions
        ADD COLUMN IF NOT EXISTS fraud_signal_id UUID NULL
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.moderation_actions
        ADD COLUMN IF NOT EXISTS action_type VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN'
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.moderation_actions
        ADD COLUMN IF NOT EXISTS reason TEXT NOT NULL DEFAULT ''
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.moderation_actions
        ADD COLUMN IF NOT EXISTS previous_status VARCHAR(30) NULL
        """
    )
    op.execute(
        """
        ALTER TABLE IF EXISTS market.moderation_actions
        ADD COLUMN IF NOT EXISTS new_status VARCHAR(30) NULL
        """
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_market_fraud_signals_status
        ON market.fraud_signals (status)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_market_fraud_signals_risk_score
        ON market.fraud_signals (risk_score)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_market_reports_status
        ON market.reports (status)
        """
    )


def downgrade():
    for table_name, columns in (
        (
            "moderation_actions",
            (
                "new_status",
                "previous_status",
                "reason",
                "action_type",
                "fraud_signal_id",
                "report_id",
                "target_id",
                "target_type",
                "admin_user_id",
            ),
        ),
        (
            "reports",
            (
                "resolution_note",
                "reviewed_at",
                "reviewed_by_user_id",
                "priority",
                "status",
                "description",
                "reason",
                "target_id",
                "target_type",
                "reporter_id",
            ),
        ),
        (
            "fraud_signals",
            (
                "reviewed_at",
                "reviewed_by_user_id",
                "signal_data",
                "status",
                "severity",
                "risk_score",
                "signal_type",
                "listing_id",
                "user_id",
            ),
        ),
    ):
        for column_name in columns:
            op.execute(
                f"""
                ALTER TABLE IF EXISTS market.{table_name}
                DROP COLUMN IF EXISTS {column_name}
                """
            )
