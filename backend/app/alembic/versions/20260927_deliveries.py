"""Add deliveries."""
from alembic import op
import sqlalchemy as sa

revision = "20260927_deliveries"
down_revision = "20260927_notification_data"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "deliveries",
        sa.Column("transaction_id", sa.UUID(), nullable=False),
        sa.Column("requested_by_user_id", sa.UUID(), nullable=False),
        sa.Column("carrier_name", sa.String(length=120), nullable=True),
        sa.Column("pickup_address", sa.Text(), nullable=False),
        sa.Column("dropoff_address", sa.Text(), nullable=False),
        sa.Column("fee_amount", sa.Numeric(18, 2), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="BIF"),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="REQUESTED"),
        sa.Column("tracking_reference", sa.String(length=120), nullable=True),
        sa.Column("proof_url", sa.Text(), nullable=True),
        sa.Column("dispute_reason", sa.Text(), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("picked_up_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("disputed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["market.users.id"]),
        sa.ForeignKeyConstraint(["transaction_id"], ["market.transactions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("transaction_id", name="uq_deliveries_transaction_id"),
        schema="market",
    )
    op.create_index("ix_market_deliveries_transaction_id", "deliveries", ["transaction_id"], schema="market")
    op.create_index("ix_market_deliveries_requested_by_user_id", "deliveries", ["requested_by_user_id"], schema="market")
    op.create_index("ix_market_deliveries_status", "deliveries", ["status"], schema="market")


def downgrade() -> None:
    op.drop_index("ix_market_deliveries_status", table_name="deliveries", schema="market")
    op.drop_index("ix_market_deliveries_requested_by_user_id", table_name="deliveries", schema="market")
    op.drop_index("ix_market_deliveries_transaction_id", table_name="deliveries", schema="market")
    op.drop_table("deliveries", schema="market")
