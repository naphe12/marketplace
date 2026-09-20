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

from datetime import (
    datetime,
    timezone,
)
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from sqlalchemy import (
    or_,
    select,
)

from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.api.dependencies import (
    get_current_user,
)

from app.core.database import get_db

from app.models.listing import Listing
from app.models.transaction import Transaction
from app.models.user import User
from app.services.listing_publication_service import utcnow


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

@router.get("")
async def list_my_transactions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.scalars(
        select(Transaction)
        .where(
            or_(
                Transaction.buyer_id == current_user.id,
                Transaction.seller_id == current_user.id,
            )
        )
        .order_by(
            Transaction.created_at.desc(),
        )
    )

    return result.all()


@router.get(
    "/{transaction_id}",
)
async def get_transaction(
    transaction_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_user_transaction(
        db,
        transaction_id,
        current_user.id,
    )


@router.post(
    "/{transaction_id}/confirm",
)
async def confirm_transaction(
    transaction_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction = await get_user_transaction(
        db,
        transaction_id,
        current_user.id,
    )

    if transaction.status != "AGREED":
        raise HTTPException(
            status_code=400,
            detail=(
                "Cette transaction ne peut "
                "plus être confirmée."
            ),
        )

    now = utcnow()

    if current_user.id == transaction.buyer_id:
        if transaction.buyer_confirmed_at is None:
            transaction.buyer_confirmed_at = now

    elif current_user.id == transaction.seller_id:
        if transaction.seller_confirmed_at is None:
            transaction.seller_confirmed_at = now

    #
    # Les deux ont confirmé
    #
    if (
        transaction.buyer_confirmed_at
        and transaction.seller_confirmed_at
    ):
        transaction.status = "COMPLETED"
        transaction.completed_at = now

        listing = await db.get(
            Listing,
            transaction.listing_id,
        )

        if listing:
            listing.status = "SOLD"

    await db.commit()
    await db.refresh(transaction)

    return {
        "id": transaction.id,
        "status": transaction.status,

        "buyer_confirmed":
            transaction.buyer_confirmed_at
            is not None,

        "seller_confirmed":
            transaction.seller_confirmed_at
            is not None,

        "completed_at":
            transaction.completed_at,
    }


@router.post(
    "/{transaction_id}/cancel",
)
async def cancel_transaction(
    transaction_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction = await get_user_transaction(
        db,
        transaction_id,
        current_user.id,
    )

    if transaction.status != "AGREED":
        raise HTTPException(
            status_code=400,
            detail=(
                "Cette transaction ne peut "
                "plus être annulée."
            ),
        )

    transaction.status = "CANCELLED"
    transaction.cancelled_at = utcnow()

    listing = await db.get(
        Listing,
        transaction.listing_id,
    )

    if listing and listing.status == "RESERVED":
        listing.status = "ACTIVE"

    await db.commit()

    return {
        "status": "CANCELLED",
        "listing_status":
            listing.status if listing else None,
    }


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

async def get_user_transaction(
    db: AsyncSession,
    transaction_id: UUID,
    user_id: UUID,
) -> Transaction:
    transaction = await db.scalar(
        select(Transaction).where(
            Transaction.id == transaction_id,
            or_(
                Transaction.buyer_id == user_id,
                Transaction.seller_id == user_id,
            ),
        )
    )

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction introuvable.",
        )

    return transaction