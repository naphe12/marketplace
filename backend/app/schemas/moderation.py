from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ReportCreate(BaseModel):
    target_type: str
    target_id: UUID

    reason: str = Field(
        min_length=3,
        max_length=50,
    )

    description: str | None = Field(
        default=None,
        max_length=3000,
    )


class ReportResponse(BaseModel):
    id: UUID

    reporter_id: UUID

    target_type: str
    target_id: UUID

    reason: str
    description: str | None

    status: str
    priority: str

    reviewed_at: datetime | None
    resolution_note: str | None

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class ReportReviewRequest(BaseModel):
    decision: str

    note: str | None = Field(
        default=None,
        max_length=3000,
    )


class ModerationActionCreate(BaseModel):
    target_type: str
    target_id: UUID

    action_type: str

    reason: str = Field(
        min_length=3,
        max_length=3000,
    )

    report_id: UUID | None = None
    fraud_signal_id: UUID | None = None


class FraudSignalResponse(BaseModel):
    id: UUID

    user_id: UUID | None
    listing_id: UUID | None

    signal_type: str

    risk_score: Decimal
    severity: str
    status: str

    signal_data: dict | None

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )