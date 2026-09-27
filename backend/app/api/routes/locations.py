from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    Query,
)

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.country import Country

from app.repositories.location_repository import (
    LocationRepository,
)

from app.schemas.location import (
    AdministrativeAreaResponse,
    CountryResponse,
)


router = APIRouter(
    prefix="/administrative-areas",
    tags=["Locations"],
)


@router.get("/countries", response_model=list[CountryResponse])
async def list_active_countries(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Country)
        .where(Country.active.is_(True))
        .order_by(Country.sort_order.asc(), Country.name.asc())
    )
    return list(result.scalars().all())


@router.get(
    "",
    response_model=list[
        AdministrativeAreaResponse
    ],
)
async def list_administrative_areas(
    parent_id: UUID | None = None,

    area_type: str | None = Query(
        default=None,
    ),

    country_code: str | None = Query(
        default=None,
        min_length=2,
        max_length=2,
    ),

    db: AsyncSession = Depends(get_db),
):
    return await LocationRepository.list_areas(
        db,
        parent_id=parent_id,
        area_type=area_type,
        country_code=country_code,
    )
