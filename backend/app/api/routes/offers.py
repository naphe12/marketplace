from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.repositories.offer_repository import OfferRepository
from app.schemas.offer import CounterOfferCreate, OfferCreate, OfferResponse
from app.schemas.transaction import TransactionResponse
from app.services.offer_service import OfferService
from app.models.transaction import Transaction

from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from sqlalchemy import (
    func,
    select,
    update,
)

from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.api.dependencies import (
    get_current_user,
)

from app.core.database import (
    get_db,
)

from app.models.listing import (
    Listing,
)

from app.models.offer import (
    Offer,
)

from app.models.user import (
    User,
)



router = APIRouter(tags=["Offers"])


@router.post(
    "/listings/{listing_id}/offers",
    response_model=OfferResponse,
    status_code=201,
)
async def create_offer(
    listing_id: UUID,
    data: OfferCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await OfferService.create(
        db,
        listing_id,
        current_user.id,
        data.amount,
        data.currency,
        data.message,
    )


@router.get("/offers/mine", response_model=list[OfferResponse])
async def my_offers(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await OfferRepository.get_for_user(db, current_user.id)


@router.post(
    "/offers/{offer_id}/counter",
    response_model=OfferResponse,
    status_code=201,
)
async def counter_offer(
    offer_id: UUID,
    data: CounterOfferCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await OfferService.counter(
        db,
        offer_id,
        current_user.id,
        data.amount,
        data.message,
    )


@router.post("/offers/{offer_id}/accept", response_model=TransactionResponse)
async def accept_offer(
    offer_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await OfferService.accept(db, offer_id, current_user.id)


@router.post("/offers/{offer_id}/reject", response_model=OfferResponse)
async def reject_offer(
    offer_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await OfferService.reject(db, offer_id, current_user.id)


@router.post(
    "/{offer_id}/accept",
)
async def accept_offer(
    offer_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offer = await db.scalar(
        select(Offer).where(
            Offer.id == offer_id,
            Offer.seller_id == current_user.id,
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
            detail="Cette offre a déjà été traitée.",
        )

    listing = await db.get(
        Listing,
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
            "transaction_id":
                existing_transaction.id,
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
        listing_id=listing.id,
        offer_id=offer.id,
        buyer_id=offer.buyer_id,
        seller_id=offer.seller_id,
        amount=offer.amount,
        currency=offer.currency,
        status="AGREED",
    )

    db.add(transaction)

    await db.commit()
    await db.refresh(transaction)

    return {
        "status": "ACCEPTED",
        "listing_status": "RESERVED",
        "transaction_id":
            transaction.id,
    }


@router.post(
    "/{offer_id}/reject",
)
async def reject_offer(
    offer_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offer = await db.scalar(
        select(Offer).where(
            Offer.id == offer_id,
            Offer.seller_id == current_user.id,
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
            detail="Cette offre a déjà été traitée.",
        )

    offer.status = "REJECTED"

    offer.responded_at = func.now()

    await db.commit()

    return {
        "status": "REJECTED",
    }
