"""Add deliveries."""
from alembic import op
import sqlalchemy as sa

revision = "20260927_deliveries"
down_revision = "20260927_notification_data"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("deliveries", schema="market"):
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

    column_sql = (
        "ALTER TABLE market.deliveries ADD COLUMN IF NOT EXISTS transaction_id UUID",
        "ALTER TABLE market.deliveries ADD COLUMN IF NOT EXISTS requested_by_user_id UUID",
        "ALTER TABLE market.deliveries ADD COLUMN IF NOT EXISTS carrier_name VARCHAR(120)",
        "ALTER TABLE market.deliveries ADD COLUMN IF NOT EXISTS pickup_address TEXT",
        "ALTER TABLE market.deliveries ADD COLUMN IF NOT EXISTS dropoff_address TEXT",
        "ALTER TABLE market.deliveries ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(18, 2) DEFAULT 0 NOT NULL",
        "ALTER TABLE market.deliveries ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'BIF' NOT NULL",
        "ALTER TABLE market.deliveries ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'REQUESTED' NOT NULL",
        "ALTER TABLE market.deliveries ADD COLUMN IF NOT EXISTS tracking_reference VARCHAR(120)",
        "ALTER TABLE market.deliveries ADD COLUMN IF NOT EXISTS proof_url TEXT",
        "ALTER TABLE market.deliveries ADD COLUMN IF NOT EXISTS dispute_reason TEXT",
        "ALTER TABLE market.deliveries ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE market.deliveries ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE market.deliveries ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE market.deliveries ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE market.deliveries ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE market.deliveries ADD COLUMN IF NOT EXISTS id UUID",
        "ALTER TABLE market.deliveries ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL",
        "ALTER TABLE market.deliveries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL",
    )
    for statement in column_sql:
        bind.execute(sa.text(statement))

    bind.execute(sa.text(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'uq_deliveries_transaction_id'
                  AND conrelid = 'market.deliveries'::regclass
            ) THEN
                ALTER TABLE market.deliveries
                ADD CONSTRAINT uq_deliveries_transaction_id UNIQUE (transaction_id);
            END IF;
        END $$;
        """
    ))
    bind.execute(sa.text(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'deliveries_requested_by_user_id_fkey'
                  AND conrelid = 'market.deliveries'::regclass
            ) THEN
                ALTER TABLE market.deliveries
                ADD CONSTRAINT deliveries_requested_by_user_id_fkey
                FOREIGN KEY (requested_by_user_id) REFERENCES market.users (id);
            END IF;
        END $$;
        """
    ))
    bind.execute(sa.text(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'deliveries_transaction_id_fkey'
                  AND conrelid = 'market.deliveries'::regclass
            ) THEN
                ALTER TABLE market.deliveries
                ADD CONSTRAINT deliveries_transaction_id_fkey
                FOREIGN KEY (transaction_id) REFERENCES market.transactions (id) ON DELETE CASCADE;
            END IF;
        END $$;
        """
    ))

    bind.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_market_deliveries_transaction_id ON market.deliveries (transaction_id)"))
    bind.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_market_deliveries_requested_by_user_id ON market.deliveries (requested_by_user_id)"))
    bind.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_market_deliveries_status ON market.deliveries (status)"))


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS market.ix_market_deliveries_status")
    op.execute("DROP INDEX IF EXISTS market.ix_market_deliveries_requested_by_user_id")
    op.execute("DROP INDEX IF EXISTS market.ix_market_deliveries_transaction_id")
    op.execute("DROP TABLE IF EXISTS market.deliveries")
