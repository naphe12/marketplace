from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.fraud.engine import fraud_engine
from app.models.conversation import Conversation
from app.models.listing import Listing
from app.models.offer import Offer
from app.models.user import User
from app.models.transaction import (
    Transaction,
    generate_transaction_number,
)

class OfferService:
    @staticmethod
    async def create_for_conversation(
        db: AsyncSession,
        conversation: Conversation,
        buyer: User,
        amount,
    ) -> dict:
        if conversation.buyer_id != buyer.id:
            raise HTTPException(
                status_code=403,
                detail="Seul l'acheteur peut faire une offre.",
            )

        listing = await db.get(
            Listing,
            conversation.listing_id,
        )

        if not listing:
            raise HTTPException(
                status_code=404,
                detail="Annonce introuvable.",
            )

        if not listing.allow_offers:
            raise HTTPException(
                status_code=400,
                detail="Le vendeur n'accepte pas les offres.",
            )

        if listing.status != "ACTIVE":
            raise HTTPException(
                status_code=400,
                detail="Cette annonce n'est plus disponible.",
            )

        offer = Offer(
            conversation_id=conversation.id,
            listing_id=listing.id,
            buyer_id=conversation.buyer_id,
            seller_id=conversation.seller_id,
            amount=amount,
            currency=listing.currency,
            status="PENDING",
        )

        db.add(offer)
        await db.flush()

        assessment = await fraud_engine.assess_offer(
            db=db,
            offer=offer,
            user=buyer,
            listing=listing,
        )

        await fraud_engine.save_assessment(
            db=db,
            assessment=assessment,
            user_id=buyer.id,
            listing_id=listing.id,
            offer_id=offer.id,
        )

        await db.commit()
        await db.refresh(offer)

        return {
            "id": offer.id,
            "conversation_id": offer.conversation_id,
            "listing_id": offer.listing_id,
            "buyer_id": offer.buyer_id,
            "seller_id": offer.seller_id,
            "status": offer.status,
            "amount": offer.amount,
            "currency": offer.currency,
            "responded_at": offer.responded_at,
            "created_at": offer.created_at,
            "updated_at": offer.updated_at,
            "risk": {
                "score": assessment.risk_score,
                "level": assessment.risk_level,
            },
        }

    @staticmethod
    async def accept(
        db: AsyncSession,
        offer_id: UUID,
        seller_id: UUID,
    ) -> dict:
        offer = await db.scalar(
            select(Offer).where(
                Offer.id == offer_id,
                Offer.seller_id == seller_id,
            )
        )

        if not offer:
            raise HTTPException(
                status_code=404,
                detail="Offre introuvable.",
            )

        if offer.status != "PENDING":
            raise HTTPException(
                status_code=400,
                detail="Cette offre a deja ete traitee.",
            )

        listing = await db.get(
            Listing,
            offer.listing_id,
        )

        if not listing or listing.status != "ACTIVE":
            raise HTTPException(
                status_code=400,
                detail="L'annonce n'est plus disponible.",
            )

        existing_transaction = await db.scalar(
            select(Transaction).where(
                Transaction.offer_id == offer.id,
            )
        )

        if existing_transaction:
            return {
                "status": offer.status,
                "listing_status": listing.status,
                "transaction_id": existing_transaction.id,
            }

        now = func.now()

        offer.status = "ACCEPTED"
        offer.responded_at = now
        listing.status = "RESERVED"

        await db.execute(
            update(Offer)
            .where(
                Offer.listing_id == offer.listing_id,
                Offer.id != offer.id,
                Offer.status == "PENDING",
            )
            .values(
                status="REJECTED",
                responded_at=now,
            )
        )

        transaction = Transaction(
            transaction_number=generate_transaction_number(),
            listing_id=listing.id,
            offer_id=offer.id,
            buyer_id=offer.buyer_id,
            seller_id=offer.seller_id,
            agreed_price=offer.amount,
            currency=offer.currency,
            status="ACCEPTED",
        )

        db.add(transaction)
        await db.commit()
        await db.refresh(transaction)

        return {
            "status": "ACCEPTED",
            "listing_status": "RESERVED",
            "transaction_id": transaction.id,
        }

    @staticmethod
    async def reject(
        db: AsyncSession,
        offer_id: UUID,
        seller_id: UUID,
    ) -> dict:
        offer = await db.scalar(
            select(Offer).where(
                Offer.id == offer_id,
                Offer.seller_id == seller_id,
            )
        )

        if not offer:
            raise HTTPException(
                status_code=404,
                detail="Offre introuvable.",
            )

        if offer.status != "PENDING":
            raise HTTPException(
                status_code=400,
                detail="Cette offre a deja ete traitee.",
            )

        offer.status = "REJECTED"
        offer.responded_at = func.now()

        await db.commit()

        return {
            "status": "REJECTED",
            "listing_status": None,
            "transaction_id": None,
        }
