import base64
import html
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.models.password_reset import PasswordResetToken
from app.models.user import User, UserProfile
from app.repositories.user_repository import UserRepository
from app.schemas.auth import RegisterRequest, UserProfileUpdate
from app.services.sms_service import SmsService


def generate_avatar_data_url(label: str) -> str:
    initials = "".join(part[:1] for part in label.split()[:2]).upper() or "U"
    escaped_initials = html.escape(initials)
    palette = [
        ("#0f766e", "#ccfbf1"),
        ("#1d4ed8", "#dbeafe"),
        ("#7c2d12", "#ffedd5"),
        ("#6d28d9", "#ede9fe"),
        ("#be123c", "#ffe4e6"),
    ]
    index = sum(ord(char) for char in label) % len(palette)
    foreground, background = palette[index]
    svg = (
        "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'>"
        f"<rect width='160' height='160' rx='80' fill='{background}'/>"
        f"<text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' "
        f"font-family='Arial, sans-serif' font-size='58' font-weight='700' fill='{foreground}'>"
        f"{escaped_initials}</text>"
        "</svg>"
    )
    encoded = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"


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

        display_name = (
            f"{data.first_name or ''} "
            f"{data.last_name or ''}"
        ).strip() or user.phone

        profile = UserProfile(
            user_id=user.id,
            first_name=data.first_name,
            last_name=data.last_name,
            display_name=display_name,
            avatar_url=generate_avatar_data_url(display_name),
        )

        db.add(profile)

        await db.commit()
        await db.refresh(user)

        token = create_access_token(
            str(user.id)
        )

        loaded_user = await UserRepository.get_by_id(
            db,
            user.id,
        )

        return loaded_user or user, token

    @staticmethod
    async def update_profile(
        db: AsyncSession,
        user: User,
        data: UserProfileUpdate,
    ) -> User:
        values = data.model_dump(exclude_unset=True)

        if "email" in values:
            email = values.pop("email")
            if email != user.email:
                if email and await UserRepository.get_by_email(db, email):
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Cet email est déjà utilisé.",
                    )
                user.email = email
                user.email_verified = False

        if user.profile is None:
            user.profile = UserProfile(user_id=user.id)

        profile = user.profile
        for key, value in values.items():
            if isinstance(value, str):
                value = value.strip() or None
            setattr(profile, key, value)

        if not profile.display_name:
            profile.display_name = (
                f"{profile.first_name or ''} {profile.last_name or ''}"
            ).strip() or None

        await db.commit()
        await db.refresh(user)
        return await UserRepository.get_by_id(db, user.id) or user

    @staticmethod
    async def request_password_reset(
        db: AsyncSession,
        phone: str,
    ) -> dict:
        user = await UserRepository.get_by_phone(db, phone)

        if not user:
            return {"message": "Si le compte existe, un code a été envoyé."}

        code = f"{secrets.randbelow(1000000):06d}"
        now = datetime.now(timezone.utc)

        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=hash_password(code),
                expires_at=now + timedelta(minutes=15),
            )
        )

        await SmsService.send_password_reset(user.phone, code)
        await db.commit()

        return {"message": "Si le compte existe, un code a été envoyé."}

    @staticmethod
    async def confirm_password_reset(
        db: AsyncSession,
        phone: str,
        code: str,
        new_password: str,
    ) -> dict:
        user = await UserRepository.get_by_phone(db, phone)

        if not user:
            raise HTTPException(status_code=400, detail="Code invalide ou expiré.")

        now = datetime.now(timezone.utc)
        tokens = (
            await db.scalars(
                select(PasswordResetToken)
                .where(
                    PasswordResetToken.user_id == user.id,
                    PasswordResetToken.used_at.is_(None),
                    PasswordResetToken.expires_at > now,
                )
                .order_by(PasswordResetToken.created_at.desc())
            )
        ).all()

        matched = next(
            (token for token in tokens if verify_password(code, token.token_hash)),
            None,
        )

        if not matched:
            raise HTTPException(status_code=400, detail="Code invalide ou expiré.")

        matched.used_at = now
        user.password_hash = hash_password(new_password)

        await db.commit()

        return {"reset": True}

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