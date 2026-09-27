"""Align report reason constraint with public reporting UI."""

from alembic import op


revision = "20260927_report_reason_values"
down_revision = "20260927_listing_boost_period"
branch_labels = None
depends_on = None


ALLOWED_REASONS = (
    "FRAUD",
    "PROHIBITED_ITEM",
    "MISLEADING",
    "DUPLICATE",
    "OTHER",
    "MESSAGE_ABUSE",
    "SPAM",
    "INAPPROPRIATE",
    "SCAM",
)


def _constraint_sql(values: tuple[str, ...]) -> str:
    quoted = ", ".join(f"'{value}'" for value in values)
    return f"reason IN ({quoted})"


def upgrade():
    op.execute("ALTER TABLE market.reports DROP CONSTRAINT IF EXISTS reports_reason_check")
    op.create_check_constraint(
        "reports_reason_check",
        "reports",
        _constraint_sql(ALLOWED_REASONS),
        schema="market",
    )


def downgrade():
    op.execute("ALTER TABLE market.reports DROP CONSTRAINT IF EXISTS reports_reason_check")
