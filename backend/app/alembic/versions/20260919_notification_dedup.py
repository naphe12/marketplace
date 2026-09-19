"""Add notification deduplication to the existing market schema."""
from alembic import op

revision = "20260919_notification_dedup"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE market.notifications ADD COLUMN IF NOT EXISTS deduplication_key VARCHAR(255)")
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_deduplication_key "
        "ON market.notifications (deduplication_key) "
        "WHERE deduplication_key IS NOT NULL"
    )


def downgrade():
    op.drop_index("uq_notifications_deduplication_key", table_name="notifications", schema="market")
    op.drop_column("notifications", "deduplication_key", schema="market")
