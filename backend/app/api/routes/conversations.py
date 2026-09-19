from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.repositories.conversation_repository import (
    ConversationRepository,
)
from app.schemas.conversation import (
    ConversationResponse,
    InterestRequest,
    InterestResponse,
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
    response_model=InterestResponse,
)
async def express_interest(
    listing_id: UUID,
    data: InterestRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    conversation, created = (
        await ConversationService.express_interest(
            db,
            listing_id,
            current_user.id,
            data.message,
        )
    )

    return {
        "conversation": conversation,
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
    return await ConversationService.send_message(
        db,
        conversation_id,
        current_user.id,
        data.content,
    )