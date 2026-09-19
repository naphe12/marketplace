from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.models.user import User, UserProfile
from app.repositories.user_repository import UserRepository
from app.schemas.auth import RegisterRequest


class AuthService:

    @staticmethod
    async def register(
        db: AsyncSession,
        data: RegisterRequest,
    ) -> tuple[User, str]:

        exists = await UserRepository.exists(
            db,
            phone=data.phone,
            email=data.email,
        )

        if exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Un utilisateur avec ce téléphone ou cet email existe déjà.",
            )

        user = User(
            phone=data.phone,
            email=data.email,
            password_hash=hash_password(
                data.password
            ),
        )

        db.add(user)

        # Important :
        # génère user.id avant de créer le profil
        await db.flush()

        profile = UserProfile(
            user_id=user.id,
            first_name=data.first_name,
            last_name=data.last_name,
            display_name=(
                f"{data.first_name or ''} "
                f"{data.last_name or ''}"
            ).strip() or None,
        )

        db.add(profile)

        await db.commit()
        await db.refresh(user)

        token = create_access_token(
            str(user.id)
        )

        return user, token

    @staticmethod
    async def authenticate(
        db: AsyncSession,
        phone: str,
        password: str,
    ) -> tuple[User, str]:

        user = await UserRepository.get_by_phone(
            db,
            phone,
        )

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Téléphone ou mot de passe incorrect.",
            )

        if not verify_password(
            password,
            user.password_hash,
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Téléphone ou mot de passe incorrect.",
            )

        if str(user.status) not in (
            "ACTIVE",
            "UserStatus.ACTIVE",
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Compte non actif.",
            )

        token = create_access_token(
            str(user.id)
        )

        return user, token