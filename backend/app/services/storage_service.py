from functools import lru_cache

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException
from starlette.concurrency import run_in_threadpool

from app.core.config import settings


@lru_cache
def storage_client():
    if not all((settings.S3_ENDPOINT_URL, settings.S3_ACCESS_KEY_ID,
                settings.S3_SECRET_ACCESS_KEY, settings.S3_BUCKET)):
        raise HTTPException(503, "Stockage des images non configuré.")
    return boto3.client(
        "s3", endpoint_url=settings.S3_ENDPOINT_URL,
        aws_access_key_id=settings.S3_ACCESS_KEY_ID,
        aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
        region_name=settings.S3_REGION,
        config=Config(signature_version="s3v4", connect_timeout=5,
                      read_timeout=10, retries={"max_attempts": 2}),
    )


class StorageService:
    @staticmethod
    async def check_image(key: str):
        try:
            metadata = await run_in_threadpool(
                storage_client().head_object, Bucket=settings.S3_BUCKET, Key=key,
            )
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") in {"404", "NoSuchKey", "NotFound"}:
                raise HTTPException(404, "Image introuvable dans le bucket.") from None
            raise HTTPException(503, "Stockage des images indisponible.") from None
        except BotoCoreError:
            raise HTTPException(503, "Stockage des images indisponible.") from None
        if metadata.get("ContentType") not in {"image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"}:
            raise HTTPException(400, "Le fichier doit être une image JPEG, PNG, WebP, GIF ou AVIF.")

    @staticmethod
    async def signed_url(key: str) -> str:
        try:
            return await run_in_threadpool(
                storage_client().generate_presigned_url,
                "get_object", Params={"Bucket": settings.S3_BUCKET, "Key": key},
                ExpiresIn=300,
            )
        except (ClientError, BotoCoreError):
            raise HTTPException(503, "Stockage des images indisponible.") from None
