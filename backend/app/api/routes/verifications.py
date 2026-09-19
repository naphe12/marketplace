from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    get_current_admin,
    get_current_user,
)
from app.core.database import get_db
from app.repositories.verification_repository import (
    VerificationRepository,
)
from app.schemas.verification import (
    IdentityVerificationCreate,
    PhoneVerificationConfirm,
    VerificationDocumentCreate,
    VerificationResponse,
    VerificationReviewRequest,
)
from app.services.verification_service import (
    VerificationService,
)


router = APIRouter(
    prefix="/verifications",
    tags=["Verifications"],
)


@router.post(
    "/phone/request",
)
async def request_phone_verification(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await VerificationService.request_phone_verification(
        db,
        current_user.id,
    )


@router.post(
    "/phone/confirm",
)
async def confirm_phone_verification(
    data: PhoneVerificationConfirm,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await VerificationService.confirm_phone(
        db,
        current_user.id,
        data.code,
    )


@router.post(
    "/identity",
    response_model=VerificationResponse,
    status_code=201,
)
async def create_identity_verification(
    data: IdentityVerificationCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await (
        VerificationService
        .create_identity_verification(
            db,
            current_user.id,
            data,
        )
    )


@router.post(
    "/{verification_id}/documents",
    status_code=201,
)
async def add_verification_document(
    verification_id: UUID,
    data: VerificationDocumentCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await VerificationService.add_document(
        db,
        verification_id,
        current_user.id,
        data,
    )

@router.get(
    "/admin/pending",
    response_model=list[VerificationResponse],
)
async def pending_verifications(
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    return await VerificationRepository.get_pending(
        db
    )


@router.post(
    "/admin/{verification_id}/review",
    response_model=VerificationResponse,
)
async def review_verification(
    verification_id: UUID,
    data: VerificationReviewRequest,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    return await VerificationService.review(
        db,
        verification_id,
        admin.id,
        data.status,
        data.reason,
    )