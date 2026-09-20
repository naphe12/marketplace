from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.trust import (
    
    TransactionStatusHistory,
    TrustEvent,
)

from app.models.review import Review
from app.repositories.listing_repository import (
    ListingRepository,
)
from app.repositories.transaction_repository import (
    TransactionRepository,
)
from app.services.notification_service import NotificationService
from app.services.reputation_service import (
    ReputationService,
)


class TransactionService:

    @staticmethod
    async def get_owned_transaction(
        db: AsyncSession,
        transaction_id: UUID,
        user_id: UUID,
    ):
        transaction = (
            await TransactionRepository.get_by_id(
                db,
                transaction_id,
            )
        )

        if not transaction:
            raise HTTPException(
                status_code=404,
                detail="Transaction introuvable.",
            )

        if user_id not in {
            transaction.buyer_id,
            transaction.seller_id,
        }:
            raise HTTPException(
                status_code=403,
                detail="Accès refusé.",
            )

        return transaction

    @staticmethod
    async def confirm(
        db: AsyncSession,
        transaction_id: UUID,
        user_id: UUID,
    ):
        transaction = (
            await TransactionService.get_owned_transaction(
                db,
                transaction_id,
                user_id,
            )
        )

        if transaction.status == "COMPLETED":
            return transaction

        if transaction.status != "AGREED":
            raise HTTPException(
                status_code=400,
                detail=(
                    "Cette transaction ne peut pas "
                    "être confirmée."
                ),
            )

        now = datetime.now(timezone.utc)

        if user_id == transaction.buyer_id:
            transaction.buyer_confirmed_at = now

        elif user_id == transaction.seller_id:
            transaction.seller_confirmed_at = now

        # Une seule personne a confirmé pour l'instant.
        if not (
            transaction.buyer_confirmed_at
            and transaction.seller_confirmed_at
        ):
            await db.commit()
            await db.refresh(transaction)

            return transaction

        # ==================================
        # LES DEUX ONT CONFIRMÉ
        # ==================================

        transaction.status = "COMPLETED"
        transaction.completed_at = now

        await ReputationService.recompute(db,transaction.buyer_id,)
        await ReputationService.recompute(db,transaction.seller_id,)
        listing = await ListingRepository.get_by_id(
            db,
            transaction.listing_id,
        )

        if not listing:
            raise HTTPException(
                status_code=404,
                detail="Annonce introuvable.",
            )

        listing.status = "SOLD"

        history = TransactionStatusHistory(
            transaction_id=transaction.id,
            status="COMPLETED",
            changed_by_user_id=user_id,
            note="Transaction confirmée par les deux parties.",
            created_at=now,
        )

        buyer_event = TrustEvent(
            user_id=transaction.buyer_id,
            event_type="TRANSACTION_COMPLETED",
            source_type="TRANSACTION",
            source_id=transaction.id,
            impact=Decimal("1.00"),
            event_data={
                "role": "BUYER",
            },
            created_at=now,
        )

        seller_event = TrustEvent(
            user_id=transaction.seller_id,
            event_type="TRANSACTION_COMPLETED",
            source_type="TRANSACTION",
            source_id=transaction.id,
            impact=Decimal("1.00"),
            event_data={
                "role": "SELLER",
            },
            created_at=now,
        )

        db.add_all([
            history,
            buyer_event,
            seller_event,
        ])

        await NotificationService.create(
            db,
            user_id=transaction.buyer_id,
            notification_type="TRANSACTION_COMPLETED",
            title="Transaction terminée",
            message=(
                "La transaction est terminée. "
                "Vous pouvez maintenant "
                "évaluer le vendeur."
            ),
            data={
                "transaction_id": str(transaction.id),
                "listing_id": str(transaction.listing_id),
            },
            commit=False,
        )

        await NotificationService.create(
            db,
            user_id=transaction.seller_id,
            notification_type="TRANSACTION_COMPLETED",
            title="Transaction terminée",
            message=(
                "La transaction est terminée. "
                "Vous pouvez maintenant "
                "évaluer l'acheteur."
            ),
            data={
                "transaction_id": str(transaction.id),
                "listing_id": str(transaction.listing_id),
            },
            commit=False,
        )

        await db.commit()
        await db.refresh(transaction)

        return transaction

    @staticmethod
    async def cancel(
        db: AsyncSession,
        transaction_id: UUID,
        user_id: UUID,
        reason: str,
    ):
        transaction = (
            await TransactionService.get_owned_transaction(
                db,
                transaction_id,
                user_id,
            )
        )

        if transaction.status != "AGREED":
            raise HTTPException(
                status_code=400,
                detail=(
                    "Cette transaction ne peut plus "
                    "être annulée."
                ),
            )

        now = datetime.now(timezone.utc)

        transaction.status = "CANCELLED"
        transaction.cancelled_at = now
        transaction.cancellation_reason = reason

        listing = await ListingRepository.get_by_id(
            db,
            transaction.listing_id,
        )

        if listing:
            if (
                listing.expires_at
                and listing.expires_at > now
            ):
                listing.status = "ACTIVE"
            else:
                listing.status = "EXPIRED"

        history = TransactionStatusHistory(
            transaction_id=transaction.id,
            status="CANCELLED",
            changed_by_user_id=user_id,
            note=reason,
            created_at=now,
        )

        db.add(history)

        await db.commit()
        await db.refresh(transaction)

        return transaction

    @staticmethod
    async def create_review(
        db: AsyncSession,
        transaction_id: UUID,
        reviewer_id: UUID,
        rating: int,
        comment: str | None,
    ):
        transaction = (
            await TransactionService.get_owned_transaction(
                db,
                transaction_id,
                reviewer_id,
            )
        )

        if transaction.status != "COMPLETED":
            raise HTTPException(
                status_code=400,
                detail=(
                    "Un avis ne peut être laissé "
                    "qu'après une transaction terminée."
                ),
            )

        existing = (
            await TransactionRepository.get_review_by_reviewer(
                db,
                transaction_id,
                reviewer_id,
            )
        )

        if existing:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Vous avez déjà évalué "
                    "cette transaction."
                ),
            )

        if reviewer_id == transaction.buyer_id:
            reviewed_user_id = transaction.seller_id
            role = "SELLER"
        else:
            reviewed_user_id = transaction.buyer_id
            role = "BUYER"

        review = Review(
            transaction_id=transaction.id,
            reviewer_id=reviewer_id,
            reviewed_user_id=reviewed_user_id,
            rating=rating,
            comment=comment,
            status="PUBLISHED",
        )

        db.add(review)

        await db.flush()

        trust_event = TrustEvent(
            user_id=reviewed_user_id,
            event_type="REVIEW_RECEIVED",
            source_type="REVIEW",
            source_id=review.id,

            # pas encore le score final :
            # on enregistre seulement le signal
            impact=Decimal(str(rating)),

            event_data={
                "rating": rating,
                "reviewed_role": role,
            },

            created_at=datetime.now(timezone.utc),
        )

        db.add(trust_event)

        await db.commit()
        await db.refresh(review)

        return review