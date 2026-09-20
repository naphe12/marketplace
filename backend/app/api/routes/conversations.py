from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.repositories.conversation_repository import ConversationRepository
from app.schemas.conversation import (
    ConversationResponse,
    InterestRequest,
    InterestConversationResponse,
    MessageCreate,
    MessageResponse,
)
from app.services.conversation_service import ConversationService
from app.models.user import User
from app.schemas.offer import OfferCreate
from app.services.conversation_service  import get_user_conversation
from app.services.offer_service import OfferService
from app.models.offer import Offer


router = APIRouter(
    tags=["Conversations"],
)


@router.post(
    "/listings/{listing_id}/interest",
    response_model=InterestConversationResponse,
)
async def express_interest(
    listing_id: UUID,
    data: InterestRequest | None = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    conversation, created = (
        await ConversationService.express_interest(
            db,
            listing_id,
            current_user.id,
            data.message if data else None,
        )
    )

    return {
        "conversation_id": conversation.id,
        "created": created,
    }


@router.get(
    "/conversations",
    response_model=list[ConversationResponse],
)
async def my_conversations(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await ConversationRepository.get_for_user(
        db,
        current_user.id,
    )


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationResponse,
)
async def conversation_detail(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await ConversationService.get_user_conversation(
        db,
        conversation_id,
        current_user.id,
    )


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[MessageResponse],
)
async def conversation_messages(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await ConversationService.get_messages(
        db,
        conversation_id,
        current_user.id,
    )


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=201,
)
async def send_message(
    conversation_id: UUID,
    data: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    content = data.body or data.content
    if not content:
        raise HTTPException(
            status_code=422,
            detail="Le message est obligatoire.",
        )

    return await ConversationService.send_message(
        db,
        conversation_id,
        current_user.id,
        content,
    )


@router.post(
    "/conversations/{conversation_id}/read",
)
async def mark_conversation_read(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await ConversationService.mark_read(
        db,
        conversation_id,
        current_user.id,
    )

@router.post(
    "/conversations/{conversation_id}/offers",
)
async def create_offer(
    conversation_id: UUID,
    payload: OfferCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = await get_user_conversation(
        db,
        conversation_id,
        current_user.id,
    )

    return await OfferService.create_for_conversation(
        db=db,
        conversation=conversation,
        buyer=current_user,
        amount=payload.amount,
    )
@router.get("/{conversation_id}/offers")
async def list_conversation_offers(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = await get_user_conversation(
        db,
        conversation_id,
        current_user.id,
    )

    result = await db.execute(
        select(Offer)
        .where(
            Offer.conversation_id == conversation.id
        )
        .order_by(Offer.created_at.asc())
    )

    offers = result.scalars().all()

    return [
        {
            "id": offer.id,
            "conversation_id": offer.conversation_id,
            "listing_id": offer.listing_id,
            "buyer_id": offer.buyer_id,
            "seller_id": offer.seller_id,
            "amount": str(offer.amount),
            "currency": offer.currency,
            "status": offer.status,
            "responded_at": offer.responded_at,
            "created_at": offer.created_at,
        }
        for offer in offers
    ]