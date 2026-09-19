from fastapi import HTTPException

from app.schemas.listing import ListingImageUpdate
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.repositories.listing_repository import ListingRepository
from app.schemas.listing import (
    ListingAttributeValueCreate,
    ListingAttributeValueResponse,
    ListingCreate,
    ListingDetailResponse,
    ListingImageCreate,
    ListingImageResponse,
    ListingResponse,
    ListingUpdate,
)
from app.services.listing_service import ListingService

from decimal import Decimal

from app.schemas.listing import (
    ListingSearchResponse,
)

from app.schemas.upload import (
    ImageUploadPrepareRequest,
    ImageUploadPrepareResponse,
    ImageUploadConfirmRequest,
)

from app.services.storage_service import (
    StorageService,
)
from app.core.storage import get_s3_client
from app.models import settings
from app.models.listing import ListingImage


router = APIRouter(
    prefix="/listings",
    tags=["Listings"],
)


@router.get(
    "/mine",
    response_model=list[ListingResponse],
)
async def my_listings(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await ListingRepository.get_by_seller(
        db,
        current_user.id,
    )


@router.get(
    "/mine/{listing_id}",
    response_model=ListingDetailResponse,
)
async def my_listing_detail(
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await ListingService.get_owned(
        db,
        listing_id,
        current_user.id,
    )


@router.post(
    "",
    response_model=ListingResponse,
    status_code=201,
)
async def create_listing(
    data: ListingCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await ListingService.create(
        db,
        current_user.id,
        data,
    )


@router.patch(
    "/{listing_id}",
    response_model=ListingResponse,
)
async def update_listing(
    listing_id: UUID,
    data: ListingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await ListingService.update(
        db,
        listing_id,
        current_user.id,
        data,
    )


@router.post(
    "/{listing_id}/images",
    response_model=ListingImageResponse,
    status_code=201,
)
async def add_listing_image(
    listing_id: UUID,
    data: ListingImageCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await ListingService.add_image(
        db,
        listing_id,
        current_user.id,
        data,
    )


@router.post(
    "/{listing_id}/attributes",
    response_model=ListingAttributeValueResponse,
    status_code=201,
)
async def add_listing_attribute(
    listing_id: UUID,
    data: ListingAttributeValueCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await ListingService.add_attribute_value(
        db,
        listing_id,
        current_user.id,
        data,
    )

@router.post(
    "/{listing_id}/publish",
)
async def publish_listing(
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await ListingService.publish(
        db,
        listing_id,
        current_user.id,
    )

@router.get(
    "",
    response_model=ListingSearchResponse,
)
async def search_listings(
    q: str | None = None,

    category_id: UUID | None = None,

    administrative_area_id: UUID | None = None,

    seller_id: UUID | None = None,

    price_min: Decimal | None = Query(
        default=None,
        ge=0,
    ),

    price_max: Decimal | None = Query(
        default=None,
        ge=0,
    ),

    condition: str | None = None,

    price_type: str | None = None,

    allow_offers: bool | None = None,

    sort: str = Query(
        default="newest",
        pattern=(
            "^(newest|oldest|"
            "price_asc|price_desc)$"
        ),
    ),

    offset: int = Query(
        default=0,
        ge=0,
    ),

    limit: int = Query(
        default=20,
        ge=1,
        le=100,
    ),

    db: AsyncSession = Depends(get_db),
):
    listings, total = (
        await ListingRepository.search(
            db,

            q=q,

            category_id=category_id,

            administrative_area_id=(
                administrative_area_id
            ),

            seller_id=seller_id,

            price_min=price_min,
            price_max=price_max,

            condition=condition,
            price_type=price_type,

            allow_offers=allow_offers,

            sort=sort,

            offset=offset,
            limit=limit,
        )
    )

    return {
        "items": listings,

        "total": total,

        "offset": offset,
        "limit": limit,

        "has_more": (
            offset + len(listings)
            < total
        ),
    }

@router.patch("/{listing_id}/images/{image_id}", response_model=ListingImageResponse)
async def update_listing_image(
    listing_id: UUID, image_id: UUID, data: ListingImageUpdate,
    db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user),
):
    return await ListingService.update_image(db, listing_id, image_id, current_user.id, data)


@router.delete("/{listing_id}/images/{image_id}", status_code=204)
async def delete_listing_image(
    listing_id: UUID, image_id: UUID,
    db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user),
):
    await ListingService.delete_image(db, listing_id, image_id, current_user.id)
    return Response(status_code=204)

@router.post(
    "/{listing_id}/images/prepare",
    response_model=ImageUploadPrepareResponse,
)
async def prepare_image_upload(
    listing_id: UUID,
    payload: ImageUploadPrepareRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    listing = await ListingRepository.get_by_id(
        db,
        listing_id,
    )

    if not listing:
        raise HTTPException(
            status_code=404,
            detail="Annonce introuvable.",
        )

    if listing.seller_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Accès interdit.",
        )

    return (
        StorageService.prepare_listing_image_upload(
            listing_id=listing_id,
            content_type=payload.content_type,
            size_bytes=payload.size_bytes,
        )
    )
@staticmethod
def object_exists(
    object_key: str,
) -> bool:

    s3 = get_s3_client()

    try:
        s3.head_object(
            Bucket=settings.S3_ACCESS_KEY_ID,
            Key=object_key,
        )

        return True

    except Exception:
        return False

@router.post(
    "/{listing_id}/images/confirm",
)
async def confirm_image_upload(
    listing_id: UUID,
    payload: ImageUploadConfirmRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    listing = await ListingRepository.get_by_id(
        db,
        listing_id,
    )

    if not listing:
        raise HTTPException(
            404,
            "Annonce introuvable.",
        )

    if listing.seller_id != current_user.id:
        raise HTTPException(
            403,
            "Accès interdit.",
        )

    expected_prefix = (
        f"listings/{listing_id}/"
    )

    if not payload.object_key.startswith(
        expected_prefix
    ):
        raise HTTPException(
            400,
            "Clé d'image invalide.",
        )

    if not StorageService.object_exists(
        payload.object_key
    ):
        raise HTTPException(
            400,
            "La photo n'a pas été trouvée.",
        )

    image = ListingImage(
        listing_id=listing.id,
        object_key=payload.object_key,
        mime_type=payload.content_type,
        file_size=payload.size_bytes,
        position=payload.position,
        is_primary=payload.is_primary,
    )

    db.add(image)

    await db.commit()
    await db.refresh(image)

    return image


@router.get("/{listing_id}", response_model=ListingDetailResponse)
async def public_listing_detail(
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    listing = await ListingRepository.get_by_id(db, listing_id)
    if not listing or listing.deleted_at is not None or listing.status != "ACTIVE":
        raise HTTPException(404, "Annonce introuvable.")

    result = ListingResponse.model_validate(listing).model_dump()
    result["attribute_values"] = listing.attribute_values
    result["images"] = [
        {
            "id": image.id,
            "image_url": await StorageService.signed_url(image.object_key),
            "thumbnail_url": (
                await StorageService.signed_url(image.thumbnail_object_key)
                if image.thumbnail_object_key else None
            ),
            "position": image.position,
            "is_primary": image.is_primary,
        }
        for image in listing.images
    ]
    return result
