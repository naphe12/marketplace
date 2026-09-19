from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AdministrativeAreaResponse(BaseModel):
    id: UUID
    parent_id: UUID | None

    name: str
    area_type: str

    code: str | None

    latitude: float | None
    longitude: float | None

    active: bool

    model_config = ConfigDict(
        from_attributes=True
    )