from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category, CategoryAttribute
from app.repositories.category_repository import CategoryRepository
from app.schemas.category import (
    CategoryAttributeCreate,
    CategoryCreate,
)


class CategoryService:

    @staticmethod
    async def create(
        db: AsyncSession,
        data: CategoryCreate,
    ) -> Category:

        existing = await CategoryRepository.get_by_slug(
            db,
            data.slug,
        )

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cette catégorie existe déjà.",
            )

        if data.parent_id:
            parent = await CategoryRepository.get_by_id(
                db,
                data.parent_id,
            )

            if not parent:
                raise HTTPException(
                    status_code=404,
                    detail="Catégorie parent introuvable.",
                )

        category = Category(
            name=data.name,
            slug=data.slug.lower(),
            description=data.description,
            icon=data.icon,
            parent_id=data.parent_id,
            sort_order=data.sort_order,
        )

        return await CategoryRepository.create(
            db,
            category,
        )

    @staticmethod
    async def create_attribute(
        db: AsyncSession,
        category_id: UUID,
        data: CategoryAttributeCreate,
    ) -> CategoryAttribute:

        category = await CategoryRepository.get_by_id(
            db,
            category_id,
        )

        if not category:
            raise HTTPException(
                status_code=404,
                detail="Catégorie introuvable.",
            )

        attribute = CategoryAttribute(
            category_id=category_id,
            name=data.name,
            code=data.code.lower(),
            data_type=data.data_type.upper(),
            required=data.required,
            filterable=data.filterable,
            searchable=data.searchable,
            options=data.options,
            sort_order=data.sort_order,
        )

        return await CategoryRepository.create_attribute(
            db,
            attribute,
        )