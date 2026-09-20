from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import exists, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import (
    Conversation,
    ConversationParticipant,
    Message,
)


class ConversationRepository:

    @staticmethod
    async def get_for_listing_buyer(
        db: AsyncSession,
        listing_id: UUID,
        buyer_id: UUID,
        seller_id: UUID,
    ) -> Conversation | None:

        result = await db.execute(
            select(Conversation)
            .where(
                Conversation.listing_id == listing_id,
                Conversation.buyer_id == buyer_id,
                Conversation.seller_id == seller_id,
            )
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def is_participant(
        db: AsyncSession,
        conversation_id: UUID,
        user_id: UUID,
    ) -> bool:

        result = await db.execute(
            select(
                exists().where(
                    ConversationParticipant.conversation_id
                    == conversation_id,
                    ConversationParticipant.user_id
                    == user_id,
                )
            )
        )

        return bool(result.scalar())

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        conversation_id: UUID,
    ) -> Conversation | None:

        result = await db.execute(
            select(Conversation)
            .where(
                Conversation.id == conversation_id
            )
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def get_for_user_by_id(
        db: AsyncSession,
        conversation_id: UUID,
        user_id: UUID,
    ) -> Conversation | None:

        result = await db.execute(
            select(Conversation)
            .where(
                Conversation.id == conversation_id,
                or_(
                    Conversation.buyer_id == user_id,
                    Conversation.seller_id == user_id,
                ),
            )
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def get_for_user(
        db: AsyncSession,
        user_id: UUID,
    ) -> list[Conversation]:

        result = await db.execute(
            select(Conversation)
            .join(
                ConversationParticipant,
                ConversationParticipant.conversation_id
                == Conversation.id,
            )
            .where(
                ConversationParticipant.user_id == user_id
            )
            .order_by(
                Conversation.last_message_at.desc().nullslast(),
                Conversation.created_at.desc(),
            )
        )

        return list(result.scalars().all())

    @staticmethod
    async def get_messages(
        db: AsyncSession,
        conversation_id: UUID,
        limit: int = 50,
    ) -> list[Message]:

        result = await db.execute(
            select(Message)
            .where(
                Message.conversation_id == conversation_id
            )
            .order_by(Message.created_at.asc())
            .limit(limit)
        )

        return list(result.scalars().all())

    @staticmethod
    async def get_participant_ids(
        db: AsyncSession,
        conversation_id: UUID,
    ) -> list[UUID]:

        result = await db.execute(
            select(
                ConversationParticipant.user_id
            )
            .where(
                ConversationParticipant.conversation_id
                == conversation_id
            )
        )

        return list(result.scalars().all())

    @staticmethod
    async def mark_read(
        db: AsyncSession,
        conversation_id: UUID,
        user_id: UUID,
    ) -> None:

        participant = await db.scalar(
            select(ConversationParticipant)
            .where(
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.user_id == user_id,
            )
        )

        if participant:
            participant.last_read_at = datetime.now(timezone.utc)

        await db.execute(
            update(Message)
            .where(
                Message.conversation_id == conversation_id,
                Message.sender_id != user_id,
                Message.read_at.is_(None),
            )
            .values(read_at=func.now())
        )
