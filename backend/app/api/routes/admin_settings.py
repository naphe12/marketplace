from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_admin
from app.core.database import get_db
from app.models.audit import AuditLog
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
    settings = await SettingsService.update(
        db,
        admin.id,
        data,
    )

    db.add(
        AuditLog(
            actor_user_id=admin.id,
            action="SETTINGS_PUBLICATION_UPDATED",
            target_type="SETTINGS",
            metadata_json=data.model_dump(exclude_unset=True),
        )
    )

    await db.commit()

    return settings
