from uuid import UUID

from pydantic import BaseModel, Field


class ImageReorderRequest(BaseModel):
    image_ids: list[UUID] = Field(min_length=1)
