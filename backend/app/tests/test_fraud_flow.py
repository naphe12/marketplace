import pytest

from sqlalchemy import text


@pytest.mark.asyncio
async def test_low_offer_generates_fraud_signal(
    client,
    db_session,
    buyer,
    buyer_headers,
    listing,
):
    # 1. Créer/récupérer la conversation.
    response = await client.post(
        f"/api/v1/listings/{listing.id}/interest",
        headers=buyer_headers,
    )

    assert response.status_code == 200, response.text

    conversation_id = response.json()[
        "conversation_id"
    ]

    # 2. Envoyer une offre extrêmement basse.
    #
    # Listing fixture = 3 000 000 BIF
    # Offre           =   100 000 BIF
    # Ratio           ≈ 3,3 %
    response = await client.post(
        (
            f"/api/v1/conversations/"
            f"{conversation_id}/offers"
        ),
        headers=buyer_headers,
        json={
            "amount": "100000",
        },
    )

    assert response.status_code in (
        200,
        201,
    ), response.text

    offer = response.json()

    assert offer["status"] == "PENDING"


    # 3. Vérifier que le moteur a généré
    #    un signal anti-fraude.
    result = await db_session.execute(
        text(
            """
            SELECT
                id,
                signal_type,
                severity,
                risk_score,
                status
            FROM market.fraud_signals
            WHERE user_id = :user_id
              AND listing_id = :listing_id
            ORDER BY created_at DESC
            LIMIT 1
            """
        ),
        {
            "user_id": buyer.id,
            "listing_id": listing.id,
        },
    )

    signal = result.mappings().first()

    assert signal is not None

    assert (
        signal["signal_type"]
        == "OFFER_RISK"
    )

    assert (
        signal["status"]
        == "OPEN"
    )

    assert signal["risk_score"] is not None

    assert float(
        signal["risk_score"]
    ) > 0

    assert signal["severity"] in {
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    }

import json

import pytest

from sqlalchemy import text


@pytest.mark.asyncio
async def test_extremely_low_offer_contains_expected_reason(
    client,
    db_session,
    buyer,
    buyer_headers,
    listing,
):
    # Listing fixture :
    # 3 000 000 BIF

    response = await client.post(
        f"/api/v1/listings/{listing.id}/interest",
        headers=buyer_headers,
    )

    assert response.status_code == 200, response.text

    conversation_id = (
        response.json()["conversation_id"]
    )

    # Offre de 100 000 BIF
    # Ratio ≈ 3,33 %
    response = await client.post(
        (
            f"/api/v1/conversations/"
            f"{conversation_id}/offers"
        ),
        headers=buyer_headers,
        json={
            "amount": "100000",
        },
    )

    assert response.status_code in (
        200,
        201,
    ), response.text

    offer = response.json()


    result = await db_session.execute(
        text(
            """
            SELECT
                signal_type,
                risk_score,
                severity,
                status,
                signal_data
            FROM market.fraud_signals
            WHERE user_id = :user_id
              AND listing_id = :listing_id
            ORDER BY created_at DESC
            LIMIT 1
            """
        ),
        {
            "user_id": buyer.id,
            "listing_id": listing.id,
        },
    )

    signal = result.mappings().first()

    assert signal is not None

    assert (
        signal["signal_type"]
        == "OFFER_RISK"
    )


    signal_data = signal["signal_data"]

    # PostgreSQL JSON est normalement déjà
    # transformé en dict par SQLAlchemy.
    # Mais ceci rend le test robuste.
    if isinstance(signal_data, str):
        signal_data = json.loads(
            signal_data
        )


    # --------------------------------------------------------
    # Vérifier que le signal concerne la bonne offre
    # --------------------------------------------------------

    assert (
        signal_data["offer_id"]
        == offer["id"]
    )


    # --------------------------------------------------------
    # Vérifier les features calculées
    # --------------------------------------------------------

    features = signal_data[
        "features"
    ]

    assert (
        float(features["offer_amount"])
        == 100000.0
    )

    assert (
        float(features["listing_price"])
        == 3000000.0
    )

    ratio = float(
        features[
            "offer_to_listing_ratio"
        ]
    )

    assert ratio < 0.10

    assert ratio == pytest.approx(
        100000 / 3000000,
        rel=1e-4,
    )


    # --------------------------------------------------------
    # Vérifier les raisons produites
    # par le moteur
    # --------------------------------------------------------

    reasons = signal_data[
        "reasons"
    ]

    reason_codes = {
        reason["code"]
        for reason in reasons
    }

    assert (
        "EXTREMELY_LOW_OFFER"
        in reason_codes
    )
