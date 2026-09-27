from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CountryResponse(BaseModel):
    code: str
    name: str
    currency: str
    phone_prefix: str | None
    default_language: str
    active: bool
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


class AdministrativeAreaResponse(BaseModel):
    id: UUID
    parent_id: UUID | None
    country_code: str

    name: str
    area_type: str

    code: str | None

    latitude: float | None
    longitude: float | None

    active: bool

    model_config = ConfigDict(
        from_attributes=True
    )