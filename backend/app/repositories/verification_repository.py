from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.verification import (
    PhoneVerificationChallenge,
    UserVerification,
)


class VerificationRepository:

    @staticmethod
    async def get_latest(
        db: AsyncSession,
        user_id: UUID,
        verification_type: str,
    ) -> UserVerification | None:

        result = await db.execute(
            select(UserVerification)
            .where(
                UserVerification.user_id == user_id,
                UserVerification.verification_type
                == verification_type,
            )
            .order_by(
                UserVerification.created_at.desc()
            )
            .limit(1)
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def is_verified(
        db: AsyncSession,
        user_id: UUID,
        verification_type: str,
    ) -> bool:

        result = await db.execute(
            select(UserVerification.id)
            .where(
                UserVerification.user_id == user_id,
                UserVerification.verification_type
                == verification_type,
                UserVerification.status
                == "VERIFIED",
            )
            .limit(1)
        )

        return result.scalar_one_or_none() is not None

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        verification_id: UUID,
    ) -> UserVerification | None:

        result = await db.execute(
            select(UserVerification)
            .where(
                UserVerification.id
                == verification_id
            )
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def get_pending(
        db: AsyncSession,
    ) -> list[UserVerification]:

        result = await db.execute(
            select(UserVerification)
            .where(
                UserVerification.status
                == "PENDING"
            )
            .order_by(
                UserVerification.created_at.asc()
            )
        )

        return list(result.scalars().all())

    @staticmethod
    async def get_active_phone_challenge(
        db: AsyncSession,
        user_id: UUID,
    ) -> PhoneVerificationChallenge | None:

        result = await db.execute(
            select(PhoneVerificationChallenge)
            .where(
                PhoneVerificationChallenge.user_id
                == user_id,
                PhoneVerificationChallenge.verified_at
                .is_(None),
            )
            .order_by(
                PhoneVerificationChallenge.created_at
                .desc()
            )
            .limit(1)
        )

        return result.scalar_one_or_none()