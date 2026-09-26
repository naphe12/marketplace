from datetime import datetime
from decimal import Decimal, InvalidOperation
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.saved_search import SavedSearch
from app.repositories.listing_repository import ListingRepository
from app.schemas.saved_search import (
    SavedSearchCreate,
    SavedSearchMatchesResponse,
    SavedSearchResponse,
    SavedSearchUpdate,
)




def _uuid_param(params: dict, key: str) -> UUID | None:
    value = params.get(key)
    if not value:
        return None
    try:
        return UUID(str(value))
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Paramètre de recherche invalide: {key}.",
        ) from exc


def _decimal_param(params: dict, key: str) -> Decimal | None:
    value = params.get(key)
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError) as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Paramètre de recherche invalide: {key}.",
        ) from exc


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
    raise HTTPException(
        status_code=400,
        detail=f"Paramètre de recherche invalide: {key}.",
    )


def _str_param(params: dict, key: str) -> str | None:
    value = params.get(key)
    if value in (None, ""):
        return None
    return str(value)


router = APIRouter(
    prefix="/saved-searches",
    tags=["Saved searches"],
)


@router.get("", response_model=list[SavedSearchResponse])
async def my_saved_searches(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.scalars(
        select(SavedSearch)
        .where(SavedSearch.user_id == current_user.id)
        .order_by(SavedSearch.updated_at.desc())
    )

    return list(result.all())


@router.post("", response_model=SavedSearchResponse, status_code=201)
async def create_saved_search(
    payload: SavedSearchCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    saved_search = SavedSearch(
        user_id=current_user.id,
        name=payload.name.strip(),
        query_params=payload.query_params,
        alerts_enabled=payload.alerts_enabled,
    )

    db.add(saved_search)
    await db.commit()
    await db.refresh(saved_search)

    return saved_search


@router.get(
    "/{saved_search_id}/matches",
    response_model=SavedSearchMatchesResponse,
)
async def saved_search_matches(
    saved_search_id: UUID,
    since: datetime | None = Query(default=None),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    saved_search = await db.get(SavedSearch, saved_search_id)

    if not saved_search or saved_search.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Recherche sauvegardée introuvable.")

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
        sort=_str_param(params, "sort") or "newest",
        offset=offset,
        limit=limit,
    )

    return {
        "saved_search": saved_search,
        "items": listings,
        "total": total,
        "offset": offset,
        "limit": limit,
        "has_more": offset + len(listings) < total,
    }


@router.patch("/{saved_search_id}", response_model=SavedSearchResponse)
async def update_saved_search(
    saved_search_id: UUID,
    payload: SavedSearchUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    saved_search = await db.get(SavedSearch, saved_search_id)

    if not saved_search or saved_search.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Recherche sauvegardée introuvable.")

    if payload.name is not None:
        saved_search.name = payload.name.strip()

    if payload.query_params is not None:
        saved_search.query_params = payload.query_params

    if payload.alerts_enabled is not None:
        saved_search.alerts_enabled = payload.alerts_enabled

    await db.commit()
    await db.refresh(saved_search)

    return saved_search


@router.delete("/{saved_search_id}")
async def delete_saved_search(
    saved_search_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    saved_search = await db.get(SavedSearch, saved_search_id)

    if not saved_search or saved_search.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Recherche sauvegardée introuvable.")

    await db.delete(saved_search)
    await db.commit()

    return {"success": True}
