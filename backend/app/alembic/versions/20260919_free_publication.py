"""Allow free publications without a paid package."""

from alembic import op
from sqlalchemy.dialects import postgresql


revision = "20260919_free_publication"
down_revision = "20260919_image_storage"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column(
        "listing_publications",
        "package_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
        schema="market",
    )


def downgrade():
    # PostgreSQL rejects this if free publications still have a NULL package.
    # Preserve those records instead of deleting them or inventing a package.
    op.alter_column(
        "listing_publications",
        "package_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
        schema="market",
    )
