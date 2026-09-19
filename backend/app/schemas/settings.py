from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MarketplaceSettingsResponse(BaseModel):
    id: UUID

    listing_payment_enabled: bool
    free_listing_duration_days: int

    model_config = ConfigDict(
        from_attributes=True
    )


class MarketplaceSettingsUpdate(BaseModel):
    listing_payment_enabled: bool | None = None

    free_listing_duration_days: int | None = Field(
        default=None,
        ge=1,
        le=365,
    )