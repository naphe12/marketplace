from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import (
    Conversation,
    ConversationParticipant,
    Message,
)
from app.repositories.conversation_repository import (
    ConversationRepository,
)
from app.repositories.listing_repository import (
    ListingRepository,
)
from app.repositories.moderation_repository import (
    ModerationRepository,
)

from app.services.notification_service import (
    NotificationService,
)


class ConversationService:

    @staticmethod
    async def get_user_conversation(
        db: AsyncSession,
        conversation_id: UUID,
        user_id: UUID,
    ) -> Conversation:
        conversation = await ConversationRepository.get_for_user_by_id(
            db,
            conversation_id,
            user_id,
        )

        if not conversation:
            raise HTTPException(
                status_code=404,
                detail="Conversation introuvable.",
            )

        return conversation

    @staticmethod
    async def express_interest(
        db: AsyncSession,
        listing_id: UUID,
        buyer_id: UUID,
        initial_message: str | None = None,
    ):
        listing = await ListingRepository.get_by_id(
            db,
            listing_id,
        )

        if not listing or listing.deleted_at is not None:
            raise HTTPException(
                status_code=404,
                detail="Annonce introuvable.",
            )

        if listing.status != "ACTIVE":
            raise HTTPException(
                status_code=400,
                detail="Cette annonce n'est pas disponible.",
            )

        if listing.seller_id == buyer_id:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Vous ne pouvez pas être intéressé "
                    "par votre propre annonce."
                ),
            )

        existing = (
            await ConversationRepository.get_for_listing_buyer(
                db,
                listing_id,
                buyer_id,
                listing.seller_id,
            )
        )

        if existing:
            return existing, False

        now = datetime.now(timezone.utc)

        conversation = Conversation(
            listing_id=listing.id,
            created_by_user_id=buyer_id,
            buyer_id=buyer_id,
            seller_id=listing.seller_id,
            status="ACTIVE",
            last_message_at=now,
        )

        db.add(conversation)

        await db.flush()

        buyer_participant = ConversationParticipant(
            conversation_id=conversation.id,
            user_id=buyer_id,
        )

        seller_participant = ConversationParticipant(
            conversation_id=conversation.id,
            user_id=listing.seller_id,
        )

        db.add_all([
            buyer_participant,
            seller_participant,
        ])

        message_content = (
            initial_message.strip()
            if initial_message
            else "Bonjour, je suis intéressé par cette annonce."
        )

        message = Message(
            conversation_id=conversation.id,
            sender_id=buyer_id,
            message_type="TEXT",
            content=message_content,
        )

        db.add(message)

        await db.commit()
        await db.refresh(conversation)

        return conversation, True

    @staticmethod
    async def send_message(
        db: AsyncSession,
        conversation_id: UUID,
        sender_id: UUID,
        content: str,
    ) -> Message:

        conversation = await ConversationService.get_user_conversation(
            db,
            conversation_id,
            sender_id,
        )

        if conversation.status != "ACTIVE":
            raise HTTPException(
                status_code=400,
                detail="Cette conversation est fermée.",
            )

        participants = (
            await ConversationRepository.get_participant_ids(
                db,
                conversation_id,
            )
        )

        other_users = [
            user_id
            for user_id in participants
            if user_id != sender_id
        ]

        for other_user_id in other_users:
            blocked_by_sender = (
                await ModerationRepository.is_blocked(
                    db,
                    sender_id,
                    other_user_id,
                )
            )

            blocked_by_receiver = (
                await ModerationRepository.is_blocked(
                    db,
                    other_user_id,
                    sender_id,
                )
            )

            if blocked_by_sender or blocked_by_receiver:
                raise HTTPException(
                    status_code=403,
                    detail=(
                        "La communication entre "
                        "ces utilisateurs est bloquée."
                    ),
                )

        now = datetime.now(timezone.utc)

        message = Message(
            conversation_id=conversation_id,
            sender_id=sender_id,
            message_type="TEXT",
            content=content.strip(),
        )

        conversation.last_message_at = now

        db.add(message)

        for participant_id in participants:
            if participant_id == sender_id:
                continue

            await NotificationService.create(
                db,
                user_id=participant_id,

                notification_type=(
                    "MESSAGE_RECEIVED"
                ),

                title="Nouveau message",

                message=(
                    "Vous avez reçu "
                    "un nouveau message."
                ),

                data={
                    "conversation_id":
                        str(conversation_id),

                    "sender_id":
                        str(sender_id),
                },

                commit=False,
            )

        await db.commit()
        await db.refresh(message)

        return message

    @staticmethod
    async def get_messages(
        db: AsyncSession,
        conversation_id: UUID,
        user_id: UUID,
    ):

        await ConversationService.get_user_conversation(
            db,
            conversation_id,
            user_id,
        )

        return await ConversationRepository.get_messages(
            db,
            conversation_id,
        )

    @staticmethod
    async def mark_read(
        db: AsyncSession,
        conversation_id: UUID,
        user_id: UUID,
    ):
        await ConversationService.get_user_conversation(
            db,
            conversation_id,
            user_id,
        )

        await ConversationRepository.mark_read(
            db,
            conversation_id,
            user_id,
        )
        await db.commit()

        return {
            "ok": True,
        }
