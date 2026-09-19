from pathlib import Path
from uuid import UUID, uuid4

from fastapi import HTTPException

from app.core.config import settings
from app.core.storage import get_s3_client


ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


class StorageService:

    @staticmethod
    def prepare_listing_image_upload(
        *,
        listing_id: UUID,
        content_type: str,
        size_bytes: int,
    ):
        if content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Format non supporté. "
                    "Utilisez JPEG, PNG ou WebP."
                ),
            )

        max_size = 8 * 1024 * 1024

        if size_bytes > max_size:
            raise HTTPException(
                status_code=400,
                detail=(
                    "La photo ne peut pas dépasser "
                    "8 MB."
                ),
            )

        extension = ALLOWED_IMAGE_TYPES[
            content_type
        ]

        object_key = (
            f"listings/"
            f"{listing_id}/"
            f"{uuid4()}{extension}"
        )

        s3 = get_s3_client()

        upload_url = s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": settings.BUCKET_NAME,
                "Key": object_key,
                "ContentType": content_type,
            },
            ExpiresIn=900,
        )

        return {
            "upload_url": upload_url,
            "object_key": object_key,
            "expires_in": 900,
        }