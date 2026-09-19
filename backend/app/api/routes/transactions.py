from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.repositories.transaction_repository import (
    TransactionRepository,
)
from app.schemas.review import (
    ReviewCreate,
    ReviewResponse,
)
from app.schemas.transaction import (
    TransactionCancelRequest,
    TransactionResponse,
)
from app.services.transaction_service import (
    TransactionService,
)


router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"],
)


@router.get(
    "/mine",
    response_model=list[TransactionResponse],
)
async def my_transactions(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await TransactionRepository.get_for_user(
        db,
        current_user.id,
    )


@router.post(
    "/{transaction_id}/confirm",
    response_model=TransactionResponse,
)
async def confirm_transaction(
    transaction_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await TransactionService.confirm(
        db,
        transaction_id,
        current_user.id,
    )


@router.post(
    "/{transaction_id}/cancel",
    response_model=TransactionResponse,
)
async def cancel_transaction(
    transaction_id: UUID,
    data: TransactionCancelRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await TransactionService.cancel(
        db,
        transaction_id,
        current_user.id,
        data.reason,
    )


@router.post(
    "/{transaction_id}/reviews",
    response_model=ReviewResponse,
    status_code=201,
)
async def create_review(
    transaction_id: UUID,
    data: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await TransactionService.create_review(
        db,
        transaction_id,
        current_user.id,
        data.rating,
        data.comment,
    )