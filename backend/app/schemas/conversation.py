from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InterestRequest(BaseModel):
    message: str | None = Field(
        default=None,
        max_length=2000,
    )


class MessageCreate(BaseModel):
    content: str = Field(
        min_length=1,
        max_length=5000,
    )


class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    sender_id: UUID

    message_type: str
    content: str

    read_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class ConversationResponse(BaseModel):
    id: UUID

    listing_id: UUID
    created_by_user_id: UUID

    status: str

    last_message_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class InterestResponse(BaseModel):
    conversation: ConversationResponse
    created: bool