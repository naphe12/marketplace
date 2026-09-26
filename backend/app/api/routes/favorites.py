from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.repositories.favorite_repository import (
    FavoriteRepository,
)
from app.schemas.favorite import (
    FavoriteFolderCreate,
    FavoriteFolderResponse,
    FavoriteFolderUpdate,
    FavoriteItemResponse,
    FavoriteMoveRequest,
)
from app.schemas.listing import (
    ListingCardResponse,
)
from app.services.favorite_service import (
    FavoriteService,
)


router = APIRouter(
    tags=["Favorites"],
)


@router.get(
    "/favorites",
    response_model=list[ListingCardResponse],
)
async def my_favorites(
    folder_id: UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await FavoriteRepository.get_for_user(
        db,
        current_user.id,
        folder_id=folder_id,
    )


@router.get(
    "/favorites/detailed",
    response_model=list[FavoriteItemResponse],
)
async def my_detailed_favorites(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    rows = await FavoriteRepository.get_detailed_for_user(
        db,
        current_user.id,
    )

    return [
        {
            "listing": listing,
            "folder_id": favorite.folder_id,
            "favorited_at": favorite.created_at,
        }
        for favorite, listing in rows
    ]


@router.post(
    "/favorites/{listing_id}",
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


@router.patch(
    "/favorites/{listing_id}/folder",
)
async def move_favorite(
    listing_id: UUID,
    payload: FavoriteMoveRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await FavoriteService.move(
        db,
        current_user.id,
        listing_id,
        payload.folder_id,
    )


@router.delete(
    "/favorites/{listing_id}",
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


@router.get(
    "/favorite-folders",
    response_model=list[FavoriteFolderResponse],
)
async def my_favorite_folders(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await FavoriteRepository.get_folders(db, current_user.id)


@router.post(
    "/favorite-folders",
    response_model=FavoriteFolderResponse,
    status_code=201,
)
async def create_favorite_folder(
    payload: FavoriteFolderCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await FavoriteService.create_folder(
        db,
        current_user.id,
        payload.name,
    )


@router.patch(
    "/favorite-folders/{folder_id}",
    response_model=FavoriteFolderResponse,
)
async def update_favorite_folder(
    folder_id: UUID,
    payload: FavoriteFolderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if payload.name is None:
        folder = await FavoriteRepository.get_folder(db, current_user.id, folder_id)
        return folder

    return await FavoriteService.update_folder(
        db,
        current_user.id,
        folder_id,
        payload.name,
    )


@router.delete(
    "/favorite-folders/{folder_id}",
)
async def delete_favorite_folder(
    folder_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await FavoriteService.delete_folder(
        db,
        current_user.id,
        folder_id,
    )
