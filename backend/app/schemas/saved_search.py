from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SavedSearchCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    query_params: dict = Field(default_factory=dict)
    alerts_enabled: bool = True


class SavedSearchUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    query_params: dict | None = None
    alerts_enabled: bool | None = None


class SavedSearchResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    query_params: dict
    alerts_enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
