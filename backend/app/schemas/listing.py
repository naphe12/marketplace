from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ListingCreate(BaseModel):
    category_id: UUID
    administrative_area_id: UUID | None = None

    title: str = Field(
        min_length=3,
        max_length=200,
    )

    description: str | None = None

    price: Decimal | None = Field(
        default=None,
        ge=0,
    )

    currency: str = Field(
        default="BIF",
        min_length=3,
        max_length=3,
    )

    price_type: str = "FIXED"
    condition: str | None = None

    quantity: int = Field(
        default=1,
        ge=1,
    )

    allow_offers: bool = True

    latitude: Decimal | None = None
    longitude: Decimal | None = None


class ListingUpdate(BaseModel):
    category_id: UUID | None = None
    administrative_area_id: UUID | None = None

    title: str | None = Field(
        default=None,
        min_length=3,
        max_length=200,
    )

    description: str | None = None
    price: Decimal | None = Field(default=None, ge=0)

    currency: str | None = Field(default=None, min_length=3, max_length=3)
    price_type: str | None = None
    condition: str | None = None

    quantity: int | None = Field(
        default=None,
        ge=1,
    )

    allow_offers: bool | None = None

    latitude: Decimal | None = None
    longitude: Decimal | None = None


class ListingImageCreate(BaseModel):
    storage_key: str | None = None
    image_url: str | None = None
    thumbnail_url: str | None = None

    position: int = Field(default=0, ge=0)
    is_primary: bool = False


class ListingImageUpdate(BaseModel):
    position: int | None = Field(default=None, ge=0)
    is_primary: bool | None = None


class ListingImageResponse(BaseModel):
    id: UUID

    image_url: str
    thumbnail_url: str | None

    position: int
    is_primary: bool

    model_config = ConfigDict(
        from_attributes=True
    )


class ListingAttributeValueCreate(BaseModel):
    attribute_id: UUID

    value_text: str | None = None
    value_integer: int | None = None
    value_decimal: Decimal | None = None
    value_boolean: bool | None = None
    value_date: date | None = None


class ListingAttributeValueResponse(BaseModel):
    id: UUID
    attribute_id: UUID

    value_text: str | None
    value_integer: int | None
    value_decimal: Decimal | None
    value_boolean: bool | None
    value_date: date | None

    model_config = ConfigDict(
        from_attributes=True
    )


class ListingResponse(BaseModel):
    id: UUID

    seller_id: UUID
    category_id: UUID
    administrative_area_id: UUID | None

    title: str
    description: str | None

    price: Decimal | None
    currency: str
    price_type: str

    condition: str | None
    quantity: int

    status: str
    allow_offers: bool

    published_at: datetime | None
    expires_at: datetime | None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class ListingDetailResponse(ListingResponse):
    images: list[ListingImageResponse] = []
    attribute_values: list[ListingAttributeValueResponse] = []

from typing import Literal


class ListingCardResponse(BaseModel):
    id: UUID

    seller_id: UUID
    category_id: UUID
    administrative_area_id: UUID | None

    title: str

    price: Decimal | None
    currency: str
    price_type: str

    condition: str | None

    status: str

    created_at: datetime
    published_at: datetime | None
    expires_at: datetime | None

    images: list[ListingImageResponse] = []

    model_config = ConfigDict(
        from_attributes=True
    )


class ListingSearchResponse(BaseModel):
    items: list[ListingCardResponse]

    total: int

    offset: int
    limit: int

    has_more: bool