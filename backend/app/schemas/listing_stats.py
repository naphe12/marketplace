from uuid import UUID

from pydantic import BaseModel


class ListingStatsResponse(BaseModel):
    listing_id: UUID
    views: int
    favorites: int
    conversations: int
