from uuid import UUID

from pydantic import BaseModel


class ListingStatsResponse(BaseModel):
    listing_id: UUID
    views: int
    favorites: int
    conversations: int


class SellerDashboardStatusCounts(BaseModel):
    active: int
    expired: int
    draft: int
    other: int
    total: int


class SellerDashboardMetrics(BaseModel):
    views: int
    favorites: int
    conversations: int


class SellerDashboardResponse(BaseModel):
    listings: SellerDashboardStatusCounts
    metrics: SellerDashboardMetrics
