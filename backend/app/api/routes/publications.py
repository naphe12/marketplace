from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.repositories.publication_repository import (
    PublicationRepository,
)
from app.schemas.billing import PublicationOrderResponse
from app.schemas.publication import (
    CreatePublicationOrder,
    ListingPackageResponse,
    PublicationOrderCreatedResponse,
    PublicationCreate,
)
from app.services.publication_service import (
    PublicationService,
)


router = APIRouter(
    tags=["Publications"],
)


@router.get(
    "/listing-packages",
    response_model=list[ListingPackageResponse],
)
async def get_listing_packages(
    db: AsyncSession = Depends(get_db),
):
    return await PublicationRepository.get_packages(db)


@router.post(
    "/listings/{listing_id}/publication-orders",
    response_model=PublicationOrderCreatedResponse,
    status_code=201,
)
async def create_publication_order(
    listing_id: UUID,
    payload: CreatePublicationOrder,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    publication, order = (
        await PublicationService.create_publication_order(
            db,
            listing_id,
            current_user.id,
            payload.package_id,
        )
    )

    return {
        "id": order.id,
        "amount": order.total_amount,
        "currency": order.currency,
        "duration_days": publication.duration_days,
        "status": order.status,
    }


@router.post(
    "/listings/{listing_id}/publication",
    response_model=PublicationOrderResponse,
    status_code=201,
)
async def create_publication(
    listing_id: UUID,
    data: PublicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    publication, order = (
        await PublicationService.create_paid_publication(
            db,
            listing_id,
            current_user.id,
            data.package_id,
        )
    )

    return {
        "publication": publication,
        "order": order,
    }
