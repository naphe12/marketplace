from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.listing import Listing
from app.models.moderation import FraudSignal
from app.models.trust import ReputationProfile


class DealAssistantService:
    @staticmethod
    def _price_position(evaluated: Decimal | None, reference: Decimal | None) -> tuple[str, int, str | None]:
        if evaluated is None or reference is None or reference <= 0:
            return "UNKNOWN", 0, None
        ratio = evaluated / reference
        if ratio <= Decimal("0.60"):
            return "SUSPICIOUSLY_LOW", -20, "Prix très inférieur aux annonces similaires."
        if ratio <= Decimal("0.85"):
            return "GOOD", 15, "Prix inférieur au marché comparable."
        if ratio <= Decimal("1.15"):
            return "FAIR", 20, "Prix cohérent avec les annonces similaires."
        if ratio <= Decimal("1.35"):
            return "EXPENSIVE", -5, "Prix au-dessus du marché comparable."
        return "VERY_EXPENSIVE", -15, "Prix nettement supérieur aux annonces similaires."

    @staticmethod
    def _fraud_level(score: Decimal | None) -> str:
        if score is None:
            return "LOW"
        if score >= 80:
            return "CRITICAL"
        if score >= 60:
            return "HIGH"
        if score >= 30:
            return "MEDIUM"
        return "LOW"

    @staticmethod
    async def assess_listing(db: AsyncSession, listing_id: UUID, amount: Decimal | None = None) -> dict:
        listing = await db.get(Listing, listing_id)
        if not listing or listing.deleted_at is not None:
            raise HTTPException(status_code=404, detail="Annonce introuvable.")

        evaluated_price = amount if amount is not None else listing.price
        comparable_filters = [
            Listing.id != listing.id,
            Listing.status == "ACTIVE",
            Listing.deleted_at.is_(None),
            Listing.country_code == listing.country_code,
            Listing.category_id == listing.category_id,
            Listing.price.is_not(None),
        ]
        if listing.condition:
            comparable_filters.append(or_(Listing.condition == listing.condition, Listing.condition.is_(None)))

        comparable_row = await db.execute(
            select(func.count(Listing.id), func.avg(Listing.price)).where(and_(*comparable_filters))
        )
        comparable_count, reference_price = comparable_row.one()
        comparable_count = int(comparable_count or 0)
        reference_price = Decimal(str(round(reference_price, 2))) if reference_price is not None else None

        reputation = await db.scalar(select(ReputationProfile).where(ReputationProfile.user_id == listing.seller_id))
        fraud_score = await db.scalar(
            select(func.max(FraudSignal.risk_score)).where(
                FraudSignal.status == "OPEN",
                or_(FraudSignal.listing_id == listing.id, FraudSignal.user_id == listing.seller_id),
            )
        )

        score = 50
        reasons: list[str] = []
        price_position, price_delta, price_reason = DealAssistantService._price_position(evaluated_price, reference_price)
        score += price_delta
        if price_reason:
            reasons.append(price_reason)
        if comparable_count < 3:
            reasons.append("Peu d'annonces comparables disponibles pour ce marché.")

        trust_level = reputation.trust_level if reputation else None
        if reputation:
            if reputation.trust_score >= 70:
                score += 15
                reasons.append("Vendeur avec réputation solide.")
            elif reputation.trust_score < 30:
                score -= 10
                reasons.append("Vendeur encore peu établi sur la plateforme.")
        else:
            score -= 5
            reasons.append("Réputation vendeur non encore calculée.")

        fraud_risk = DealAssistantService._fraud_level(fraud_score)
        if fraud_risk in {"HIGH", "CRITICAL"}:
            score -= 30
            reasons.append("Les contrôles de sécurité recommandent une prudence renforcée.")
        elif fraud_risk == "MEDIUM":
            score -= 15
            reasons.append("Les contrôles de sécurité recommandent quelques vérifications avant achat.")

        score = max(0, min(100, score))
        if fraud_risk in {"HIGH", "CRITICAL"} or price_position == "SUSPICIOUSLY_LOW":
            verdict = "SUSPICIOUS"
        elif score >= 70:
            verdict = "GOOD_DEAL"
        elif score >= 45:
            verdict = "FAIR"
        else:
            verdict = "RISKY"

        return {
            "verdict": verdict,
            "score": score,
            "price_position": price_position,
            "reference_price": reference_price,
            "evaluated_price": evaluated_price,
            "comparable_count": comparable_count,
            "trust_level": trust_level,
            "fraud_risk": fraud_risk,
            "reasons": reasons,
        }
