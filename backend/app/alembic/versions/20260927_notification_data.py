"""Add JSON data payload to notifications."""

from alembic import op


revision = "20260927_notification_data"
down_revision = "20260926_listing_views"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE market.notifications ADD COLUMN IF NOT EXISTS data JSON")


def downgrade():
    op.drop_column("notifications", "data", schema="market")
