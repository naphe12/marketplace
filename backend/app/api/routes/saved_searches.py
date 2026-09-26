from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.saved_search import SavedSearch
from app.schemas.saved_search import (
    SavedSearchCreate,
    SavedSearchResponse,
    SavedSearchUpdate,
)


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
