from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    get_current_admin,
    get_current_user,
)
from app.core.database import get_db
from app.repositories.moderation_repository import (
    ModerationRepository,
)
from app.schemas.moderation import (
    FraudSignalResponse,
    ModerationActionCreate,
    ReportCreate,
    ReportResponse,
    ReportReviewRequest,
)
from app.services.moderation_service import (
    ModerationService,
)


router = APIRouter(
    tags=["Moderation"],
)


@router.post(
    "/reports",
    response_model=ReportResponse,
    status_code=201,
)
async def create_report(
    data: ReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await ModerationService.create_report(
        db,
        current_user.id,

        data.target_type,
        data.target_id,

        data.reason,
        data.description,
    )


@router.post(
    "/users/{user_id}/block",
)
async def block_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await ModerationService.block_user(
        db,
        current_user.id,
        user_id,
    )

@router.get(
    "/admin/reports",
    response_model=list[ReportResponse],
)
async def pending_reports(
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    return await (
        ModerationRepository
        .get_pending_reports(db)
    )


@router.post(
    "/admin/reports/{report_id}/review",
    response_model=ReportResponse,
)
async def review_report(
    report_id: UUID,
    data: ReportReviewRequest,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    return await ModerationService.review_report(
        db,
        report_id,
        admin.id,
        data.decision,
        data.note,
    )


@router.get(
    "/admin/fraud-signals",
    response_model=list[FraudSignalResponse],
)
async def fraud_signals(
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    return await (
        ModerationRepository
        .get_open_signals(db)
    )


@router.post(
    "/admin/moderation/actions",
)
async def moderation_action(
    data: ModerationActionCreate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    return await ModerationService.moderate(
        db=db,

        admin_id=admin.id,

        target_type=data.target_type,
        target_id=data.target_id,

        action_type=data.action_type,
        reason=data.reason,

        report_id=data.report_id,

        fraud_signal_id=(
            data.fraud_signal_id
        ),
    )