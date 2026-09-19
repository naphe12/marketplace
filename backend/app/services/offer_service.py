from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.offer import Offer
from app.models.transaction import Transaction
from app.repositories.listing_repository import ListingRepository
from app.repositories.offer_repository import OfferRepository
from app.models.trust import TransactionStatusHistory
from app.services.notification_service import NotificationService


class OfferService:

    @staticmethod
    async def create(
        db: AsyncSession,
        listing_id: UUID,
        buyer_id: UUID,
        amount,
        currency: str,
        message: str | None,
    ):
        listing = await ListingRepository.get_by_id(
            db,
            listing_id,
        )

        if not listing:
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
                    "Vous ne pouvez pas faire "
                    "une offre sur votre propre annonce."
                ),
            )

        if not listing.allow_offers:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Le vendeur n'accepte pas "
                    "les offres sur cette annonce."
                ),
            )

        offer = Offer(
            listing_id=listing.id,
            buyer_id=buyer_id,
            seller_id=listing.seller_id,
            created_by_user_id=buyer_id,

            amount=amount,
            currency=currency.upper(),
            message=message,

            status="PENDING",

            expires_at=(
                datetime.now(timezone.utc)
                + timedelta(days=3)
            ),
        )

        db.add(offer)

        await db.flush()

        await NotificationService.create(
            db,
            user_id=listing.seller_id,
            notification_type="OFFER_RECEIVED",
            title="Nouvelle offre",
            message=(
                f"Vous avez reçu une offre "
                f"de {amount} {currency.upper()}."
            ),
            data={
                "offer_id": str(offer.id),
                "listing_id": str(listing.id),
            },
            commit=False,
        )

        await db.commit()
        await db.refresh(offer)

        return offer

    @staticmethod
    async def counter(
            db: AsyncSession,
            offer_id: UUID,
            user_id: UUID,
            amount,
            message: str | None,
        ):
            original = await OfferRepository.get_by_id(
                db,
                offer_id,
            )

            if not original:
                raise HTTPException(
                    status_code=404,
                    detail="Offre introuvable.",
                )

            if original.status != "PENDING":
                raise HTTPException(
                    status_code=400,
                    detail="Cette offre n'est plus active.",
                )

            if user_id not in {
                original.buyer_id,
                original.seller_id,
            }:
                raise HTTPException(
                    status_code=403,
                    detail="Accès refusé.",
                )

            # Celui qui a créé l'offre courante
            # ne peut pas se contre-proposer lui-même.
            if original.created_by_user_id == user_id:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Vous devez attendre la réponse "
                        "de l'autre partie."
                    ),
                )

            now = datetime.now(timezone.utc)

            original.status = "COUNTERED"
            original.responded_at = now

            counter_offer = Offer(
                listing_id=original.listing_id,
                buyer_id=original.buyer_id,
                seller_id=original.seller_id,

                created_by_user_id=user_id,
                parent_offer_id=original.id,

                amount=amount,
                currency=original.currency,
                message=message,

                status="PENDING",

                expires_at=now + timedelta(days=3),
            )

            db.add(counter_offer)

            await db.flush()

            if user_id == original.seller_id:
                recipient_id = original.buyer_id
            else:
                recipient_id = original.seller_id

            await NotificationService.create(
                db,
                user_id=recipient_id,
                notification_type="COUNTER_OFFER",
                title="Nouvelle contre-offre",
                message=(
                    f"Une contre-offre de "
                    f"{amount} {original.currency} "
                    f"vous a été proposée."
                ),
                data={
                    "offer_id": str(counter_offer.id),
                    "listing_id": str(original.listing_id),
                },
                commit=False,
            )

            await db.commit()
            await db.refresh(counter_offer)

            return counter_offer

    @staticmethod
    async def accept(
        db: AsyncSession,
        offer_id: UUID,
        user_id: UUID,
    ):
        offer = await OfferRepository.get_by_id(
            db,
            offer_id,
        )

        if not offer:
            raise HTTPException(
                status_code=404,
                detail="Offre introuvable.",
            )

        if offer.status != "PENDING":
            raise HTTPException(
                status_code=400,
                detail="Cette offre n'est plus active.",
            )

        now = datetime.now(timezone.utc)

        if (
            offer.expires_at
            and offer.expires_at < now
        ):
            offer.status = "EXPIRED"

            await db.commit()

            raise HTTPException(
                status_code=400,
                detail="Cette offre a expiré.",
            )

        # Une personne ne peut pas accepter
        # sa propre proposition.
        if offer.created_by_user_id == user_id:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Vous ne pouvez pas accepter "
                    "votre propre offre."
                ),
            )

        if user_id not in {
            offer.buyer_id,
            offer.seller_id,
        }:
            raise HTTPException(
                status_code=403,
                detail="Accès refusé.",
            )

        listing = await ListingRepository.get_by_id(
            db,
            offer.listing_id,
        )

        if not listing:
            raise HTTPException(
                status_code=404,
                detail="Annonce introuvable.",
            )

        if listing.status != "ACTIVE":
            raise HTTPException(
                status_code=400,
                detail=(
                    "Cette annonce n'est plus disponible."
                ),
            )

        offer.status = "ACCEPTED"
        offer.responded_at = now

        transaction = Transaction(
            listing_id=listing.id,
            offer_id=offer.id,

            buyer_id=offer.buyer_id,
            seller_id=offer.seller_id,

            agreed_price=offer.amount,
            currency=offer.currency,

            quantity=1,

            status="AGREED",
        )

        db.add(transaction)
        await db.flush()

        if user_id == offer.seller_id:
            recipient_id = offer.buyer_id
        else:
            recipient_id = offer.seller_id

        await NotificationService.create(
            db,
            user_id=recipient_id,
            notification_type="OFFER_ACCEPTED",
            title="Offre acceptée",
            message=(
                "Votre offre a été acceptée. "
                "Une transaction a été créée."
            ),
            data={
                "offer_id": str(offer.id),
                "transaction_id": str(transaction.id),
                "listing_id": str(listing.id),
            },
            commit=False,
        )

        history = TransactionStatusHistory(
            transaction_id=transaction.id,
            status="AGREED",
            changed_by_user_id=user_id,
            note="Offre acceptée.",
            created_at=now,
        )

        db.add(history)

        # L'annonce n'est plus proposée
        # aux autres acheteurs pendant la transaction.
        listing.status = "RESERVED"

        await db.commit()

        await db.refresh(transaction)

        return transaction

    @staticmethod
    async def reject(
        db: AsyncSession,
        offer_id: UUID,
        user_id: UUID,
    ):
        offer = await OfferRepository.get_by_id(
            db,
            offer_id,
        )

        if not offer:
            raise HTTPException(
                status_code=404,
                detail="Offre introuvable.",
            )

        if offer.status != "PENDING":
            raise HTTPException(
                status_code=400,
                detail="Cette offre n'est plus active.",
            )

        if offer.created_by_user_id == user_id:
            raise HTTPException(
                status_code=400,
                detail="Vous ne pouvez pas refuser votre propre offre.",
            )

        if user_id not in {
            offer.buyer_id,
            offer.seller_id,
        }:
            raise HTTPException(
                status_code=403,
                detail="Accès refusé.",
            )

        offer.status = "REJECTED"
        offer.responded_at = datetime.now(timezone.utc)

        if user_id == offer.seller_id:
            recipient_id = offer.buyer_id
        else:
            recipient_id = offer.seller_id

        await NotificationService.create(
            db,
            user_id=recipient_id,
            notification_type="OFFER_REJECTED",
            title="Offre refusée",
            message=(
                "Votre proposition "
                "n'a pas été acceptée."
            ),
            data={
                "offer_id": str(offer.id),
                "listing_id": str(offer.listing_id),
            },
            commit=False,
        )

        await db.commit()
        await db.refresh(offer)

        return offer

        