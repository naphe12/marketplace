"""Run periodically with: python -m app.jobs.listing_expiry."""
import asyncio
from datetime import datetime, time, timedelta, timezone

from sqlalchemy import update, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, engine
from app.models.listing import Listing
from app.services.notification_service import NotificationService


def expiry_notice(expires_at: datetime, now: datetime):
    if expires_at <= now:
        return "LISTING_EXPIRED", "Annonce expirée", "Votre annonce a expiré."
    days = (expires_at.date() - now.date()).days
    if days == 3:
        return "LISTING_EXPIRY_3D", "Expiration de votre annonce", "Votre annonce expire dans 3 jours."
    if days == 1:
        return "LISTING_EXPIRY_1D", "Expiration de votre annonce", "Votre annonce expire demain."
    return None


async def process_expirations(db: AsyncSession, now: datetime | None = None):
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        raise ValueError("now doit inclure un fuseau horaire")
    now = now.astimezone(timezone.utc)
    limit = datetime.combine(now.date() + timedelta(days=4), time.min, timezone.utc)
    result = await db.execute(
        select(Listing)
        .where(
            Listing.status == "ACTIVE",
            Listing.deleted_at.is_(None),
            Listing.expires_at < limit,
        )
        .with_for_update(skip_locked=True)
    )
    for listing in result.scalars():
        expires_at = listing.expires_at.astimezone(timezone.utc)
        notice = expiry_notice(expires_at, now)
        if notice is None:
            continue
        notification_type, title, message = notice
        if expires_at <= now:
            listing.status = "EXPIRED"
        await NotificationService.create(
            db,
            user_id=listing.seller_id,
            notification_type=notification_type,
            title=title,
            message=message,
            data={"listing_id": str(listing.id), "expires_at": expires_at.isoformat()},
            deduplication_key=f"{notification_type}:{listing.id}:{expires_at.isoformat()}",
            commit=False,
        )
    await db.commit()


async def expire_active_listings(db: AsyncSession):
    result = await db.execute(
        update(Listing)
        .where(
            Listing.status == "ACTIVE",
            Listing.expires_at.is_not(None),
            Listing.expires_at <= datetime.now(timezone.utc),
        )
        .values(status="EXPIRED")
    )
    await db.commit()
    return result.rowcount or 0


async def main():
    try:
        async with AsyncSessionLocal() as db:
            await process_expirations(db)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
