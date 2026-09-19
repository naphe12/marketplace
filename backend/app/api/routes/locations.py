from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    Query,
)

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

from app.repositories.location_repository import (
    LocationRepository,
)

from app.schemas.location import (
    AdministrativeAreaResponse,
)


router = APIRouter(
    prefix="/administrative-areas",
    tags=["Locations"],
)


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

    db: AsyncSession = Depends(get_db),
):
    return await LocationRepository.list_areas(
        db,
        parent_id=parent_id,
        area_type=area_type,
    )