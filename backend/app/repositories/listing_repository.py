from sqlalchemy.dialects.postgresql import insert
from app.models.listing import ListingAttributeValue
from app.schemas.listing import ListingAttributeValueUpsert
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.listing import Listing

from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload


class ListingRepository:

    @staticmethod
    def public_active_filters():
        return (
            Listing.status == "ACTIVE",
            Listing.deleted_at.is_(None),
            or_(
                Listing.expires_at.is_(None),
                Listing.expires_at > func.now(),
            ),
        )

    @staticmethod
    async def create(
        db: AsyncSession,
        listing: Listing,
    ) -> Listing:

        db.add(listing)

        await db.commit()
        await db.refresh(listing)

        return listing

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        listing_id: UUID,
    ) -> Listing | None:

        result = await db.execute(
            select(Listing)
            .options(
                selectinload(Listing.images),
                selectinload(Listing.attribute_values),
            )
            .where(Listing.id == listing_id)
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def get_public(
        db: AsyncSession,
        category_id: UUID | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> list[Listing]:

        query = (
            select(Listing)
            .where(*ListingRepository.public_active_filters())
        )

        if category_id:
            query = query.where(
                Listing.category_id == category_id
            )

        query = (
            query
            .order_by(Listing.created_at.desc())
            .offset(offset)
            .limit(limit)
        )

        result = await db.execute(query)

        return list(result.scalars().all())

    @staticmethod
    async def get_by_seller(
        db: AsyncSession,
        seller_id: UUID,
        status: str | None = None,
    ) -> list[Listing]:
        query = select(Listing).where(
            Listing.seller_id == seller_id,
            Listing.deleted_at.is_(None),
        ).order_by(Listing.updated_at.desc())
        if status is not None:
            query = query.where(Listing.status == status)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def search(
        db: AsyncSession,
        *,
        q: str | None = None,
        category_id: UUID | None = None,
        administrative_area_id: UUID | None = None,
        seller_id: UUID | None = None,

        price_min: Decimal | None = None,
        price_max: Decimal | None = None,

        condition: str | None = None,
        price_type: str | None = None,

        allow_offers: bool | None = None,

        sort: str = "newest",

        offset: int = 0,
        limit: int = 20,
    ):
        filters = [
            *ListingRepository.public_active_filters(),
        ]

        # ---------------------------------
        # Recherche texte
        # ---------------------------------

        if q:
            search_text = f"%{q.strip()}%"

            filters.append(
                or_(
                    Listing.title.ilike(search_text),
                    Listing.description.ilike(search_text),
                )
            )

        # ---------------------------------
        # Catégorie
        # ---------------------------------

        if category_id:
            filters.append(
                Listing.category_id == category_id
            )

        # ---------------------------------
        # Localisation
        # ---------------------------------

        if administrative_area_id:
            filters.append(
                Listing.administrative_area_id
                == administrative_area_id
            )

        # ---------------------------------
        # Vendeur
        # ---------------------------------

        if seller_id:
            filters.append(
                Listing.seller_id == seller_id
            )

        # ---------------------------------
        # Prix
        # ---------------------------------

        if price_min is not None:
            filters.append(
                Listing.price >= price_min
            )

        if price_max is not None:
            filters.append(
                Listing.price <= price_max
            )

        # ---------------------------------
        # État
        # ---------------------------------

        if condition:
            filters.append(
                Listing.condition
                == condition.upper()
            )

        if price_type:
            filters.append(
                Listing.price_type
                == price_type.upper()
            )

        if allow_offers is not None:
            filters.append(
                Listing.allow_offers
                == allow_offers
            )

        # ---------------------------------
        # Nombre total
        # ---------------------------------

        count_query = (
            select(
                func.count(Listing.id)
            )
            .where(*filters)
        )

        count_result = await db.execute(
            count_query
        )

        total = int(
            count_result.scalar_one() or 0
        )

        # ---------------------------------
        # Requête principale
        # ---------------------------------

        query = (
            select(Listing)
            .options(
                selectinload(
                    Listing.images
                )
            )
            .where(*filters)
        )

        # ---------------------------------
        # Tri
        # ---------------------------------

        if sort == "price_asc":

            query = query.order_by(
                Listing.price.asc().nullslast()
            )

        elif sort == "price_desc":

            query = query.order_by(
                Listing.price.desc().nullslast()
            )

        elif sort == "oldest":

            query = query.order_by(
                Listing.created_at.asc()
            )

        else:

            query = query.order_by(
                Listing.created_at.desc()
            )

        query = (
            query
            .offset(offset)
            .limit(limit)
        )

        result = await db.execute(
            query
        )

        listings = list(
            result.scalars().unique().all()
        )

        return listings, total

    @staticmethod
    async def upsert_attribute(
        db: AsyncSession,
        listing_id: UUID,
        attribute_id: UUID,
        payload: ListingAttributeValueUpsert,
    ) -> ListingAttributeValue:
        values = payload.model_dump()
        statement = insert(ListingAttributeValue).values(
            listing_id=listing_id, attribute_id=attribute_id, **values,
        )
        statement = statement.on_conflict_do_update(
            constraint="uq_listing_attribute_value",
            set_=values,
        ).returning(ListingAttributeValue)
        result = await db.execute(statement.execution_options(populate_existing=True))
        value = result.scalar_one()
        await db.commit()
        await db.refresh(value)
        return value
