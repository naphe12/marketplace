"""Add secure payments and transaction disputes."""

from alembic import op


revision = "20260928_secure_payments"
down_revision = "20260928_reputation_id"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS market.secure_payments (
            transaction_id UUID NOT NULL REFERENCES market.transactions(id) ON DELETE CASCADE,
            buyer_id UUID NOT NULL REFERENCES market.users(id),
            seller_id UUID NOT NULL REFERENCES market.users(id),
            amount NUMERIC(18, 2) NOT NULL,
            currency VARCHAR(3) NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT',
            provider VARCHAR(40),
            external_reference VARCHAR(120),
            paid_at TIMESTAMPTZ,
            released_at TIMESTAMPTZ,
            refunded_at TIMESTAMPTZ,
            disputed_at TIMESTAMPTZ,
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_secure_payment_transaction UNIQUE (transaction_id)
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_secure_payments_transaction_id ON market.secure_payments (transaction_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_secure_payments_buyer_id ON market.secure_payments (buyer_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_secure_payments_seller_id ON market.secure_payments (seller_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_secure_payments_status ON market.secure_payments (status)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS market.transaction_disputes (
            transaction_id UUID NOT NULL REFERENCES market.transactions(id) ON DELETE CASCADE,
            secure_payment_id UUID REFERENCES market.secure_payments(id) ON DELETE SET NULL,
            opened_by_user_id UUID NOT NULL REFERENCES market.users(id),
            reason VARCHAR(80) NOT NULL,
            description TEXT,
            status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
            admin_resolution TEXT,
            resolved_by_user_id UUID REFERENCES market.users(id),
            resolved_at TIMESTAMPTZ,
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_transaction_disputes_transaction_id ON market.transaction_disputes (transaction_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_transaction_disputes_secure_payment_id ON market.transaction_disputes (secure_payment_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_transaction_disputes_status ON market.transaction_disputes (status)")


def downgrade():
    op.execute("DROP INDEX IF EXISTS market.ix_transaction_disputes_status")
    op.execute("DROP INDEX IF EXISTS market.ix_transaction_disputes_secure_payment_id")
    op.execute("DROP INDEX IF EXISTS market.ix_transaction_disputes_transaction_id")
    op.execute("DROP TABLE IF EXISTS market.transaction_disputes")
    op.execute("DROP INDEX IF EXISTS market.ix_secure_payments_status")
    op.execute("DROP INDEX IF EXISTS market.ix_secure_payments_seller_id")
    op.execute("DROP INDEX IF EXISTS market.ix_secure_payments_buyer_id")
    op.execute("DROP INDEX IF EXISTS market.ix_secure_payments_transaction_id")
    op.execute("DROP TABLE IF EXISTS market.secure_payments")
