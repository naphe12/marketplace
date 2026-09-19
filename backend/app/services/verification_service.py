import secrets

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException
from pwdlib import PasswordHash
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.verification import (
    PhoneVerificationChallenge,
    UserVerification,
    VerificationDocument,
)
from app.repositories.user_repository import (
    UserRepository,
)
from app.repositories.verification_repository import (
    VerificationRepository,
)
from app.schemas.verification import (
    IdentityVerificationCreate,
    VerificationDocumentCreate,
)
from app.services.notification_service import NotificationService
from app.services.reputation_service import (
    ReputationService,
)


otp_hash = PasswordHash.recommended()


class VerificationService:

    @staticmethod
    async def request_phone_verification(
        db: AsyncSession,
        user_id: UUID,
    ):
        user = await UserRepository.get_by_id(
            db,
            user_id,
        )

        if not user:
            raise HTTPException(
                status_code=404,
                detail="Utilisateur introuvable.",
            )

        if user.phone_verified:
            raise HTTPException(
                status_code=400,
                detail="Téléphone déjà vérifié.",
            )

        code = f"{secrets.randbelow(1000000):06d}"

        now = datetime.now(timezone.utc)

        challenge = PhoneVerificationChallenge(
            user_id=user.id,
            phone=user.phone,

            code_hash=otp_hash.hash(code),

            attempts=0,
            max_attempts=5,

            expires_at=now + timedelta(
                minutes=10
            ),

            created_at=now,
        )

        db.add(challenge)

        await db.commit()

        # DEV seulement.
        #
        # Plus tard :
        # await SmsProvider.send(user.phone, code)

        return {
            "message": "Code de vérification envoyé.",

            # À supprimer impérativement en production.
            "dev_code": code,
        }

    @staticmethod
    async def confirm_phone(
        db: AsyncSession,
        user_id: UUID,
        code: str,
    ):
        challenge = (
            await VerificationRepository
            .get_active_phone_challenge(
                db,
                user_id,
            )
        )

        if not challenge:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Aucune vérification "
                    "en cours."
                ),
            )

        now = datetime.now(timezone.utc)

        if challenge.expires_at < now:
            raise HTTPException(
                status_code=400,
                detail="Le code a expiré.",
            )

        if (
            challenge.attempts
            >= challenge.max_attempts
        ):
            raise HTTPException(
                status_code=429,
                detail=(
                    "Nombre maximal "
                    "de tentatives atteint."
                ),
            )

        challenge.attempts += 1

        if not otp_hash.verify(
            code,
            challenge.code_hash,
        ):
            await db.commit()
            await ReputationService.recompute(    db,    user.id,)

            raise HTTPException(
                status_code=400,
                detail="Code incorrect.",
            )

        user = await UserRepository.get_by_id(
            db,
            user_id,
        )

        if not user:
            raise HTTPException(
                status_code=404,
                detail="Utilisateur introuvable.",
            )

        challenge.verified_at = now

        user.phone_verified = True

        verification = UserVerification(
            user_id=user.id,

            verification_type="PHONE",
            status="VERIFIED",

            provider="INTERNAL_OTP",

            submitted_at=now,
            reviewed_at=now,
        )

        db.add(verification)

        await db.commit()

        return {
            "verified": True,
            "phone": user.phone,
        }
    @staticmethod
    async def create_identity_verification(
        db: AsyncSession,
        user_id: UUID,
        data: IdentityVerificationCreate,
    ):
        existing = (
            await VerificationRepository.get_latest(
                db,
                user_id,
                "IDENTITY",
            )
        )

        if (
            existing
            and existing.status == "PENDING"
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Une demande de vérification "
                    "est déjà en cours."
                ),
            )

        if (
            existing
            and existing.status == "VERIFIED"
        ):
            raise HTTPException(
                status_code=409,
                detail="Identité déjà vérifiée.",
            )

        now = datetime.now(timezone.utc)

        verification = UserVerification(
            user_id=user_id,

            verification_type="IDENTITY",
            status="PENDING",

            submitted_at=now,

            verification_data={
                "document_type":
                    data.document_type,

                "document_number":
                    data.document_number,

                "first_name":
                    data.first_name,

                "last_name":
                    data.last_name,

                "country_code":
                    data.country_code,
            },
        )

        db.add(verification)

        await db.commit()
        await db.refresh(verification)

        return verification

    @staticmethod
    async def add_document(
        db: AsyncSession,
        verification_id: UUID,
        user_id: UUID,
        data: VerificationDocumentCreate,
    ):
        verification = (
            await VerificationRepository.get_by_id(
                db,
                verification_id,
            )
        )

        if not verification:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Demande de vérification "
                    "introuvable."
                ),
            )

        if verification.user_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="Accès refusé.",
            )

        if verification.status != "PENDING":
            raise HTTPException(
                status_code=400,
                detail=(
                    "Cette demande ne peut "
                    "plus être modifiée."
                ),
            )

        document = VerificationDocument(
            verification_id=verification.id,

            document_type=(
                data.document_type.upper()
            ),

            document_side=(
                data.document_side.upper()
                if data.document_side
                else None
            ),

            file_url=data.file_url,

            mime_type=data.mime_type,

            status="PENDING",
        )

        db.add(document)
        await db.commit()
        await db.refresh(document)
        return document

    @staticmethod
    async def review(
        db: AsyncSession,
        verification_id: UUID,
        admin_id: UUID,
        decision: str,
        reason: str | None,
    ):
        verification = (
            await VerificationRepository.get_by_id(
                db,
                verification_id,
            )
        )

        if not verification:
            raise HTTPException(
                status_code=404,
                detail="Vérification introuvable.",
            )

        if verification.status != "PENDING":
            raise HTTPException(
                status_code=400,
                detail=(
                    "Cette demande a déjà "
                    "été traitée."
                ),
            )

        decision = decision.upper()

        if decision not in {
            "VERIFIED",
            "REJECTED",
        }:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Le statut doit être "
                    "VERIFIED ou REJECTED."
                ),
            )

        now = datetime.now(timezone.utc)

        verification.status = decision

        verification.reviewed_at = now
        verification.reviewed_by_user_id = admin_id

        if decision == "REJECTED":
            verification.rejection_reason = reason

        else:
            verification.rejection_reason = None

        if decision == "VERIFIED":
            await NotificationService.create(
                db,
                user_id=verification.user_id,
                notification_type="VERIFICATION_APPROVED",
                title="Identité vérifiée",
                message=(
                    "Votre vérification d'identité "
                    "a été approuvée."
                ),
                data={
                    "verification_id": str(verification.id),
                },
                commit=False,
            )
        else:
            await NotificationService.create(
                db,
                user_id=verification.user_id,
                notification_type="VERIFICATION_REJECTED",
                title="Vérification refusée",
                message=(
                    reason
                    or "Votre vérification d'identité "
                    "n'a pas été approuvée."
                ),
                data={
                    "verification_id": str(verification.id),
                },
                commit=False,
            )

        await db.commit()
        await ReputationService.recompute(db,verification.user_id,)
        await db.refresh(verification)

        return verification