from app.fraud.types import FraudReason


def reason(
    code: str,
    score: float,
    description: str,
    *,
    category: str,
    severity: str = "LOW",
) -> FraudReason:
    return FraudReason(
        code=code,
        score=score,
        description=description,
        category=category,
        severity=severity,
    )


def evaluate_offer_rules(
    features: dict,
) -> list[FraudReason]:
    reasons: list[FraudReason] = []

    account_age_days = features["account_age_days"]
    buyer_trust_score = features["buyer_trust_score"]

    if account_age_days < 1:
        reasons.append(
            reason(
                "VERY_NEW_ACCOUNT",
                16,
                "Compte cree depuis moins de 24 heures.",
                category="ACCOUNT",
                severity="MEDIUM",
            )
        )
    elif account_age_days < 3:
        reasons.append(
            reason(
                "NEW_ACCOUNT",
                8,
                "Compte tres recent.",
                category="ACCOUNT",
            )
        )

    if buyer_trust_score < 20:
        reasons.append(
            reason(
                "LOW_BUYER_TRUST_SCORE",
                15,
                "Score de confiance acheteur faible.",
                category="ACCOUNT",
                severity="MEDIUM",
            )
        )

    if not features["phone_verified"]:
        reasons.append(
            reason(
                "PHONE_NOT_VERIFIED",
                10,
                "Telephone non verifie.",
                category="ACCOUNT",
            )
        )

    if not features["email_verified"]:
        reasons.append(
            reason(
                "EMAIL_NOT_VERIFIED",
                4,
                "Email non verifie.",
                category="ACCOUNT",
            )
        )

    offers_last_hour = features["offers_last_hour"]
    offers_last_24h = features["offers_last_24h"]
    distinct_sellers_last_24h = features["distinct_sellers_last_24h"]

    if offers_last_hour >= 20:
        reasons.append(
            reason(
                "MASS_OFFER_ACTIVITY",
                38,
                "Nombre anormalement eleve d'offres en une heure.",
                category="VELOCITY",
                severity="HIGH",
            )
        )
    elif offers_last_hour >= 10:
        reasons.append(
            reason(
                "HIGH_OFFER_ACTIVITY",
                22,
                "Activite d'offres elevee sur une heure.",
                category="VELOCITY",
                severity="MEDIUM",
            )
        )
    elif offers_last_hour >= 5 and account_age_days < 7:
        reasons.append(
            reason(
                "NEW_ACCOUNT_FAST_OFFERS",
                16,
                "Compte recent avec plusieurs offres rapides.",
                category="VELOCITY",
                severity="MEDIUM",
            )
        )

    if offers_last_24h >= 40:
        reasons.append(
            reason(
                "DAILY_OFFER_SPAM",
                30,
                "Volume d'offres tres eleve sur 24 heures.",
                category="VELOCITY",
                severity="HIGH",
            )
        )
    elif offers_last_24h >= 20:
        reasons.append(
            reason(
                "HIGH_DAILY_OFFER_ACTIVITY",
                16,
                "Volume d'offres eleve sur 24 heures.",
                category="VELOCITY",
                severity="MEDIUM",
            )
        )

    if distinct_sellers_last_24h >= 15:
        reasons.append(
            reason(
                "MANY_SELLERS_CONTACTED",
                20,
                "L'acheteur contacte beaucoup de vendeurs differents.",
                category="VELOCITY",
                severity="MEDIUM",
            )
        )

    buyer_reports = features["buyer_confirmed_reports"]
    if buyer_reports >= 3:
        reasons.append(
            reason(
                "MULTIPLE_CONFIRMED_REPORTS",
                42,
                "Plusieurs signalements confirmes sur ce compte.",
                category="REPUTATION",
                severity="HIGH",
            )
        )
    elif buyer_reports >= 1:
        reasons.append(
            reason(
                "CONFIRMED_REPORT",
                22,
                "Le compte possede deja un signalement confirme.",
                category="REPUTATION",
                severity="MEDIUM",
            )
        )

    if features["seller_confirmed_reports"] >= 2:
        reasons.append(
            reason(
                "SELLER_HAS_CONFIRMED_REPORTS",
                12,
                "Le vendeur a plusieurs signalements confirmes.",
                category="CONTEXT",
            )
        )

    if features["listing_reports_pending"] >= 3:
        reasons.append(
            reason(
                "LISTING_HAS_MULTIPLE_PENDING_REPORTS",
                18,
                "L'annonce a plusieurs signalements en attente.",
                category="CONTEXT",
                severity="MEDIUM",
            )
        )

    ratio = features.get("offer_to_listing_ratio")
    if ratio is not None:
        if ratio < 0.10:
            reasons.append(
                reason(
                    "EXTREMELY_LOW_OFFER",
                    24,
                    "L'offre represente moins de 10 % du prix demande.",
                    category="PRICE",
                    severity="MEDIUM",
                )
            )
        elif ratio < 0.25:
            reasons.append(
                reason(
                    "VERY_LOW_OFFER",
                    14,
                    "L'offre est tres inferieure au prix demande.",
                    category="PRICE",
                )
            )
        elif ratio > 1.50:
            reasons.append(
                reason(
                    "OVERPAYMENT_PATTERN",
                    28,
                    "L'offre depasse fortement le prix demande.",
                    category="PRICE",
                    severity="HIGH",
                )
            )
        elif ratio > 1.15:
            reasons.append(
                reason(
                    "HIGH_OVER_ASKING_OFFER",
                    12,
                    "L'offre depasse nettement le prix demande.",
                    category="PRICE",
                )
            )

    if (
        features["completed_transactions"] == 0
        and account_age_days < 3
    ):
        reasons.append(
            reason(
                "NO_HISTORY_NEW_ACCOUNT",
                10,
                "Nouveau compte sans transaction reussie.",
                category="REPUTATION",
            )
        )

    if features["cancellation_ratio"] >= 0.6 and features["cancelled_transactions"] >= 3:
        reasons.append(
            reason(
                "MANY_CANCELLED_TRANSACTIONS",
                25,
                "Taux d'annulation eleve sur les transactions.",
                category="REPUTATION",
                severity="MEDIUM",
            )
        )

    if features["conversation_message_count"] <= 1 and ratio is not None and ratio > 1.15:
        reasons.append(
            reason(
                "OVERPAY_WITHOUT_CONVERSATION",
                20,
                "Offre elevee sans conversation prealable.",
                category="BEHAVIOR",
                severity="MEDIUM",
            )
        )

    message_quality = features["last_buyer_message_quality"]
    if message_quality["has_external_contact_hint"]:
        reasons.append(
            reason(
                "EXTERNAL_CONTACT_HINT",
                18,
                "Le message pousse vers un canal externe ou un lien.",
                category="CONTENT",
                severity="MEDIUM",
            )
        )

    if message_quality["has_urgency_hint"]:
        reasons.append(
            reason(
                "URGENCY_LANGUAGE",
                8,
                "Le message contient un langage d'urgence.",
                category="CONTENT",
            )
        )

    if message_quality["uppercase_ratio"] >= 0.75 and message_quality["length"] >= 20:
        reasons.append(
            reason(
                "AGGRESSIVE_TEXT_PATTERN",
                8,
                "Message majoritairement en majuscules.",
                category="CONTENT",
            )
        )

    if message_quality["repeated_char_runs"] >= 2:
        reasons.append(
            reason(
                "REPEATED_CHARACTER_PATTERN",
                6,
                "Message avec caracteres repetes de maniere inhabituelle.",
                category="CONTENT",
            )
        )

    if features["seller_active_listings_7d"] >= 30:
        reasons.append(
            reason(
                "SELLER_HIGH_LISTING_VELOCITY",
                10,
                "Le vendeur publie beaucoup d'annonces recentes.",
                category="CONTEXT",
            )
        )

    return reasons
