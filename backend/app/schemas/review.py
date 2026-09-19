from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ReviewCreate(BaseModel):
    rating: int = Field(
        ge=1,
        le=5,
    )

    comment: str | None = Field(
        default=None,
        max_length=2000,
    )


class ReviewResponse(BaseModel):
    id: UUID

    transaction_id: UUID

    reviewer_id: UUID
    reviewed_user_id: UUID

    rating: int
    comment: str | None

    status: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )