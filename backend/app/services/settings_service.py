from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.settings_repository import (
    SettingsRepository,
)
from app.schemas.settings import MarketplaceSettingsUpdate


class SettingsService:

    @staticmethod
    async def update(
        db: AsyncSession,
        admin_user_id,
        data: MarketplaceSettingsUpdate,
    ):
        settings = await SettingsRepository.get(db)

        values = data.model_dump(
            exclude_unset=True
        )

        for key, value in values.items():
            setattr(
                settings,
                key,
                value,
            )

        settings.updated_by_user_id = admin_user_id

        await db.commit()
        await db.refresh(settings)

        return settings