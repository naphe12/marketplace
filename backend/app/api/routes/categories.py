from http.client import HTTPException
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.repositories.category_repository import CategoryRepository
from app.schemas.category import (
    CategoryAttributeCreate,
    CategoryAttributeResponse,
    CategoryCreate,
    CategoryResponse,
)
from app.services.category_service import CategoryService


router = APIRouter(
    prefix="/categories",
    tags=["Categories"],
)


@router.get(
    "",
    response_model=list[CategoryResponse],
)
async def list_categories(
    db: AsyncSession = Depends(get_db),
):
    return await CategoryRepository.get_all(db)


@router.get(
    "/{category_id}",
    response_model=CategoryResponse,
)
async def get_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    category = await CategoryRepository.get_by_id(
        db,
        category_id,
    )

    if not category:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=404,
            detail="Catégorie introuvable.",
        )

    return category


@router.post(
    "",
    response_model=CategoryResponse,
    status_code=201,
)
async def create_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await CategoryService.create(
        db,
        data,
    )


@router.post(
    "/{category_id}/attributes",
    response_model=CategoryAttributeResponse,
    status_code=201,
)
async def create_attribute(
    category_id: UUID,
    data: CategoryAttributeCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await CategoryService.create_attribute(
        db,
        category_id,
        data,
    )

@router.get(
    "/{category_id}/attributes",
    response_model=list[CategoryAttributeResponse],
)
async def get_category_attributes(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    category = await CategoryRepository.get_by_id(
        db,
        category_id,
    )

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Catégorie introuvable.",
        )

    return await CategoryRepository.get_attributes(
        db,
        category_id,
    )