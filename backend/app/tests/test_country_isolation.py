from datetime import datetime, timezone
from decimal import Decimal

import pytest

from app.models.country import Country
from app.models.listing import Listing
from app.models.publication import ListingPackage
from app.models.user import User


@pytest.mark.asyncio
async def test_listing_search_is_filtered_by_country(
    client,
    db_session,
    seller: User,
    category,
):
    db_session.add_all([
        Country(code="BI", name="Burundi", currency="BIF", active=True),
        Country(code="RW", name="Rwanda", currency="RWF", active=True),
    ])
    await db_session.flush()

    bi_listing = Listing(
        seller_id=seller.id,
        category_id=category.id,
        country_code="BI",
        title="Telephone Burundi",
        price=Decimal("1000"),
        currency="BIF",
        price_type="FIXED",
        quantity=1,
        status="ACTIVE",
        allow_offers=True,
        published_at=datetime.now(timezone.utc),
    )
    rw_listing = Listing(
        seller_id=seller.id,
        category_id=category.id,
        country_code="RW",
        title="Telephone Rwanda",
        price=Decimal("1000"),
        currency="RWF",
        price_type="FIXED",
        quantity=1,
        status="ACTIVE",
        allow_offers=True,
        published_at=datetime.now(timezone.utc),
    )
    db_session.add_all([bi_listing, rw_listing])
    await db_session.commit()

    response = await client.get("/api/v1/listings?country_code=RW")

    assert response.status_code == 200, response.text
    titles = {item["title"] for item in response.json()["items"]}
    assert titles == {"Telephone Rwanda"}


@pytest.mark.asyncio
async def test_listing_packages_are_filtered_by_country(client, db_session):
    db_session.add_all([
        Country(code="BI", name="Burundi", currency="BIF", active=True),
        Country(code="RW", name="Rwanda", currency="RWF", active=True),
        ListingPackage(
            code="BI_BASIC",
            name="Basic BI",
            country_code="BI",
            duration_days=30,
            price=Decimal("1000"),
            currency="BIF",
            active=True,
            sort_order=1,
        ),
        ListingPackage(
            code="RW_BASIC",
            name="Basic RW",
            country_code="RW",
            duration_days=30,
            price=Decimal("1000"),
            currency="RWF",
            active=True,
            sort_order=1,
        ),
    ])
    await db_session.commit()

    response = await client.get("/api/v1/listing-packages?country_code=RW")

    assert response.status_code == 200, response.text
    assert [item["code"] for item in response.json()] == ["RW_BASIC"]


@pytest.mark.asyncio
async def test_favorite_rejects_listing_from_another_country(
    client,
    db_session,
    buyer: User,
    buyer_headers,
    seller: User,
    category,
):
    buyer.country_code = "BI"
    db_session.add_all([
        Country(code="BI", name="Burundi", currency="BIF", active=True),
        Country(code="RW", name="Rwanda", currency="RWF", active=True),
    ])
    await db_session.flush()

    listing = Listing(
        seller_id=seller.id,
        category_id=category.id,
        country_code="RW",
        title="Telephone Rwanda",
        price=Decimal("1000"),
        currency="RWF",
        price_type="FIXED",
        quantity=1,
        status="ACTIVE",
        allow_offers=True,
        published_at=datetime.now(timezone.utc),
    )
    db_session.add(listing)
    await db_session.commit()

    response = await client.post(
        f"/api/v1/favorites/{listing.id}",
        headers=buyer_headers,
    )

    assert response.status_code == 400, response.text
    assert "autre pays" in response.json()["detail"]


@pytest.mark.asyncio
async def test_saved_search_defaults_to_user_country(
    client,
    db_session,
    buyer: User,
    buyer_headers,
):
    buyer.country_code = "RW"
    db_session.add(Country(code="RW", name="Rwanda", currency="RWF", active=True))
    await db_session.commit()

    response = await client.post(
        "/api/v1/saved-searches",
        headers=buyer_headers,
        json={
            "name": "Mes telephones",
            "query_params": {"q": "telephone"},
            "alerts_enabled": True,
        },
    )

    assert response.status_code == 201, response.text
    assert response.json()["query_params"]["country_code"] == "RW"
