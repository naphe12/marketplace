"""Add admin audit logs and moderation timestamps."""

from alembic import op


revision = "20260920_admin_audit"
down_revision = "20260919_free_publication"
branch_labels = None
depends_on = None


def upgrade():
    for table_name in (
        "reports",
        "fraud_signals",
        "moderation_actions",
        "user_blocks",
    ):
        op.execute(
            f"""
            ALTER TABLE market.{table_name}
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            """
        )
        op.execute(
            f"""
            ALTER TABLE market.{table_name}
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            """
        )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS market.audit_logs (
            id UUID PRIMARY KEY,
            actor_user_id UUID NOT NULL REFERENCES market.users(id),
            action VARCHAR(100) NOT NULL,
            target_type VARCHAR(50) NOT NULL,
            target_id UUID NULL,
            metadata_json JSON NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        ALTER TABLE market.audit_logs
        ADD COLUMN IF NOT EXISTS id UUID
        """
    )
    op.execute(
        """
        ALTER TABLE market.audit_logs
        ADD COLUMN IF NOT EXISTS actor_user_id UUID
        """
    )
    op.execute(
        """
        ALTER TABLE market.audit_logs
        ADD COLUMN IF NOT EXISTS action VARCHAR(100)
        """
    )
    op.execute(
        """
        ALTER TABLE market.audit_logs
        ADD COLUMN IF NOT EXISTS target_type VARCHAR(50)
        """
    )
    op.execute(
        """
        ALTER TABLE market.audit_logs
        ADD COLUMN IF NOT EXISTS target_id UUID
        """
    )
    op.execute(
        """
        ALTER TABLE market.audit_logs
        ADD COLUMN IF NOT EXISTS metadata_json JSON
        """
    )
    op.execute(
        """
        ALTER TABLE market.audit_logs
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        """
    )
    op.execute(
        """
        ALTER TABLE market.audit_logs
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        """
    )
    op.execute(
        """
        UPDATE market.audit_logs
        SET action = 'UNKNOWN'
        WHERE action IS NULL
        """
    )
    op.execute(
        """
        UPDATE market.audit_logs
        SET target_type = 'UNKNOWN'
        WHERE target_type IS NULL
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_market_audit_logs_actor_user_id
        ON market.audit_logs (actor_user_id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_market_audit_logs_action
        ON market.audit_logs (action)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_market_audit_logs_target_type
        ON market.audit_logs (target_type)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_market_audit_logs_target_id
        ON market.audit_logs (target_id)
        """
    )


def downgrade():
    op.execute("DROP TABLE IF EXISTS market.audit_logs")
    for table_name in (
        "user_blocks",
        "moderation_actions",
        "fraud_signals",
        "reports",
    ):
        op.execute(
            f"ALTER TABLE market.{table_name} DROP COLUMN IF EXISTS updated_at"
        )
