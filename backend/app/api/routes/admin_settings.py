from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_admin
from app.core.database import get_db
from app.repositories.settings_repository import SettingsRepository
from app.schemas.settings import (
    MarketplaceSettingsResponse,
    MarketplaceSettingsUpdate,
)
from app.services.settings_service import SettingsService


router = APIRouter(
    prefix="/admin/settings",
    tags=["Admin - Settings"],
)


@router.get(
    "",
    response_model=MarketplaceSettingsResponse,
)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    return await SettingsRepository.get(db)


@router.patch(
    "",
    response_model=MarketplaceSettingsResponse,
)
async def update_settings(
    data: MarketplaceSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    return await SettingsService.update(
        db,
        admin.id,
        data,
    )