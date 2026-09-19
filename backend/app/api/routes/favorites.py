from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.repositories.favorite_repository import (
    FavoriteRepository,
)
from app.schemas.listing import (
    ListingCardResponse,
)
from app.services.favorite_service import (
    FavoriteService,
)


router = APIRouter(
    prefix="/favorites",
    tags=["Favorites"],
)


@router.get(
    "",
    response_model=list[ListingCardResponse],
)
async def my_favorites(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await FavoriteRepository.get_for_user(
        db,
        current_user.id,
    )


@router.post(
    "/{listing_id}",
)
async def add_favorite(
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await FavoriteService.add(
        db,
        current_user.id,
        listing_id,
    )


@router.delete(
    "/{listing_id}",
)
async def remove_favorite(
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await FavoriteService.remove(
        db,
        current_user.id,
        listing_id,
    )