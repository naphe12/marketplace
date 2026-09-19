from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PhoneVerificationRequest(BaseModel):
    pass


class PhoneVerificationConfirm(BaseModel):
    code: str = Field(
        min_length=6,
        max_length=6,
    )


class IdentityVerificationCreate(BaseModel):
    document_type: str = Field(
        min_length=2,
        max_length=50,
    )

    document_number: str | None = Field(
        default=None,
        max_length=100,
    )

    first_name: str = Field(
        min_length=2,
        max_length=100,
    )

    last_name: str = Field(
        min_length=2,
        max_length=100,
    )

    country_code: str = "BI"


class VerificationDocumentCreate(BaseModel):
    document_type: str

    document_side: str | None = None

    file_url: str

    mime_type: str | None = None


class VerificationResponse(BaseModel):
    id: UUID

    user_id: UUID

    verification_type: str
    status: str

    submitted_at: datetime | None
    reviewed_at: datetime | None

    rejection_reason: str | None
    expires_at: datetime | None

    model_config = ConfigDict(
        from_attributes=True
    )


class VerificationReviewRequest(BaseModel):
    status: str

    reason: str | None = Field(
        default=None,
        max_length=2000,
    )