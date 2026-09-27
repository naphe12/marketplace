from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.publication import (
    ListingPackage,
    ListingPublication,
)


class PublicationRepository:

    @staticmethod
    async def get_packages(
        db: AsyncSession,
        country_code: str | None = None,
    ) -> list[ListingPackage]:

        query = (
            select(ListingPackage)
            .where(ListingPackage.active.is_(True))
        )

        if country_code:
            query = query.where(ListingPackage.country_code == country_code.upper())

        result = await db.execute(
            query
            .order_by(
                ListingPackage.sort_order,
                ListingPackage.duration_days,
            )
        )

        return list(result.scalars().all())

    @staticmethod
    async def get_package(
        db: AsyncSession,
        package_id: UUID,
        country_code: str | None = None,
    ) -> ListingPackage | None:

        query = (
            select(ListingPackage)
            .where(
                ListingPackage.id == package_id,
                ListingPackage.active.is_(True),
            )
        )

        if country_code:
            query = query.where(ListingPackage.country_code == country_code.upper())

        result = await db.execute(query)

        return result.scalar_one_or_none()

    @staticmethod
    async def get_publication(
        db: AsyncSession,
        publication_id: UUID,
    ) -> ListingPublication | None:

        result = await db.execute(
            select(ListingPublication)
            .where(
                ListingPublication.id
                == publication_id
            )
        )

        return result.scalar_one_or_none()