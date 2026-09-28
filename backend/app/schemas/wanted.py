from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.listing import ListingCardResponse


class WantedRequestAttributeCreate(BaseModel):
    attribute_id: UUID
    value_text: str | None = None
    value_integer: int | None = None
    value_decimal: Decimal | None = None
    value_boolean: bool | None = None
    value_date: date | None = None


class WantedRequestAttributeResponse(WantedRequestAttributeCreate):
    id: UUID
    wanted_request_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WantedRequestCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str | None = None
    category_id: UUID | None = None
    budget_min: Decimal | None = Field(default=None, ge=0)
    budget_max: Decimal | None = Field(default=None, ge=0)
    currency: str = Field(default="BIF", min_length=3, max_length=3)
    country_code: str = Field(default="BI", min_length=2, max_length=2)
    administrative_area_id: UUID | None = None
    radius_km: Decimal | None = Field(default=None, ge=1, le=500)
    condition: str | None = None
    expires_at: datetime | None = None
    attributes: list[WantedRequestAttributeCreate] = []


class WantedRequestUpdate(BaseModel):
    status: str | None = None
    expires_at: datetime | None = None


class WantedMatchResponse(BaseModel):
    id: UUID
    wanted_request_id: UUID
    listing_id: UUID
    match_score: int
    status: str
    created_at: datetime
    listing: ListingCardResponse | None = None

    model_config = ConfigDict(from_attributes=True)


class WantedOfferCreate(BaseModel):
    listing_id: UUID | None = None
    amount: Decimal = Field(ge=0)
    currency: str = Field(min_length=3, max_length=3)
    message: str | None = Field(default=None, max_length=2000)


class WantedOfferUpdate(BaseModel):
    status: str


class WantedOfferResponse(BaseModel):
    id: UUID
    wanted_request_id: UUID
    seller_id: UUID
    listing_id: UUID | None
    amount: Decimal
    currency: str
    message: str | None
    status: str
    responded_at: datetime | None
    created_at: datetime
    updated_at: datetime
    listing: ListingCardResponse | None = None

    model_config = ConfigDict(from_attributes=True)


class WantedRequestResponse(BaseModel):
    id: UUID
    buyer_id: UUID
    category_id: UUID | None
    title: str
    description: str | None
    budget_min: Decimal | None
    budget_max: Decimal | None
    currency: str
    country_code: str
    administrative_area_id: UUID | None
    radius_km: Decimal | None
    condition: str | None
    status: str
    expires_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WantedRequestDetailResponse(WantedRequestResponse):
    attributes: list[WantedRequestAttributeResponse] = []
    matches: list[WantedMatchResponse] = []
    offers: list[WantedOfferResponse] = []


class WantedSellerOpportunityResponse(BaseModel):
    request: WantedRequestResponse
    seller_listings: list[ListingCardResponse]
    best_score: int
