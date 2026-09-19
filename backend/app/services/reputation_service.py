from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.trust import ReputationProfile
from app.repositories.reputation_repository import (
    ReputationRepository,
)
from app.repositories.user_repository import (
    UserRepository,
)

from app.repositories.verification_repository import (
    VerificationRepository,
)


class ReputationService:

    @staticmethod
    def calculate_score(
        *,
        phone_verified: bool,
        identity_verified: bool,
        business_verified: bool,
        completed_transactions: int,
        cancelled_transactions: int,
        review_count: int,
        average_rating: float | None,
    ) -> Decimal:

        score = Decimal("10")

        # -------------------------------
        # Vérifications
        # -------------------------------

        if phone_verified:
            score += Decimal("10")

        if identity_verified:
            score += Decimal("15")

        if business_verified:
            score += Decimal("10")

        # -------------------------------
        # Transactions réussies
        # maximum +30
        # -------------------------------

        transaction_score = min(
            completed_transactions * 3,
            30,
        )

        score += Decimal(str(transaction_score))

        # -------------------------------
        # Qualité des avis
        # maximum +25
        # -------------------------------

        if (
            average_rating is not None
            and review_count > 0
        ):
            rating_score = (
                (average_rating - 1)
                / 4
                * 25
            )

            rating_score = max(
                0,
                min(rating_score, 25),
            )

            score += Decimal(
                str(round(rating_score, 2))
            )

        # -------------------------------
        # Nombre d'avis vérifiés
        # maximum +10
        # -------------------------------

        score += Decimal(
            str(min(review_count, 10))
        )

        # -------------------------------
        # Annulations
        # maximum -20
        # -------------------------------

        cancellation_penalty = min(
            cancelled_transactions * 5,
            20,
        )

        score -= Decimal(
            str(cancellation_penalty)
        )

        # Toujours 0 → 100

        score = max(
            Decimal("0"),
            min(score, Decimal("100")),
        )

        return score.quantize(
            Decimal("0.01")
        )

    @staticmethod
    def calculate_level(
        score: Decimal,
    ) -> str:

        if score >= 85:
            return "HIGH_TRUST"

        if score >= 70:
            return "TRUSTED"

        if score >= 50:
            return "ESTABLISHED"

        if score >= 25:
            return "DEVELOPING"

        return "NEW"

    @staticmethod
    async def recompute(
        db: AsyncSession,
        user_id: UUID,
    ) -> ReputationProfile:

        user = await UserRepository.get_by_id(
            db,
            user_id,
        )

        if not user:
            raise HTTPException(
                status_code=404,
                detail="Utilisateur introuvable.",
            )

        completed = (
            await ReputationRepository.count_completed(
                db,
                user_id,
            )
        )

        completed_as_buyer = (
            await ReputationRepository
            .count_completed_as_buyer(
                db,
                user_id,
            )
        )

        completed_as_seller = (
            await ReputationRepository
            .count_completed_as_seller(
                db,
                user_id,
            )
        )

        cancelled = (
            await ReputationRepository.count_cancelled(
                db,
                user_id,
            )
        )

        review_count, average_rating = (
            await ReputationRepository.review_stats(
                db,
                user_id,
            )
        )

        profile = (
            await ReputationRepository.get_profile(
                db,
                user_id,
            )
        )

        if not profile:
            profile = ReputationProfile(
                user_id=user_id,
            )

            db.add(profile)

        # Pour l'instant :
        # identité/business seront connectés
        # à user_verifications ensuite.

        identity_verified = (    await VerificationRepository.is_verified(db,        user_id,        "IDENTITY",    ))
        business_verified = (    await VerificationRepository.is_verified(db,        user_id,        "BUSINESS",    ))

        profile.identity_verified = identity_verified
        profile.business_verified = business_verified

        score = ReputationService.calculate_score(
            phone_verified=user.phone_verified,
            identity_verified=identity_verified,
            business_verified=business_verified,
            completed_transactions=completed,
            cancelled_transactions=cancelled,
            review_count=review_count,
            average_rating=average_rating,
        )

        profile.completed_transactions = completed
        profile.completed_as_buyer = completed_as_buyer
        profile.completed_as_seller = completed_as_seller

        profile.cancelled_transactions = cancelled

        profile.review_count = review_count

        profile.average_rating = (
            Decimal(str(round(average_rating, 2)))
            if average_rating is not None
            else None
        )

        profile.phone_verified = (
            user.phone_verified
        )

        profile.trust_score = score

        profile.trust_level = (
            ReputationService.calculate_level(
                score
            )
        )

        await db.commit()
        await db.refresh(profile)

        return profile