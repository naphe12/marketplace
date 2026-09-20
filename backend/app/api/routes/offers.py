from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.offer import Offer
from app.models.user import User
from app.schemas.offer import (
    OfferActionResponse,
    OfferCreate,
    OfferResponse,
)
from app.services.conversation_service import ConversationService
from app.services.offer_service import OfferService


router = APIRouter(
    tags=["Offers"],
)


@router.post(
    "/listings/{listing_id}/offers",
    status_code=201,
)
async def create_listing_offer(
    listing_id: UUID,
    payload: OfferCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation, _created = await ConversationService.express_interest(
        db=db,
        listing_id=listing_id,
        buyer_id=current_user.id,
        initial_message=None,
    )

    return await OfferService.create_for_conversation(
        db=db,
        conversation=conversation,
        buyer=current_user,
        amount=payload.amount,
    )


@router.get(
    "/offers/mine",
    response_model=list[OfferResponse],
)
async def my_offers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.scalars(
        select(Offer)
        .where(
            (Offer.buyer_id == current_user.id)
            | (Offer.seller_id == current_user.id)
        )
        .order_by(Offer.created_at.desc())
    )

    return result.all()


@router.post(
    "/offers/{offer_id}/accept",
    response_model=OfferActionResponse,
)
async def accept_offer(
    offer_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await OfferService.accept(
        db=db,
        offer_id=offer_id,
        seller_id=current_user.id,
    )


@router.post(
    "/offers/{offer_id}/reject",
    response_model=OfferActionResponse,
)
async def reject_offer(
    offer_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await OfferService.reject(
        db=db,
        offer_id=offer_id,
        seller_id=current_user.id,
    )
