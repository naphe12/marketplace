from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:

    @staticmethod
    async def get_by_phone(
        db: AsyncSession,
        phone: str,
    ) -> User | None:

        result = await db.execute(
            select(User)
            .where(User.phone == phone)
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_email(
        db: AsyncSession,
        email: str,
    ) -> User | None:

        result = await db.execute(
            select(User)
            .where(User.email == email)
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        user_id,
    ) -> User | None:

        result = await db.execute(
            select(User)
            .where(User.id == user_id)
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def exists(
        db: AsyncSession,
        phone: str,
        email: str | None = None,
    ) -> bool:

        conditions = [User.phone == phone]

        if email:
            conditions.append(
                User.email == email
            )

        result = await db.execute(
            select(User.id)
            .where(or_(*conditions))
        )

        return result.scalar_one_or_none() is not None