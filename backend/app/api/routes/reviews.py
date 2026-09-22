import datetime

from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from sqlalchemy import (
    select,
)

from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.api.dependencies import (
    get_current_admin,
    get_current_user,
)

from app.core.database import get_db

from app.models.review import Review
from app.models.transaction import Transaction
from app.models.user import User

from app.schemas.review import ReviewCreate
from app.models.moderation import FraudSignal
from app.schemas.fraud import FraudReviewRequest


router = APIRouter(
    prefix="/transactions",
    tags=["Reviews"],
)
@router.post(
    "/{transaction_id}/reviews",
)
async def create_review(
    transaction_id: UUID,
    payload: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction = await db.get(
        Transaction,
        transaction_id,
    )

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction introuvable.",
        )

    if current_user.id not in {
        transaction.buyer_id,
        transaction.seller_id,
    }:
        raise HTTPException(
            status_code=403,
            detail="Accès interdit.",
        )

    if transaction.status != "COMPLETED":
        raise HTTPException(
            status_code=400,
            detail=(
                "Vous pourrez laisser un avis "
                "une fois la transaction terminée."
            ),
        )

    existing = await db.scalar(
        select(Review).where(
            Review.transaction_id == transaction.id,
            Review.reviewer_id == current_user.id,
        )
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail=(
                "Vous avez déjà donné votre avis "
                "pour cette transaction."
            ),
        )

    if current_user.id == transaction.buyer_id:
        reviewed_user_id = transaction.seller_id
    else:
        reviewed_user_id = transaction.buyer_id

    review = Review(
        transaction_id=transaction.id,
        reviewer_id=current_user.id,
        reviewed_user_id=reviewed_user_id,
        rating=payload.rating,
        comment=(
            payload.comment.strip()
            if payload.comment
            else None
        ),
    )

    db.add(review)

    await db.commit()
    await db.refresh(review)

    return review

@router.get(
    "/users/{user_id}/reviews",
)
async def get_user_reviews(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.scalars(
        select(Review)
        .where(
            Review.reviewed_user_id == user_id,
        )
        .order_by(
            Review.created_at.desc(),
        )
    )

    return result.all()

@router.post(
    "/fraud-signals/{signal_id}/review",
)
async def review_fraud_signal(
    signal_id: UUID,
    payload: FraudReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(
        get_current_admin
    ),
):
    signal = await db.get(
        FraudSignal,
        signal_id,
    )

    if not signal:
        raise HTTPException(
            status_code=404,
            detail="Signal introuvable.",
        )

    signal.admin_label = (
        payload.label
    )

    signal.status = "REVIEWED"

    signal.reviewed_by_user_id = (
        current_admin.id
    )

    signal.reviewed_at = datetime.datetime.now(datetime.timezone.utc)

    await db.commit()

    return {
        "id": signal.id,
        "status": signal.status,
        "admin_label":
            signal.admin_label,
    }