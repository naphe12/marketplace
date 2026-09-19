from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.settings import MarketplaceSettings


class SettingsRepository:

    @staticmethod
    async def get(
        db: AsyncSession,
    ) -> MarketplaceSettings:

        result = await db.execute(
            select(MarketplaceSettings)
            .where(
                MarketplaceSettings.setting_key
                == "GLOBAL"
            )
        )

        settings = result.scalar_one_or_none()

        if settings:
            return settings

        settings = MarketplaceSettings(
            setting_key="GLOBAL",
            listing_payment_enabled=False,
            free_listing_duration_days=30,
        )

        db.add(settings)

        await db.commit()
        await db.refresh(settings)

        return settings