from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category, CategoryAttribute


class CategoryRepository:

    @staticmethod
    async def get_all(
        db: AsyncSession,
    ) -> list[Category]:

        result = await db.execute(
            select(Category)
            .where(Category.active.is_(True))
            .order_by(
                Category.sort_order,
                Category.name,
            )
        )

        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        category_id: UUID,
    ) -> Category | None:

        result = await db.execute(
            select(Category)
            .where(Category.id == category_id)
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_slug(
        db: AsyncSession,
        slug: str,
    ) -> Category | None:

        result = await db.execute(
            select(Category)
            .where(Category.slug == slug)
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def create(
        db: AsyncSession,
        category: Category,
    ) -> Category:

        db.add(category)

        await db.commit()
        await db.refresh(category)

        return category

    @staticmethod
    async def create_attribute(
        db: AsyncSession,
        attribute: CategoryAttribute,
    ) -> CategoryAttribute:

        db.add(attribute)

        await db.commit()
        await db.refresh(attribute)

        return attribute
    @staticmethod
    async def get_attributes(
        db: AsyncSession,
        category_id: UUID,
    ) -> list[CategoryAttribute]:

        result = await db.execute(
            select(CategoryAttribute)
            .where(
                CategoryAttribute.category_id == category_id
            )
            .order_by(
                CategoryAttribute.sort_order,
                CategoryAttribute.name,
            )
        )

        return list(result.scalars().all())