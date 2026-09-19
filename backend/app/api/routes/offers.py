from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.repositories.offer_repository import OfferRepository
from app.schemas.offer import CounterOfferCreate, OfferCreate, OfferResponse
from app.schemas.transaction import TransactionResponse
from app.services.offer_service import OfferService


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
