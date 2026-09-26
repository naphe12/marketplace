from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.listing import ListingCardResponse


class FavoriteFolderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class FavoriteFolderUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)


class FavoriteFolderResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FavoriteMoveRequest(BaseModel):
    folder_id: UUID | None = None


class FavoriteItemResponse(BaseModel):
    listing: ListingCardResponse
    folder_id: UUID | None
    favorited_at: datetime
