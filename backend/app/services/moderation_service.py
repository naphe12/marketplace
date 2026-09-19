from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.moderation import (
    FraudSignal,
    ModerationAction,
    Report,
    UserBlock,
)
from app.models.trust import TrustEvent
from app.repositories.listing_repository import (
    ListingRepository,
)
from app.repositories.moderation_repository import (
    ModerationRepository,
)
from app.repositories.user_repository import (
    UserRepository,
)

from app.services.notification_service import NotificationService

from sqlalchemy import select


class ModerationService:

    @staticmethod
    async def create_report(
        db: AsyncSession,
        reporter_id: UUID,
        target_type: str,
        target_id: UUID,
        reason: str,
        description: str | None,
    ):

        target_type = target_type.upper()

        if target_type not in {
            "LISTING",
            "USER",
            "MESSAGE",
        }:
            raise HTTPException(
                status_code=400,
                detail="Type de cible invalide.",
            )

        if (
            target_type == "USER"
            and target_id == reporter_id
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Vous ne pouvez pas "
                    "vous signaler vous-même."
                ),
            )

        report = Report(
            reporter_id=reporter_id,
            target_type=target_type,
            target_id=target_id,

            reason=reason.upper(),
            description=description,

            status="PENDING",
            priority="NORMAL",
        )

        db.add(report)

        await db.commit()
        await db.refresh(report)

        return report

    @staticmethod
    async def create_fraud_signal(
        db: AsyncSession,
        *,
        user_id: UUID | None = None,
        listing_id: UUID | None = None,
        signal_type: str,
        risk_score: Decimal,
        signal_data: dict | None = None,
    ):

        if risk_score >= Decimal("80"):
            severity = "CRITICAL"

        elif risk_score >= Decimal("60"):
            severity = "HIGH"

        elif risk_score >= Decimal("30"):
            severity = "MEDIUM"

        else:
            severity = "LOW"

        signal = FraudSignal(
            user_id=user_id,
            listing_id=listing_id,

            signal_type=signal_type.upper(),

            risk_score=risk_score,
            severity=severity,

            status="OPEN",

            signal_data=signal_data,
        )

        db.add(signal)

        await db.commit()
        await db.refresh(signal)

        return signal

    @staticmethod
    async def moderate(
        db: AsyncSession,
        admin_id: UUID,
        target_type: str,
        target_id: UUID,
        action_type: str,
        reason: str,
        report_id: UUID | None = None,
        fraud_signal_id: UUID | None = None,
    ):

        target_type = target_type.upper()
        action_type = action_type.upper()

        previous_status = None
        new_status = None

        target_user_id = None

        # ====================================
        # ANNONCE
        # ====================================

        if target_type == "LISTING":

            listing = await ListingRepository.get_by_id(
                db,
                target_id,
            )

            if not listing:
                raise HTTPException(
                    status_code=404,
                    detail="Annonce introuvable.",
                )

            previous_status = listing.status

            if action_type == "SUSPEND":

                listing.status = "SUSPENDED"

                await NotificationService.create(
                    db,
                    user_id=listing.seller_id,
                    notification_type="LISTING_SUSPENDED",
                    title="Annonce suspendue",
                    message=reason,
                    data={"listing_id": str(listing.id)},
                    commit=False,
                )

            elif action_type == "RESTORE":

                listing.status = "ACTIVE"

            elif action_type == "REMOVE":

                listing.status = "REMOVED"

                listing.deleted_at = (
                    datetime.now(timezone.utc)
                )

            else:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Action invalide "
                        "pour une annonce."
                    ),
                )

            new_status = listing.status
            target_user_id = listing.seller_id

        # ====================================
        # UTILISATEUR
        # ====================================

        elif target_type == "USER":

            user = await UserRepository.get_by_id(
                db,
                target_id,
            )

            if not user:
                raise HTTPException(
                    status_code=404,
                    detail="Utilisateur introuvable.",
                )

            if user.id == admin_id:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Un administrateur ne peut pas "
                        "se suspendre lui-même."
                    ),
                )

            previous_status = user.status

            if action_type == "SUSPEND":

                user.status = "SUSPENDED"

                await NotificationService.create(
                    db,
                    user_id=user.id,
                    notification_type="ACCOUNT_SUSPENDED",
                    title="Compte suspendu",
                    message=reason,
                    data={"user_id": str(user.id)},
                    commit=False,
                )

            elif action_type == "BLOCK":

                user.status = "BLOCKED"

            elif action_type == "RESTORE":

                user.status = "ACTIVE"

            else:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Action invalide "
                        "pour un utilisateur."
                    ),
                )

            new_status = user.status
            target_user_id = user.id

        else:
            raise HTTPException(
                status_code=400,
                detail="Type de cible invalide.",
            )

        action = ModerationAction(
            admin_user_id=admin_id,

            target_type=target_type,
            target_id=target_id,

            report_id=report_id,
            fraud_signal_id=fraud_signal_id,

            action_type=action_type,
            reason=reason,

            previous_status=previous_status,
            new_status=new_status,
        )

        db.add(action)

        # ------------------------------------
        # Signal de confiance uniquement
        # pour une décision négative réelle
        # ------------------------------------

        if (
            target_user_id
            and action_type
            in {
                "SUSPEND",
                "BLOCK",
                "REMOVE",
            }
        ):

            trust_event = TrustEvent(
                user_id=target_user_id,

                event_type=(
                    "MODERATION_ACTION"
                ),

                source_type="MODERATION",

                source_id=action.id,

                impact=Decimal("-1"),

                event_data={
                    "action": action_type,
                    "reason": reason,
                    "target_type": target_type,
                },

                created_at=datetime.now(
                    timezone.utc
                ),
            )

            db.add(trust_event)

        await db.commit()

        return {
            "target_type": target_type,
            "target_id": target_id,

            "action": action_type,

            "previous_status":
                previous_status,

            "new_status":
                new_status,
        }

    @staticmethod
    async def review_report(
        db: AsyncSession,
        report_id: UUID,
        admin_id: UUID,
        decision: str,
        note: str | None,
    ):

        report = await ModerationRepository.get_report(
            db,
            report_id,
        )

        if not report:
            raise HTTPException(
                status_code=404,
                detail="Signalement introuvable.",
            )

        if report.status != "PENDING":
            raise HTTPException(
                status_code=400,
                detail=(
                    "Ce signalement a déjà "
                    "été traité."
                ),
            )

        decision = decision.upper()

        if decision not in {
            "CONFIRMED",
            "REJECTED",
            "IGNORED",
        }:
            raise HTTPException(
                status_code=400,
                detail="Décision invalide.",
            )

        report.status = decision

        report.reviewed_by_user_id = admin_id
        report.reviewed_at = datetime.now(
            timezone.utc
        )

        report.resolution_note = note

        await db.commit()
        await db.refresh(report)

        return report

    @staticmethod
    async def block_user(
        db: AsyncSession,
        blocker_id: UUID,
        blocked_id: UUID,
    ):

        if blocker_id == blocked_id:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Vous ne pouvez pas "
                    "vous bloquer vous-même."
                ),
            )

        existing = await db.execute(
            select(UserBlock)
            .where(
                UserBlock.blocker_user_id
                == blocker_id,

                UserBlock.blocked_user_id
                == blocked_id,
            )
        )

        block = existing.scalar_one_or_none()

        if block:
            block.active = True

        else:
            block = UserBlock(
                blocker_user_id=blocker_id,
                blocked_user_id=blocked_id,
                active=True,
            )

            db.add(block)

        await db.commit()
        await db.refresh(block)

        return {
            "blocked": True,
            "user_id": blocked_id,
        }