import os
from datetime import datetime, timezone
from decimal import Decimal

import pytest
import pytest_asyncio

from httpx import (
    ASGITransport,
    AsyncClient,
)

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.core.database import get_db
from app.core.security import create_access_token
from app.main import app

from app.models.category import Category
from app.models.listing import Listing
from app.models.user import User


# ============================================================
# DATABASE TEST
# ============================================================

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
)

if not TEST_DATABASE_URL:
    raise RuntimeError(
        "TEST_DATABASE_URL n'est pas définie."
    )


# Protection supplémentaire :
# il faut explicitement autoriser le nettoyage de la DB.
if os.getenv("ALLOW_TEST_DB_RESET") != "1":
    raise RuntimeError(
        "Définissez ALLOW_TEST_DB_RESET=1 "
        "pour autoriser les tests à nettoyer "
        "la base de test."
    )


if TEST_DATABASE_URL.startswith(
    "postgresql://"
):
    TEST_DATABASE_URL = (
        TEST_DATABASE_URL.replace(
            "postgresql://",
            "postgresql+asyncpg://",
            1,
        )
    )


test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,

    # Important avec pytest-asyncio :
    # évite de réutiliser une connexion asyncpg
    # appartenant à une autre event loop.
    poolclass=NullPool,
)


TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ============================================================
# RESET DATABASE
# ============================================================

@pytest_asyncio.fixture(
    autouse=True,
)
async def reset_test_database():
    """
    Nettoie toutes les tables du schéma market
    avant chaque test.

    La base utilisée doit être exclusivement
    dédiée aux tests.
    """

    async with test_engine.begin() as conn:
        result = await conn.execute(
            text(
                """
                SELECT tablename
                FROM pg_tables
                WHERE schemaname = 'market'
                ORDER BY tablename
                """
            )
        )

        table_names = [
            row[0]
            for row in result.fetchall()
        ]

        if not table_names:
            raise RuntimeError(
                "Aucune table trouvée dans "
                "le schéma market. "
                "Exécutez d'abord "
                "bootstrap_test_db."
            )

        tables_sql = ", ".join(
            f'market."{name}"'
            for name in table_names
        )

        await conn.execute(
            text(
                f"""
                TRUNCATE TABLE
                {tables_sql}
                RESTART IDENTITY
                CASCADE
                """
            )
        )

    yield


# ============================================================
# SESSION SQLALCHEMY
# ============================================================

@pytest_asyncio.fixture
async def db_session():
    async with TestSessionLocal() as session:
        yield session


# ============================================================
# FASTAPI CLIENT
# ============================================================

@pytest_asyncio.fixture
async def client():

    async def override_get_db():
        async with TestSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = (
        override_get_db
    )

    transport = ASGITransport(
        app=app,
    )

    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as test_client:
        yield test_client

    app.dependency_overrides.pop(
        get_db,
        None,
    )


# ============================================================
# USERS
# ============================================================

@pytest_asyncio.fixture
async def buyer(
    db_session: AsyncSession,
):
    user = User(
        phone="+25779000001",
        email="buyer-test@example.com",

        # Pas besoin de tester le mot de passe ici :
        # l'authentification se fera par JWT.
        password_hash="test-password-hash",

        account_type="INDIVIDUAL",
        status="ACTIVE",

        phone_verified=True,
        email_verified=True,

        is_admin=False,
    )

    db_session.add(user)

    await db_session.commit()
    await db_session.refresh(user)

    return user


@pytest_asyncio.fixture
async def seller(
    db_session: AsyncSession,
):
    user = User(
        phone="+25779000002",
        email="seller-test@example.com",

        password_hash="test-password-hash",

        account_type="INDIVIDUAL",
        status="ACTIVE",

        phone_verified=True,
        email_verified=True,

        is_admin=False,
    )

    db_session.add(user)

    await db_session.commit()
    await db_session.refresh(user)

    return user


# ============================================================
# AUTH HEADERS
# ============================================================

@pytest.fixture
def buyer_headers(
    buyer: User,
):
    token = create_access_token(
        subject=str(buyer.id),
    )

    return {
        "Authorization":
            f"Bearer {token}",
    }


@pytest.fixture
def seller_headers(
    seller: User,
):
    token = create_access_token(
        subject=str(seller.id),
    )

    return {
        "Authorization":
            f"Bearer {token}",
    }


# ============================================================
# CATEGORY
# ============================================================

@pytest_asyncio.fixture
async def category(
    db_session: AsyncSession,
):
    category = Category(
        name="Téléphones test",
        slug="telephones-test",
        description=(
            "Catégorie créée par pytest."
        ),
        active=True,
        sort_order=1,
    )

    db_session.add(category)

    await db_session.commit()
    await db_session.refresh(category)

    return category


# ============================================================
# LISTING
# ============================================================

@pytest_asyncio.fixture
async def listing(
    db_session: AsyncSession,
    seller: User,
    category: Category,
):
    listing = Listing(
        seller_id=seller.id,
        category_id=category.id,

        title="Téléphone test pytest",

        description=(
            "Annonce utilisée pour les "
            "tests automatisés."
        ),

        price=Decimal(
            "3000000.00"
        ),

        currency="BIF",
        price_type="FIXED",

        condition="USED",

        quantity=1,

        status="ACTIVE",

        allow_offers=True,

        published_at=datetime.now(
            timezone.utc
        ),
    )

    db_session.add(listing)

    await db_session.commit()
    await db_session.refresh(listing)

    return listing


# ============================================================
# PENDING OFFER
# ============================================================

@pytest_asyncio.fixture
async def pending_offer(
    client: AsyncClient,
    buyer_headers: dict[str, str],
    listing: Listing,
):
    # 1. L'acheteur manifeste son intérêt.
    response = await client.post(
        (
            f"/api/v1/listings/"
            f"{listing.id}/interest"
        ),
        headers=buyer_headers,
    )

    assert response.status_code == 200, (
        response.text
    )

    conversation_id = (
        response.json()[
            "conversation_id"
        ]
    )

    # 2. L'acheteur fait une offre.
    response = await client.post(
        (
            f"/api/v1/conversations/"
            f"{conversation_id}/offers"
        ),
        headers=buyer_headers,
        json={
            "amount": "2500000",
        },
    )

    assert response.status_code in (
        200,
        201,
    ), response.text

    offer = response.json()

    assert (
        offer["status"]
        == "PENDING"
    )

    return offer


# ============================================================
# ACCEPTED TRANSACTION
# ============================================================

@pytest_asyncio.fixture
async def accepted_transaction(
    client: AsyncClient,
    buyer_headers: dict[str, str],
    seller_headers: dict[str, str],
    pending_offer: dict,
):
    offer_id = pending_offer["id"]

    # Le vendeur accepte l'offre.
    response = await client.post(
        (
            f"/api/v1/offers/"
            f"{offer_id}/accept"
        ),
        headers=seller_headers,
    )

    assert response.status_code == 200, (
        response.text
    )

    # Récupérer la transaction créée.
    response = await client.get(
        "/api/v1/transactions/mine",
        headers=buyer_headers,
    )

    assert response.status_code == 200, (
        response.text
    )

    transactions = response.json()

    transaction = next(
        (
            item
            for item in transactions
            if item["offer_id"]
            == offer_id
        ),
        None,
    )

    assert transaction is not None, (
        "Aucune transaction créée "
        "pour l'offre acceptée."
    )

    assert (
        transaction["status"]
        == "ACCEPTED"
    )

    return transaction