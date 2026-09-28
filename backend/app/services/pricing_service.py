from decimal import Decimal, ROUND_HALF_UP
from statistics import median

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.listing import Listing
from app.schemas.pricing import PricingEstimateRequest


class PricingService:
    @staticmethod
    def _money(value: Decimal | float | int | None) -> Decimal | None:
        if value is None:
            return None
        return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @staticmethod
    def _confidence(count: int) -> str:
        if count >= 12:
            return "HIGH"
        if count >= 5:
            return "MEDIUM"
        if count >= 2:
            return "LOW"
        return "INSUFFICIENT"

    @staticmethod
    def _quartile(sorted_values: list[Decimal], position: float) -> Decimal:
        if not sorted_values:
            return Decimal("0")
        if len(sorted_values) == 1:
            return sorted_values[0]

        raw_index = (len(sorted_values) - 1) * Decimal(str(position))
        lower = int(raw_index)
        upper = min(lower + 1, len(sorted_values) - 1)
        fraction = raw_index - lower
        return sorted_values[lower] + (sorted_values[upper] - sorted_values[lower]) * fraction

    @staticmethod
    async def estimate(db: AsyncSession, data: PricingEstimateRequest) -> dict:
        filters = [
            Listing.category_id == data.category_id,
            Listing.country_code == data.country_code.upper(),
            Listing.currency == data.currency.upper(),
            Listing.status == "ACTIVE",
            Listing.deleted_at.is_(None),
            Listing.price.is_not(None),
            Listing.price > 0,
        ]

        if data.condition:
            filters.append(or_(Listing.condition == data.condition, Listing.condition.is_(None)))

        if data.administrative_area_id:
            local_filters = [*filters, Listing.administrative_area_id == data.administrative_area_id]
            local_prices = await db.scalars(
                select(Listing.price)
                .where(and_(*local_filters))
                .order_by(Listing.published_at.desc().nullslast())
                .limit(60)
            )
            prices = [Decimal(str(price)) for price in local_prices.all() if price is not None]
        else:
            prices = []

        if len(prices) < 5:
            country_prices = await db.scalars(
                select(Listing.price)
                .where(and_(*filters))
                .order_by(Listing.published_at.desc().nullslast())
                .limit(80)
            )
            prices = [Decimal(str(price)) for price in country_prices.all() if price is not None]

        prices.sort()
        count = len(prices)
        confidence = PricingService._confidence(count)

        if count == 0:
            return {
                "verdict": "UNKNOWN",
                "confidence": confidence,
                "suggested_price": None,
                "low_price": None,
                "high_price": None,
                "median_price": None,
                "comparable_count": 0,
                "currency": data.currency.upper(),
                "message": "Pas assez d'annonces comparables pour conseiller un prix.",
                "reasons": ["Aucune annonce active comparable trouvée."],
            }

        median_price = PricingService._money(median(prices))
        low_price = PricingService._money(PricingService._quartile(prices, 0.25))
        high_price = PricingService._money(PricingService._quartile(prices, 0.75))
        suggested_price = median_price

        verdict = "NO_PRICE"
        message = "Fourchette de prix estimée à partir des annonces similaires."
        reasons = ["Estimation basée sur la catégorie, le pays, la devise et l'état."]
        if count < 5:
            reasons.append("Peu d'annonces comparables : utilisez ce conseil avec prudence.")

        if data.price is not None and median_price and median_price > 0:
            ratio = Decimal(data.price) / median_price
            if ratio <= Decimal("0.60"):
                verdict = "TOO_LOW"
                message = "Prix très bas par rapport aux annonces similaires. Vérifiez qu'il n'y a pas d'erreur."
            elif ratio <= Decimal("0.85"):
                verdict = "FAST_SALE"
                message = "Prix compétitif : l'annonce peut attirer rapidement des acheteurs."
            elif ratio <= Decimal("1.15"):
                verdict = "FAIR"
                message = "Prix cohérent avec les annonces similaires."
            elif ratio <= Decimal("1.35"):
                verdict = "HIGH"
                message = "Prix au-dessus du marché : vous risquez de recevoir moins de contacts."
            else:
                verdict = "TOO_HIGH"
                message = "Prix nettement supérieur aux annonces similaires."

        return {
            "verdict": verdict,
            "confidence": confidence,
            "suggested_price": suggested_price,
            "low_price": low_price,
            "high_price": high_price,
            "median_price": median_price,
            "comparable_count": count,
            "currency": data.currency.upper(),
            "message": message,
            "reasons": reasons,
        }
