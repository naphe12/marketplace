from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.repositories.conversation_repository import (
    ConversationRepository,
)
from app.schemas.conversation import (
    ConversationResponse,
    InterestRequest,
    InterestConversationResponse,
    MessageCreate,
    MessageResponse,
)
from app.services.conversation_service import (
    ConversationService,
)


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
