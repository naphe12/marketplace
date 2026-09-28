"""Align reports status check constraint."""

from alembic import op


revision = "20260928_reports_status_compat"
down_revision = "20260928_favorites_id_compat"
branch_labels = None
depends_on = None


REPORT_STATUSES = (
    "PENDING",
    "CONFIRMED",
    "REJECTED",
    "IGNORED",
    "REVIEWED",
    "DISMISSED",
    "ESCALATED",
)


def _status_list() -> str:
    return ", ".join(f"'{status}'" for status in REPORT_STATUSES)


def upgrade() -> None:
    op.execute("ALTER TABLE market.reports ALTER COLUMN status SET DEFAULT 'PENDING'")
    op.execute("ALTER TABLE market.reports DROP CONSTRAINT IF EXISTS reports_status_check")
    op.execute(
        f"""
        ALTER TABLE market.reports
        ADD CONSTRAINT reports_status_check
        CHECK (status IN ({_status_list()}))
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE market.reports DROP CONSTRAINT IF EXISTS reports_status_check")
