"""Store bucket object keys for listing images."""
from alembic import op
import sqlalchemy as sa

revision = "20260919_image_storage"
down_revision = "20260919_notification_dedup"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("listing_images", sa.Column("storage_key", sa.Text(), nullable=True), schema="market")


def downgrade():
    op.drop_column("listing_images", "storage_key", schema="market")
