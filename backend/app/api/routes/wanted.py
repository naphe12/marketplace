from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.listing import Listing
from app.schemas.wanted import (
    WantedMatchResponse,
    WantedOfferCreate,
    WantedOfferResponse,
    WantedOfferUpdate,
    WantedRequestAttributeResponse,
    WantedRequestCreate,
    WantedRequestDetailResponse,
    WantedRequestResponse,
    WantedRequestUpdate,
    WantedSellerOpportunityResponse,
)
from app.services.wanted_service import WantedService


router = APIRouter(prefix="/wanted-requests", tags=["Wanted requests"])


async def _load_listings(db: AsyncSession, listing_ids: list[UUID]) -> dict[UUID, Listing]:
    if not listing_ids:
        return {}
    result = await db.execute(
        select(Listing).options(selectinload(Listing.images)).where(Listing.id.in_(listing_ids))
    )
    return {listing.id: listing for listing in result.scalars().all()}


async def _detail_response(db: AsyncSession, request) -> WantedRequestDetailResponse:
    listing_ids = [match.listing_id for match in request.matches]
    listing_ids.extend(offer.listing_id for offer in request.offers if offer.listing_id)
    listings_by_id = await _load_listings(db, listing_ids)

    return WantedRequestDetailResponse(
        **WantedRequestResponse.model_validate(request).model_dump(),
        attributes=[WantedRequestAttributeResponse.model_validate(attribute) for attribute in request.attributes],
        matches=[
            WantedMatchResponse(
                **WantedMatchResponse.model_validate(match).model_dump(),
                listing=listings_by_id.get(match.listing_id),
            )
            for match in sorted(request.matches, key=lambda item: item.match_score, reverse=True)
        ],
        offers=[
            WantedOfferResponse(
                **WantedOfferResponse.model_validate(offer).model_dump(),
                listing=listings_by_id.get(offer.listing_id) if offer.listing_id else None,
            )
            for offer in sorted(request.offers, key=lambda item: item.created_at, reverse=True)
        ],
    )


@router.get("", response_model=list[WantedRequestResponse])
async def list_wanted_requests(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    return await WantedService.list_owned(db, current_user.id)


@router.post("", response_model=WantedRequestDetailResponse, status_code=201)
async def create_wanted_request(
    data: WantedRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    request = await WantedService.create(db, current_user.id, data)
    return await _detail_response(db, request)


@router.get("/seller/opportunities", response_model=list[WantedSellerOpportunityResponse])
async def list_seller_opportunities(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    opportunities = await WantedService.list_seller_opportunities(db, current_user.id)
    return [
        WantedSellerOpportunityResponse(
            request=WantedRequestResponse.model_validate(request),
            seller_listings=listings,
            best_score=score,
        )
        for request, listings, score in opportunities
    ]


@router.get("/{request_id}", response_model=WantedRequestDetailResponse)
async def get_wanted_request(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    request = await WantedService.get_owned(db, request_id, current_user.id)
    return await _detail_response(db, request)


@router.patch("/{request_id}", response_model=WantedRequestDetailResponse)
async def update_wanted_request(
    request_id: UUID,
    data: WantedRequestUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    request = await WantedService.update(db, request_id, current_user.id, data)
    return await _detail_response(db, request)


@router.post("/{request_id}/refresh", response_model=WantedRequestDetailResponse)
async def refresh_wanted_matches(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    request = await WantedService.get_owned(db, request_id, current_user.id)
    await WantedService.refresh_matches(db, request)
    await db.commit()
    request = await WantedService.get_owned(db, request_id, current_user.id)
    return await _detail_response(db, request)


@router.post("/{request_id}/offers", response_model=WantedOfferResponse, status_code=201)
async def create_wanted_offer(
    request_id: UUID,
    data: WantedOfferCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    offer = await WantedService.create_offer(db, request_id, current_user.id, data)
    listing = None
    if offer.listing_id:
        listing = (await _load_listings(db, [offer.listing_id])).get(offer.listing_id)
    return WantedOfferResponse(**WantedOfferResponse.model_validate(offer).model_dump(), listing=listing)


@router.patch("/{request_id}/offers/{offer_id}", response_model=WantedRequestDetailResponse)
async def update_wanted_offer(
    request_id: UUID,
    offer_id: UUID,
    data: WantedOfferUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    request = await WantedService.update_offer(db, request_id, offer_id, current_user.id, data)
    return await _detail_response(db, request)
