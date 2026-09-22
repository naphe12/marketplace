import pytest
import pytest_asyncio

from app.core.security import create_access_token
from app.models.user import User


@pytest.mark.asyncio
async def test_accept_offer_creates_transaction(
    client,
    buyer_headers,
    seller_headers,
    listing,
):
    # 1. L'acheteur manifeste son intérêt
    response = await client.post(
        f"/api/v1/listings/{listing.id}/interest",
        headers=buyer_headers,
    )

    assert response.status_code == 200

    conversation_id = response.json()["conversation_id"]

    # 2. L'acheteur fait une offre
    response = await client.post(
        f"/api/v1/conversations/{conversation_id}/offers",
        headers=buyer_headers,
        json={
            "amount": "2500000",
        },
    )

    assert response.status_code in (200, 201)

    offer = response.json()

    assert offer["status"] == "PENDING"

    offer_id = offer["id"]

    # 3. Le vendeur accepte
    response = await client.post(
        f"/api/v1/offers/{offer_id}/accept",
        headers=seller_headers,
    )

    assert response.status_code == 200

    # 4. Vérifier l'offre
    response = await client.get(
        f"/api/v1/conversations/{conversation_id}/offers",
        headers=buyer_headers,
    )

    assert response.status_code == 200

    offers = response.json()

    accepted_offer = next(
        item
        for item in offers
        if item["id"] == offer_id
    )

    assert accepted_offer["status"] == "ACCEPTED"

    # 5. Vérifier la transaction
    response = await client.get(
        "/api/v1/transactions/mine",
        headers=buyer_headers,
    )

    assert response.status_code == 200

    transactions = response.json()

    transaction = next(
        item
        for item in transactions
        if item["offer_id"] == offer_id
    )

    assert transaction["status"] == "ACCEPTED"
    assert transaction["agreed_price"] in (
        "2500000",
        "2500000.00",
    )

    assert transaction["transaction_number"].startswith(
        "TX-"
    )

@pytest.mark.asyncio
async def test_transaction_completed_after_both_confirm(
    client,
    buyer_headers,
    seller_headers,
    accepted_transaction,
):
    transaction_id = accepted_transaction["id"]

    # Acheteur confirme
    response = await client.post(
        f"/api/v1/transactions/{transaction_id}/confirm",
        headers=buyer_headers,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "ACCEPTED"
    assert data["buyer_confirmed"] is True
    assert data["seller_confirmed"] is False

    # Vendeur confirme
    response = await client.post(
        f"/api/v1/transactions/{transaction_id}/confirm",
        headers=seller_headers,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "COMPLETED"
    assert data["buyer_confirmed"] is True
    assert data["seller_confirmed"] is True
    assert data["completed_at"] is not None

@pytest.mark.asyncio
async def test_reject_offer_does_not_create_transaction(
    client,
    buyer_headers,
    seller_headers,
    pending_offer,
):
    offer_id = pending_offer["id"]
    conversation_id = pending_offer["conversation_id"]

    response = await client.post(
        f"/api/v1/offers/{offer_id}/reject",
        headers=seller_headers,
    )

    assert response.status_code == 200

    response = await client.get(
        f"/api/v1/conversations/{conversation_id}/offers",
        headers=buyer_headers,
    )

    offers = response.json()

    rejected_offer = next(
        item
        for item in offers
        if item["id"] == offer_id
    )

    assert rejected_offer["status"] == "REJECTED"

    response = await client.get(
        "/api/v1/transactions/mine",
        headers=buyer_headers,
    )

    transactions = response.json()

    assert not any(
        transaction["offer_id"] == offer_id
        for transaction in transactions
    )
@pytest.mark.asyncio
async def test_buyer_cannot_accept_own_offer(
    client,
    buyer_headers,
    pending_offer,
):
    offer_id = pending_offer["id"]

    response = await client.post(
        f"/api/v1/offers/{offer_id}/accept",
        headers=buyer_headers,
    )

    assert response.status_code in {
        400,
        403,
    }
@pytest_asyncio.fixture
async def outsider(
    db_session: AsyncSession,
):
    user = User(
        phone="+25779000003",
        email="outsider-test@example.com",
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


@pytest.fixture
def outsider_headers(
    outsider: User,
):
    token = create_access_token(
        subject=str(outsider.id),
    )

    return {
        "Authorization": f"Bearer {token}",
    }
@pytest.mark.asyncio
async def test_outsider_cannot_confirm_transaction(
    client,
    outsider_headers,
    accepted_transaction,
):
    transaction_id = accepted_transaction["id"]

    response = await client.post(
        f"/api/v1/transactions/{transaction_id}/confirm",
        headers=outsider_headers,
    )

    assert response.status_code in {
        403,
        404,
    }