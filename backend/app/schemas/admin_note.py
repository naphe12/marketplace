from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AdminNoteCreate(BaseModel):
    target_type: str = Field(min_length=2, max_length=50)
    target_id: UUID
    body: str = Field(min_length=1, max_length=3000)


class AdminNoteResponse(BaseModel):
    id: UUID
    author_user_id: UUID
    target_type: str
    target_id: UUID
    body: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
