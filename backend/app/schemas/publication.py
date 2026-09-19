from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ListingPackageResponse(BaseModel):
    id: UUID
    code: str
    name: str

    duration_days: int

    price: Decimal
    currency: str

    model_config = ConfigDict(
        from_attributes=True
    )


class PublicationCreate(BaseModel):
    package_id: UUID


class PublicationResponse(BaseModel):
    id: UUID

    listing_id: UUID
    package_id: UUID | None

    duration_days: int

    price_paid: Decimal
    currency: str

    starts_at: datetime | None
    ends_at: datetime | None

    status: str

    model_config = ConfigDict(
        from_attributes=True
    )