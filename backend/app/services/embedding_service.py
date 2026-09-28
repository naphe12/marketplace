import hashlib
import math
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.listing import Listing
from app.models.wanted import WantedRequest
from app.services.wanted_matching import tokens


class EmbeddingService:
    @staticmethod
    def enabled() -> bool:
        return bool(settings.EMBEDDINGS_ENABLED)

    @staticmethod
    def _dimension() -> int:
        return settings.EMBEDDING_DIMENSIONS or 384

    @staticmethod
    def _vector_literal(vector: list[float]) -> str:
        return "[" + ",".join(f"{value:.8f}" for value in vector) + "]"

    @staticmethod
    def embed_local(text_value: str) -> list[float] | None:
        text_tokens = tokens(text_value)
        if not text_tokens or not EmbeddingService.enabled():
            return None
        dimension = EmbeddingService._dimension()
        vector = [0.0] * dimension
        for token in text_tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % dimension
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[index] += sign
        norm = math.sqrt(sum(value * value for value in vector))
        if norm == 0:
            return None
        return [value / norm for value in vector]

    @staticmethod
    async def embed(text_value: str) -> list[float] | None:
        return EmbeddingService.embed_local(text_value)

    @staticmethod
    def listing_text(listing: Listing) -> str:
        attribute_text = " ".join(
            str(value)
            for item in list(listing.attribute_values or [])
            for value in (
                item.value_text,
                item.value_integer,
                item.value_decimal,
                item.value_boolean,
                item.value_date,
            )
            if value is not None
        )
        return f"{listing.title} {listing.description or ''} {listing.condition or ''} {attribute_text}"

    @staticmethod
    def wanted_text(request: WantedRequest) -> str:
        attribute_text = " ".join(
            str(value)
            for item in list(request.attributes or [])
            for value in (
                item.value_text,
                item.value_integer,
                item.value_decimal,
                item.value_boolean,
                item.value_date,
            )
            if value is not None
        )
        return f"{request.title} {request.description or ''} {request.condition or ''} {attribute_text}"

    @staticmethod
    async def update_listing_embedding(db: AsyncSession, listing: Listing) -> None:
        vector = await EmbeddingService.embed(EmbeddingService.listing_text(listing))
        if vector is None:
            return
        await db.execute(
            text("UPDATE market.listings SET embedding = CAST(:embedding AS vector) WHERE id = :listing_id"),
            {"embedding": EmbeddingService._vector_literal(vector), "listing_id": listing.id},
        )

    @staticmethod
    async def update_wanted_embedding(db: AsyncSession, request: WantedRequest) -> None:
        vector = await EmbeddingService.embed(EmbeddingService.wanted_text(request))
        if vector is None:
            return
        await db.execute(
            text("UPDATE market.wanted_requests SET embedding = CAST(:embedding AS vector) WHERE id = :request_id"),
            {"embedding": EmbeddingService._vector_literal(vector), "request_id": request.id},
        )

    @staticmethod
    async def semantic_listing_candidates(db: AsyncSession, request: WantedRequest, limit: int = 100) -> list[tuple[UUID, float]]:
        if not EmbeddingService.enabled():
            return []
        row = await db.execute(
            text("SELECT embedding::text FROM market.wanted_requests WHERE id = :request_id AND embedding IS NOT NULL"),
            {"request_id": request.id},
        )
        embedding = row.scalar_one_or_none()
        if not embedding:
            return []
        result = await db.execute(
            text(
                """
                SELECT id, 1 - (embedding <=> CAST(:embedding AS vector)) AS semantic_score
                FROM market.listings
                WHERE embedding IS NOT NULL
                  AND status = 'ACTIVE'
                  AND deleted_at IS NULL
                  AND country_code = :country_code
                  AND (:category_id IS NULL OR category_id = :category_id)
                  AND (:budget_max IS NULL OR price IS NULL OR price <= :budget_max)
                  AND (:condition IS NULL OR condition IS NULL OR condition = :condition)
                ORDER BY embedding <=> CAST(:embedding AS vector)
                LIMIT :limit
                """
            ),
            {
                "embedding": embedding,
                "country_code": request.country_code,
                "category_id": request.category_id,
                "budget_max": request.budget_max,
                "condition": request.condition,
                "limit": limit,
            },
        )
        return [(listing_id, float(score or 0)) for listing_id, score in result.all()]
