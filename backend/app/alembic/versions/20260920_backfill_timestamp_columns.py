"""Backfill timestamp columns expected by TimestampMixin."""

from alembic import op


revision = "20260920_backfill_ts"
down_revision = "20260920_admin_audit"
branch_labels = None
depends_on = None


TIMESTAMP_TABLES = (
    "users",
    "user_profiles",
    "categories",
    "category_attributes",
    "listings",
    "listing_images",
    "listing_attribute_values",
    "favorites",
    "conversations",
    "conversation_participants",
    "messages",
    "offers",
    "transactions",
    "transaction_status_history",
    "reviews",
    "trust_events",
    "reputation_profiles",
    "notifications",
    "user_verifications",
    "verification_documents",
    "phone_verification_challenges",
    "marketplace_settings",
    "listing_packages",
    "listing_publications",
    "billing_orders",
    "billing_payments",
    "reports",
    "fraud_signals",
    "moderation_actions",
    "user_blocks",
    "audit_logs",
)


def upgrade():
    for table_name in TIMESTAMP_TABLES:
        op.execute(
            f"""
            ALTER TABLE IF EXISTS market.{table_name}
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            """
        )
        op.execute(
            f"""
            ALTER TABLE IF EXISTS market.{table_name}
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            """
        )


def downgrade():
    for table_name in reversed(TIMESTAMP_TABLES):
        op.execute(
            f"""
            ALTER TABLE IF EXISTS market.{table_name}
            DROP COLUMN IF EXISTS updated_at
            """
        )
