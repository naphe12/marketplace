from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.listing import Listing, ListingImage
from app.services.storage_service import StorageService

router = APIRouter(prefix="/images", tags=["Images"])


@router.get("/{image_id}")
async def get_image(image_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ListingImage).join(Listing, Listing.id == ListingImage.listing_id)
        .where(ListingImage.id == image_id, Listing.deleted_at.is_(None),
               Listing.status == "ACTIVE", ListingImage.object_key.is_not(None))
    )
    image = result.scalar_one_or_none()
    if image is None:
        raise HTTPException(404, "Image introuvable.")
    return RedirectResponse(
        await StorageService.signed_url(image.object_key),
        status_code=307, headers={"Cache-Control": "no-store"},
    )
