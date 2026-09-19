from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.administrative_area import AdministrativeArea


class LocationRepository:

    @staticmethod
    async def list_areas(
        db: AsyncSession,
        *,
        parent_id: UUID | None = None,
        area_type: str | None = None,
    ) -> list[AdministrativeArea]:

        query = (
            select(AdministrativeArea)
            .where(
                AdministrativeArea.active.is_(True)
            )
        )

        if parent_id is not None:
            query = query.where(
                AdministrativeArea.parent_id
                == parent_id
            )

        if area_type is not None:
            query = query.where(
                AdministrativeArea.area_type
                == area_type.upper()
            )

        query = query.order_by(
            AdministrativeArea.name.asc()
        )

        result = await db.execute(query)

        return list(
            result.scalars().all()
        )


    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        area_id: UUID,
    ) -> AdministrativeArea | None:

        result = await db.execute(
            select(AdministrativeArea)
            .where(
                AdministrativeArea.id
                == area_id
            )
        )

        return result.scalar_one_or_none()