@pytest.mark.asyncio
async def test_normal_offer_does_not_trigger_extremely_low_offer(
    client,
    db_session,
    buyer,
    buyer_headers,
    listing,
):
    # Listing fixture = 3 000 000 BIF

    response = await client.post(
        f"/api/v1/listings/{listing.id}/interest",
        headers=buyer_headers,
    )

    assert response.status_code == 200, response.text

    conversation_id = response.json()[
        "conversation_id"
    ]

    # Offre normale :
    # 2 700 000 / 3 000 000 = 90 %
    response = await client.post(
        (
            f"/api/v1/conversations/"
            f"{conversation_id}/offers"
        ),
        headers=buyer_headers,
        json={
            "amount": "2700000",
        },
    )

    assert response.status_code in (
        200,
        201,
    ), response.text

    offer = response.json()

    result = await db_session.execute(
        text(
            """
            SELECT
                signal_type,
                risk_score,
                severity,
                status,
                signal_data
            FROM market.fraud_signals
            WHERE user_id = :user_id
              AND listing_id = :listing_id
            ORDER BY created_at DESC
            LIMIT 1
            """
        ),
        {
            "user_id": buyer.id,
            "listing_id": listing.id,
        },
    )

    signal = result.mappings().first()

    assert signal is not None

    signal_data = signal["signal_data"]

    if isinstance(signal_data, str):
        signal_data = json.loads(
            signal_data
        )

    # La bonne offre doit être analysée.
    assert (
        signal_data["offer_id"]
        == offer["id"]
    )

    features = signal_data["features"]

    ratio = float(
        features[
            "offer_to_listing_ratio"
        ]
    )

    assert ratio == pytest.approx(
        0.90,
        rel=1e-4,
    )

    # Le moteur peut toujours trouver
    # d'autres facteurs de risque :
    # compte récent, historique faible, etc.
    #
    # Mais il NE DOIT PAS considérer
    # cette offre comme extrêmement basse.
    reason_codes = {
        reason["code"]
        for reason in signal_data["reasons"]
    }

    assert (
        "EXTREMELY_LOW_OFFER"
        not in reason_codes
    )

@pytest.mark.asyncio
async def test_extremely_low_offer_has_higher_risk_than_normal_offer(
    client,
    db_session,
    buyer,
    buyer_headers,
    listing,
):
    # Conversation
    response = await client.post(
        f"/api/v1/listings/{listing.id}/interest",
        headers=buyer_headers,
    )

    assert response.status_code == 200, response.text

    conversation_id = response.json()["conversation_id"]

    # Offre normale : 90 %
    response = await client.post(
        f"/api/v1/conversations/{conversation_id}/offers",
        headers=buyer_headers,
        json={"amount": "2700000"},
    )

    assert response.status_code in (200, 201), response.text

    normal_offer_id = response.json()["id"]

    result = await db_session.execute(
        text(
            """
            SELECT risk_score
            FROM market.fraud_signals
            WHERE listing_id = :listing_id
              AND signal_data->>'offer_id' = :offer_id
            ORDER BY created_at DESC
            LIMIT 1
            """
        ),
        {
            "listing_id": listing.id,
            "offer_id": normal_offer_id,
        },
    )

    normal_signal = result.mappings().first()

    assert normal_signal is not None

    normal_score = float(
        normal_signal["risk_score"]
    )

    # Offre extrêmement basse : ~3,3 %
    response = await client.post(
        f"/api/v1/conversations/{conversation_id}/offers",
        headers=buyer_headers,
        json={"amount": "100000"},
    )

    assert response.status_code in (200, 201), response.text

    low_offer_id = response.json()["id"]

    result = await db_session.execute(
        text(
            """
            SELECT risk_score
            FROM market.fraud_signals
            WHERE listing_id = :listing_id
              AND signal_data->>'offer_id' = :offer_id
            ORDER BY created_at DESC
            LIMIT 1
            """
        ),
        {
            "listing_id": listing.id,
            "offer_id": low_offer_id,
        },
    )

    low_signal = result.mappings().first()

    assert low_signal is not None

    low_score = float(
        low_signal["risk_score"]
    )

    assert low_score > normal_score