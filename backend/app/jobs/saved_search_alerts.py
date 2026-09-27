"""Run periodically with: python -m app.jobs.saved_search_alerts."""
import argparse
import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, engine
from app.models.saved_search import SavedSearch
from app.repositories.listing_repository import ListingRepository
from app.services.notification_service import NotificationService


def _uuid_param(params: dict, key: str) -> UUID | None:
    value = params.get(key)
    if not value:
        return None
    try:
        return UUID(str(value))
    except ValueError:
        return None


def _decimal_param(params: dict, key: str) -> Decimal | None:
    value = params.get(key)
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None


def _bool_param(params: dict, key: str) -> bool | None:
    value = params.get(key)
    if value in (None, ""):
        return None
    if isinstance(value, bool):
        return value
    normalized = str(value).strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return None


def _str_param(params: dict, key: str) -> str | None:
    value = params.get(key)
    if value in (None, ""):
        return None
    return str(value)


async def process_saved_search_alerts(
    db: AsyncSession,
    *,
    since: datetime | None = None,
    lookback_minutes: int = 60,
    limit_per_search: int = 10,
) -> int:
    now = datetime.now(timezone.utc)

    if since is None:
        since = now - timedelta(minutes=lookback_minutes)

    if since.tzinfo is None:
        raise ValueError("since doit inclure un fuseau horaire")

    since = since.astimezone(timezone.utc)

    result = await db.execute(
        select(SavedSearch)
        .where(SavedSearch.alerts_enabled.is_(True))
        .order_by(SavedSearch.updated_at.asc())
    )

    created_count = 0

    for saved_search in result.scalars():
        params = saved_search.query_params or {}

        listings, total = await ListingRepository.search(
            db,
            q=_str_param(params, "q"),
            category_id=_uuid_param(params, "category_id"),
            administrative_area_id=_uuid_param(params, "administrative_area_id"),
            seller_id=_uuid_param(params, "seller_id"),
            price_min=_decimal_param(params, "price_min"),
            price_max=_decimal_param(params, "price_max"),
            condition=_str_param(params, "condition"),
            price_type=_str_param(params, "price_type"),
            allow_offers=_bool_param(params, "allow_offers"),
            published_after=since,
            sort="newest",
            offset=0,
            limit=limit_per_search,
        )

        if total == 0:
            continue

        for listing in listings:
            await NotificationService.create(
                db,
                user_id=saved_search.user_id,
                notification_type="SAVED_SEARCH_MATCH",
                title="Nouvelle annonce correspondant à votre recherche",
                message=(
                    f"{listing.title} correspond à votre recherche "
                    f"« {saved_search.name} »."
                ),
                data={
                    "saved_search_id": str(saved_search.id),
                    "listing_id": str(listing.id),
                },
                deduplication_key=(
                    f"SAVED_SEARCH_MATCH:{saved_search.id}:{listing.id}"
                ),
                commit=False,
            )
            created_count += 1

    await db.commit()
    return created_count


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create notifications for saved search matches.",
    )
    parser.add_argument(
        "--lookback-minutes",
        type=int,
        default=60,
        help="Fenêtre de recherche en minutes si --since n'est pas fourni.",
    )
    parser.add_argument(
        "--since",
        type=str,
        default=None,
        help="Date ISO UTC à partir de laquelle chercher les nouvelles annonces.",
    )
    parser.add_argument(
        "--limit-per-search",
        type=int,
        default=10,
        help="Nombre maximum d'annonces notifiées par recherche sauvegardée.",
    )
    return parser.parse_args()


async def main():
    args = parse_args()
    since = None

    if args.since:
        since = datetime.fromisoformat(args.since.replace("Z", "+00:00"))

    try:
        async with AsyncSessionLocal() as db:
            count = await process_saved_search_alerts(
                db,
                since=since,
                lookback_minutes=args.lookback_minutes,
                limit_per_search=args.limit_per_search,
            )
            print(f"{count} notification(s) d'alerte recherche creee(s).")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
