from app.fraud.types import (
    FraudReason,
)


def evaluate_offer_rules(
    features: dict,
) -> list[FraudReason]:

    reasons: list[FraudReason] = []


    #
    # Compte extrêmement récent
    #
    if (
        features[
            "account_age_days"
        ] < 1
    ):
        reasons.append(
            FraudReason(
                code="VERY_NEW_ACCOUNT",
                score=15,
                description=(
                    "Compte créé depuis "
                    "moins de 24 heures."
                ),
            )
        )


    #
    # Beaucoup d'offres en une heure
    #
    offers_last_hour = (
        features[
            "offers_last_hour"
        ]
    )

    if offers_last_hour >= 20:
        reasons.append(
            FraudReason(
                code="MASS_OFFER_ACTIVITY",
                score=35,
                description=(
                    "Nombre anormalement élevé "
                    "d'offres en une heure."
                ),
            )
        )

    elif offers_last_hour >= 10:
        reasons.append(
            FraudReason(
                code="HIGH_OFFER_ACTIVITY",
                score=20,
                description=(
                    "Activité d'offres élevée."
                ),
            )
        )


    #
    # Signalements confirmés
    #
    reports = features[
        "confirmed_reports"
    ]

    if reports >= 3:
        reasons.append(
            FraudReason(
                code="MULTIPLE_CONFIRMED_REPORTS",
                score=40,
                description=(
                    "Plusieurs signalements "
                    "confirmés sur ce compte."
                ),
            )
        )

    elif reports >= 1:
        reasons.append(
            FraudReason(
                code="CONFIRMED_REPORT",
                score=20,
                description=(
                    "Le compte possède déjà "
                    "un signalement confirmé."
                ),
            )
        )


    #
    # Offre extrêmement basse
    #
    ratio = features.get(
        "offer_to_listing_ratio"
    )

    if ratio is not None:

        if ratio < 0.15:
            reasons.append(
                FraudReason(
                    code="EXTREMELY_LOW_OFFER",
                    score=20,
                    description=(
                        "L'offre représente moins "
                        "de 15 % du prix demandé."
                    ),
                )
            )

        elif ratio < 0.35:
            reasons.append(
                FraudReason(
                    code="VERY_LOW_OFFER",
                    score=10,
                    description=(
                        "L'offre est très inférieure "
                        "au prix demandé."
                    ),
                )
            )


    #
    # Aucun historique
    #
    if (
        features[
            "completed_transactions"
        ] == 0

        and features[
            "account_age_days"
        ] < 3
    ):
        reasons.append(
            FraudReason(
                code="NO_HISTORY_NEW_ACCOUNT",
                score=10,
                description=(
                    "Nouveau compte sans "
                    "transaction réussie."
                ),
            )
        )


    #
    # Téléphone non vérifié
    #
    if not features[
        "phone_verified"
    ]:
        reasons.append(
            FraudReason(
                code="PHONE_NOT_VERIFIED",
                score=10,
                description=(
                    "Téléphone non vérifié."
                ),
            )
        )


    return reasons