from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation, ConversationParticipant, Message
from app.models.listing import Listing
from app.models.offer import Offer
from app.models.transaction import Transaction, generate_transaction_number
from app.models.wanted import WantedMatch, WantedOffer, WantedRequest, WantedRequestAttribute
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.listing_repository import ListingRepository
from app.schemas.wanted import WantedOfferCreate, WantedOfferUpdate, WantedRequestCreate, WantedRequestUpdate
from app.services.embedding_service import EmbeddingService
from app.services.notification_service import NotificationService
from app.services.wanted_matching import hard_constraints_pass, hybrid_match_score


class WantedService:
    
    async def _ensure_conversation_for_wanted_offer(db: AsyncSession, request: WantedRequest, offer: WantedOffer, listing: Listing) -> Conversation:
        existing = await ConversationRepository.get_for_listing_buyer(db, listing.id, request.buyer_id, offer.seller_id)
        if existing:
            return existing
        now = datetime.now(timezone.utc)
        conversation = Conversation(
            listing_id=listing.id,
            created_by_user_id=request.buyer_id,
            buyer_id=request.buyer_id,
            seller_id=offer.seller_id,
            status="ACTIVE",
            last_message_at=now,
        )
        db.add(conversation)
        await db.flush()
        db.add_all([
            ConversationParticipant(conversation_id=conversation.id, user_id=request.buyer_id),
            ConversationParticipant(conversation_id=conversation.id, user_id=offer.seller_id),
            Message(
                conversation_id=conversation.id,
                sender_id=request.buyer_id,
                message_type="TEXT",
                content=f"J'accepte votre proposition pour ma demande: {request.title}",
            ),
        ])
        return conversation

    
    async def _convert_accepted_offer(db: AsyncSession, request: WantedRequest, offer: WantedOffer):
        if not offer.listing_id:
            return None, None
        listing = await db.get(Listing, offer.listing_id)
        if not listing or listing.seller_id != offer.seller_id:
            raise HTTPException(status_code=400, detail="L'annonce proposée n'est plus disponible.")
        if listing.status != "ACTIVE":
            raise HTTPException(status_code=400, detail="L'annonce proposée n'est plus active.")

        conversation = await WantedService._ensure_conversation_for_wanted_offer(db, request, offer, listing)
        standard_offer = Offer(
            conversation_id=conversation.id,
            listing_id=listing.id,
            buyer_id=request.buyer_id,
            seller_id=offer.seller_id,
            amount=offer.amount,
            currency=offer.currency,
            status="ACCEPTED",
            responded_at=func.now(),
        )
        db.add(standard_offer)
        await db.flush()

        listing.status = "RESERVED"
        await db.execute(
            update(Offer)
            .where(Offer.listing_id == listing.id, Offer.id != standard_offer.id, Offer.status == "PENDING")
            .values(status="REJECTED", responded_at=func.now())
        )
        transaction = Transaction(
            transaction_number=generate_transaction_number(),
            listing_id=listing.id,
            offer_id=standard_offer.id,
            buyer_id=request.buyer_id,
            seller_id=offer.seller_id,
            agreed_price=offer.amount,
            currency=offer.currency,
            country_code=listing.country_code,
            status="ACCEPTED",
        )
        db.add(transaction)
        await db.flush()
        return conversation, transaction


    @staticmethod
    def _score(request: WantedRequest, listing: Listing, semantic_override: float | None = None) -> int:
        return hybrid_match_score(request, listing, semantic_override=semantic_override)

    @staticmethod
    async def create(db: AsyncSession, buyer_id: UUID, data: WantedRequestCreate) -> WantedRequest:
        if data.budget_min is not None and data.budget_max is not None and data.budget_min > data.budget_max:
            raise HTTPException(status_code=422, detail="Le budget minimum ne peut pas dépasser le budget maximum.")

        request = WantedRequest(
            buyer_id=buyer_id,
            category_id=data.category_id,
            title=data.title.strip(),
            description=data.description.strip() if data.description else None,
            budget_min=data.budget_min,
            budget_max=data.budget_max,
            currency=data.currency.upper(),
            country_code=data.country_code.upper(),
            administrative_area_id=data.administrative_area_id,
            radius_km=data.radius_km,
            condition=data.condition.upper() if data.condition else None,
            expires_at=data.expires_at,
        )
        db.add(request)
        await db.flush()

        request.attributes = [
            WantedRequestAttribute(wanted_request_id=request.id, **attribute.model_dump())
            for attribute in data.attributes
        ]
        for attribute in request.attributes:
            db.add(attribute)
        await db.flush()

        await EmbeddingService.update_wanted_embedding(db, request)
        await WantedService.refresh_matches(db, request)
        await db.commit()
        return await WantedService.get_owned(db, request.id, buyer_id)

    @staticmethod
    async def list_owned(db: AsyncSession, buyer_id: UUID) -> list[WantedRequest]:
        result = await db.execute(
            select(WantedRequest).where(WantedRequest.buyer_id == buyer_id).order_by(WantedRequest.created_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def list_seller_opportunities(db: AsyncSession, seller_id: UUID) -> list[tuple[WantedRequest, list[Listing], int]]:
        seller_listings = await ListingRepository.get_by_seller(db, seller_id, status="ACTIVE")
        if not seller_listings:
            return []

        listing_ids = [listing.id for listing in seller_listings]
        loaded_listings = await db.execute(
            select(Listing)
            .options(selectinload(Listing.images), selectinload(Listing.attribute_values))
            .where(Listing.id.in_(listing_ids))
        )
        seller_listings = list(loaded_listings.scalars().unique().all())
        countries = {listing.country_code for listing in seller_listings}
        categories = {listing.category_id for listing in seller_listings}
        result = await db.execute(
            select(WantedRequest)
            .options(selectinload(WantedRequest.attributes))
            .where(WantedRequest.status == "OPEN")
            .where(WantedRequest.country_code.in_(countries))
            .order_by(WantedRequest.created_at.desc())
            .limit(50)
        )

        opportunities = []
        for request in result.scalars().unique().all():
            if request.category_id and request.category_id not in categories:
                continue
            scored = [
                (listing, WantedService._score(request, listing))
                for listing in seller_listings
                if listing.seller_id != request.buyer_id and hard_constraints_pass(request, listing)
            ]
            scored = [(listing, score) for listing, score in scored if score >= 35]
            if scored:
                scored.sort(key=lambda item: item[1], reverse=True)
                opportunities.append((request, [listing for listing, _ in scored[:3]], scored[0][1]))

        opportunities.sort(key=lambda item: item[2], reverse=True)
        return opportunities

    @staticmethod
    async def get_owned(db: AsyncSession, request_id: UUID, buyer_id: UUID) -> WantedRequest:
        result = await db.execute(
            select(WantedRequest)
            .options(
                selectinload(WantedRequest.attributes),
                selectinload(WantedRequest.matches),
                selectinload(WantedRequest.offers),
            )
            .where(WantedRequest.id == request_id)
        )
        request = result.scalar_one_or_none()
        if not request:
            raise HTTPException(status_code=404, detail="Demande introuvable.")
        if request.buyer_id != buyer_id:
            raise HTTPException(status_code=403, detail="Cette demande ne vous appartient pas.")
        return request

    @staticmethod
    async def get_open(db: AsyncSession, request_id: UUID) -> WantedRequest:
        result = await db.execute(
            select(WantedRequest).options(selectinload(WantedRequest.attributes)).where(WantedRequest.id == request_id)
        )
        request = result.scalar_one_or_none()
        if not request:
            raise HTTPException(status_code=404, detail="Demande introuvable.")
        if request.status != "OPEN":
            raise HTTPException(status_code=400, detail="Cette demande n'est plus ouverte.")
        return request

    @staticmethod
    async def update(db: AsyncSession, request_id: UUID, buyer_id: UUID, data: WantedRequestUpdate) -> WantedRequest:
        request = await WantedService.get_owned(db, request_id, buyer_id)
        values = data.model_dump(exclude_unset=True)
        if "status" in values and values["status"] is not None:
            status = values["status"].upper()
            if status not in {"OPEN", "PAUSED", "CLOSED"}:
                raise HTTPException(status_code=422, detail="Statut de demande invalide.")
            request.status = status
        if "expires_at" in values:
            request.expires_at = values["expires_at"]
        await db.commit()
        return await WantedService.get_owned(db, request_id, buyer_id)

    @staticmethod
    async def create_offer(db: AsyncSession, request_id: UUID, seller_id: UUID, data: WantedOfferCreate) -> WantedOffer:
        request = await WantedService.get_open(db, request_id)
        if request.buyer_id == seller_id:
            raise HTTPException(status_code=400, detail="Vous ne pouvez pas répondre à votre propre demande.")

        if data.listing_id:
            listing = await ListingRepository.get_by_id(db, data.listing_id)
            if not listing or listing.seller_id != seller_id:
                raise HTTPException(status_code=404, detail="Annonce vendeur introuvable.")
            await EmbeddingService.update_listing_embedding(db, listing)
        offer = WantedOffer(
            wanted_request_id=request.id,
            seller_id=seller_id,
            listing_id=data.listing_id,
            amount=data.amount,
            currency=data.currency.upper(),
            message=data.message.strip() if data.message else None,
        )
        db.add(offer)
        await db.flush()
        await NotificationService.create(
            db,
            user_id=request.buyer_id,
            notification_type="WANTED_OFFER_RECEIVED",
            title="Nouvelle proposition",
            message=f"Un vendeur a répondu à votre demande: {request.title}",
            data={"wanted_request_id": str(request.id), "wanted_offer_id": str(offer.id)},
            deduplication_key=f"wanted-offer:{request.id}:{seller_id}:{data.listing_id or 'free'}",
            commit=False,
        )
        await db.commit()
        await db.refresh(offer)
        return offer

    @staticmethod
    async def update_offer(db: AsyncSession, request_id: UUID, offer_id: UUID, buyer_id: UUID, data: WantedOfferUpdate) -> WantedRequest:
        request = await WantedService.get_owned(db, request_id, buyer_id)
        offer = next((item for item in request.offers if item.id == offer_id), None)
        if not offer:
            raise HTTPException(status_code=404, detail="Proposition introuvable.")
        if offer.status != "PENDING":
            raise HTTPException(status_code=400, detail="Cette proposition a déjà été traitée.")
        status = data.status.upper()
        if status not in {"ACCEPTED", "REJECTED"}:
            raise HTTPException(status_code=422, detail="Statut de proposition invalide.")
        offer.status = status
        offer.responded_at = datetime.now(timezone.utc)
        if status == "ACCEPTED":
            request.status = "CLOSED"
            conversation, transaction = await WantedService._convert_accepted_offer(db, request, offer)
            await db.execute(
                update(WantedOffer)
                .where(
                    WantedOffer.wanted_request_id == request.id,
                    WantedOffer.id != offer.id,
                    WantedOffer.status == "PENDING",
                )
                .values(status="REJECTED", responded_at=datetime.now(timezone.utc))
            )
        await NotificationService.create(
            db,
            user_id=offer.seller_id,
            notification_type="WANTED_OFFER_UPDATED",
            title="Réponse à votre proposition",
            message=f"Votre proposition pour {request.title} a été {'acceptée' if status == 'ACCEPTED' else 'refusée'}.",
            data={"wanted_request_id": str(request.id), "wanted_offer_id": str(offer.id), "status": status, "conversation_id": str(conversation.id) if status == "ACCEPTED" and conversation else None, "transaction_id": str(transaction.id) if status == "ACCEPTED" and transaction else None},
            commit=False,
        )
        await db.commit()
        return await WantedService.get_owned(db, request_id, buyer_id)

    @staticmethod
    async def _fallback_candidates(db: AsyncSession, request: WantedRequest) -> list[Listing]:
        filters = [
            Listing.status == "ACTIVE",
            Listing.deleted_at.is_(None),
            Listing.country_code == request.country_code,
        ]
        if request.category_id:
            filters.append(Listing.category_id == request.category_id)
        if request.budget_max is not None:
            filters.append(or_(Listing.price.is_(None), Listing.price <= request.budget_max))
        if request.condition:
            filters.append(or_(Listing.condition.is_(None), Listing.condition == request.condition.upper()))
        result = await db.execute(
            select(Listing)
            .options(selectinload(Listing.images), selectinload(Listing.attribute_values))
            .where(*filters)
            .order_by(Listing.created_at.desc())
            .limit(100)
        )
        return list(result.scalars().unique().all())

    @staticmethod
    async def refresh_matches(db: AsyncSession, request: WantedRequest) -> list[WantedMatch]:
        await db.execute(delete(WantedMatch).where(WantedMatch.wanted_request_id == request.id))
        await EmbeddingService.update_wanted_embedding(db, request)

        semantic_candidates = await EmbeddingService.semantic_listing_candidates(db, request, limit=100)
        semantic_by_id = {listing_id: score for listing_id, score in semantic_candidates}
        if semantic_by_id:
            result = await db.execute(
                select(Listing)
                .options(selectinload(Listing.images), selectinload(Listing.attribute_values))
                .where(Listing.id.in_(semantic_by_id.keys()))
            )
            listings = list(result.scalars().unique().all())
        else:
            listings = await WantedService._fallback_candidates(db, request)
            for listing in listings:
                await EmbeddingService.update_listing_embedding(db, listing)

        scored = [
            (listing, WantedService._score(request, listing, semantic_override=semantic_by_id.get(listing.id)))
            for listing in listings
            if listing.seller_id != request.buyer_id and hard_constraints_pass(request, listing)
        ]
        scored = [(listing, score) for listing, score in scored if score >= 35]
        scored.sort(key=lambda item: item[1], reverse=True)

        matches = [
            WantedMatch(wanted_request_id=request.id, listing_id=listing.id, match_score=score)
            for listing, score in scored[:20]
        ]
        seller_ids = {listing.seller_id for listing, _ in scored[:20]}
        for seller_id in seller_ids:
            await NotificationService.create(
                db,
                user_id=seller_id,
                notification_type="WANTED_REQUEST_MATCH",
                title="Nouvelle demande acheteur",
                message=f"Une demande correspond à vos annonces: {request.title}",
                data={"wanted_request_id": str(request.id)},
                deduplication_key=f"wanted-match:{request.id}:{seller_id}",
                commit=False,
            )
        for match in matches:
            db.add(match)
        await db.flush()
        return matches
