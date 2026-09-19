from app.schemas.listing import ListingImageUpdate
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.repositories.listing_repository import ListingRepository
from app.schemas.listing import (
    ListingAttributeValueCreate,
    ListingAttributeValueResponse,
    ListingCreate,
    ListingDetailResponse,
    ListingImageCreate,
    ListingImageResponse,
    ListingResponse,
    ListingUpdate,
)
from app.services.listing_service import ListingService

from decimal import Decimal

from app.schemas.listing import (
    ListingSearchResponse,
)


router = APIRouter(
    prefix="/listings",
    tags=["Listings"],
)


@router.get(
    "/mine",
    response_model=list[ListingResponse],
)
async def my_listings(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await ListingRepository.get_by_seller(
        db,
        current_user.id,
    )


@router.get(
    "/mine/{listing_id}",
    response_model=ListingDetailResponse,
)
async def my_listing_detail(
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await ListingService.get_owned(
        db,
        listing_id,
        current_user.id,
    )


@router.post(
    "",
    response_model=ListingResponse,
    status_code=201,
)
async def create_listing(
    data: ListingCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await ListingService.create(
        db,
        current_user.id,
        data,
    )


@router.patch(
    "/{listing_id}",
    response_model=ListingResponse,
)
async def update_listing(
    listing_id: UUID,
    data: ListingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await ListingService.update(
        db,
        listing_id,
        current_user.id,
        data,
    )


@router.post(
    "/{listing_id}/images",
    response_model=ListingImageResponse,
    status_code=201,
)
async def add_listing_image(
    listing_id: UUID,
    data: ListingImageCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await ListingService.add_image(
        db,
        listing_id,
        current_user.id,
        data,
    )


@router.post(
    "/{listing_id}/attributes",
    response_model=ListingAttributeValueResponse,
    status_code=201,
)
async def add_listing_attribute(
    listing_id: UUID,
    data: ListingAttributeValueCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await ListingService.add_attribute_value(
        db,
        listing_id,
        current_user.id,
        data,
    )

@router.post(
    "/{listing_id}/publish",
)
async def publish_listing(
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await ListingService.publish(
        db,
        listing_id,
        current_user.id,
    )

@router.get(
    "",
    response_model=ListingSearchResponse,
)
async def search_listings(
    q: str | None = None,

    category_id: UUID | None = None,

    administrative_area_id: UUID | None = None,

    seller_id: UUID | None = None,

    price_min: Decimal | None = Query(
        default=None,
        ge=0,
    ),

    price_max: Decimal | None = Query(
        default=None,
        ge=0,
    ),

    condition: str | None = None,

    price_type: str | None = None,

    allow_offers: bool | None = None,

    sort: str = Query(
        default="newest",
        pattern=(
            "^(newest|oldest|"
            "price_asc|price_desc)$"
        ),
    ),

    offset: int = Query(
        default=0,
        ge=0,
    ),

    limit: int = Query(
        default=20,
        ge=1,
        le=100,
    ),

    db: AsyncSession = Depends(get_db),
):
    listings, total = (
        await ListingRepository.search(
            db,

            q=q,

            category_id=category_id,

            administrative_area_id=(
                administrative_area_id
            ),

            seller_id=seller_id,

            price_min=price_min,
            price_max=price_max,

            condition=condition,
            price_type=price_type,

            allow_offers=allow_offers,

            sort=sort,

            offset=offset,
            limit=limit,
        )
    )

    return {
        "items": listings,

        "total": total,

        "offset": offset,
        "limit": limit,

        "has_more": (
            offset + len(listings)
            < total
        ),
    }

@router.patch("/{listing_id}/images/{image_id}", response_model=ListingImageResponse)
async def update_listing_image(
    listing_id: UUID, image_id: UUID, data: ListingImageUpdate,
    db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user),
):
    return await ListingService.update_image(db, listing_id, image_id, current_user.id, data)


@router.delete("/{listing_id}/images/{image_id}", status_code=204)
async def delete_listing_image(
    listing_id: UUID, image_id: UUID,
    db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user),
):
    await ListingService.delete_image(db, listing_id, image_id, current_user.id)
    return Response(status_code=204)
