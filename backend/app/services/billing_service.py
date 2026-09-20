from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.billing import BillingPayment
from app.repositories.billing_repository import (
    BillingRepository,
)
from app.repositories.listing_repository import (
    ListingRepository,
)
from app.repositories.publication_repository import (
    PublicationRepository,
)
from app.services.notification_service import NotificationService


class BillingService:

    @staticmethod
    async def create_payment(
        db: AsyncSession,
        order_id: UUID,
        user_id: UUID,
        payment_method: str,
        provider: str | None,
    ):
        order = await BillingRepository.get_order(
            db,
            order_id,
        )

        if not order:
            raise HTTPException(
                status_code=404,
                detail="Commande introuvable.",
            )

        if order.user_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="Cette commande ne vous appartient pas.",
            )

        if order.status == "PAID":
            raise HTTPException(
                status_code=400,
                detail="Cette commande est déjà payée.",
            )

        if order.status not in {
            "CREATED",
            "PENDING_PAYMENT",
        }:
            raise HTTPException(
                status_code=400,
                detail="Cette commande ne peut plus être payée.",
            )

        payment = BillingPayment(
            billing_order_id=order.id,
            user_id=user_id,

            amount=order.total_amount,
            currency=order.currency,

            payment_method=payment_method.upper(),
            provider=(
                provider.upper()
                if provider
                else None
            ),

            external_reference=(
                f"PAY-{uuid4().hex[:12].upper()}"
            ),

            status="PENDING",
        )

        db.add(payment)

        await db.commit()
        await db.refresh(payment)

        return payment

    @staticmethod
    async def confirm_payment(
        db: AsyncSession,
        payment_id: UUID,
        user_id: UUID,
    ):
        payment = await BillingRepository.get_payment(
            db,
            payment_id,
        )

        if not payment:
            raise HTTPException(
                status_code=404,
                detail="Paiement introuvable.",
            )

        if payment.user_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="Ce paiement ne vous appartient pas.",
            )

        if payment.status == "SUCCESS":
            raise HTTPException(
                status_code=400,
                detail="Paiement déjà confirmé.",
            )

        order = await BillingRepository.get_order(
            db,
            payment.billing_order_id,
        )

        if not order:
            raise HTTPException(
                status_code=404,
                detail="Commande introuvable.",
            )

        publication = (
            await PublicationRepository.get_publication(
                db,
                order.publication_id,
            )
        )

        if not publication:
            raise HTTPException(
                status_code=404,
                detail="Publication introuvable.",
            )

        listing = await ListingRepository.get_by_id(
            db,
            order.listing_id,
        )

        if not listing:
            raise HTTPException(
                status_code=404,
                detail="Annonce introuvable.",
            )

        now = datetime.now(timezone.utc)

        # ----------------------------------------
        # RENOUVELLEMENT :
        # on ne fait pas perdre les jours restants
        # ----------------------------------------

        if (
            listing.expires_at
            and listing.expires_at > now
        ):
            start_for_extension = listing.expires_at
        else:
            start_for_extension = now

        ends_at = (
            start_for_extension
            + timedelta(
                days=publication.duration_days
            )
        )

        payment.status = "SUCCESS"
        payment.paid_at = now

        payment.provider_transaction_id = (
            f"SIM-{uuid4().hex[:12].upper()}"
        )

        order.status = "PAID"
        order.paid_at = now

        publication.status = "ACTIVE"
        publication.starts_at = now
        publication.ends_at = ends_at

        listing.status = "ACTIVE"

        if not listing.published_at:
            listing.published_at = now

        listing.expires_at = ends_at

        await NotificationService.create(
            db,
            user_id=listing.seller_id,
            notification_type="LISTING_PUBLISHED",
            title="Annonce publiée",
            message=(
                "Votre paiement a été confirmé "
                "et votre annonce est maintenant "
                "en ligne."
            ),
            data={
                "listing_id": str(listing.id),
                "expires_at": listing.expires_at.isoformat(),
            },
            commit=False,
        )

        await db.commit()

        await db.refresh(payment)
        await db.refresh(order)
        await db.refresh(publication)
        await db.refresh(listing)

        return {
            "payment_id": payment.id,
            "payment_status": payment.status,

            "order_id": order.id,
            "order_status": order.status,

            "listing_id": listing.id,
            "listing_status": listing.status,

            "published_at": listing.published_at,
            "expires_at": listing.expires_at,
        }

    @staticmethod
    async def simulate_order_payment(
        db: AsyncSession,
        order_id: UUID,
        user_id: UUID,
    ):
        order = await BillingRepository.get_order(
            db,
            order_id,
        )

        if not order or order.user_id != user_id:
            raise HTTPException(
                status_code=404,
                detail="Commande introuvable.",
            )

        publication = (
            await PublicationRepository.get_publication(
                db,
                order.publication_id,
            )
        )

        if not publication:
            raise HTTPException(
                status_code=404,
                detail="Publication introuvable.",
            )

        listing = await ListingRepository.get_by_id(
            db,
            order.listing_id,
        )

        if not listing:
            raise HTTPException(
                status_code=404,
                detail="Annonce introuvable.",
            )

        if order.status == "PAID":
            return {
                "status": "PAID",
                "listing_status": listing.status,
                "expires_at": listing.expires_at,
            }

        if order.status not in {
            "CREATED",
            "PENDING",
            "PENDING_PAYMENT",
        }:
            raise HTTPException(
                status_code=400,
                detail="Cette commande ne peut plus être payée.",
            )

        now = datetime.now(timezone.utc)
        base_date = max(
            listing.expires_at or now,
            now,
        )
        expires_at = base_date + timedelta(
            days=publication.duration_days,
        )

        payment = BillingPayment(
            billing_order_id=order.id,
            user_id=user_id,
            amount=order.total_amount,
            currency=order.currency,
            payment_method="SIMULATED",
            provider="SIMULATED",
            external_reference=f"SIM-{uuid4().hex[:12].upper()}",
            provider_transaction_id=f"SIM-{uuid4().hex[:12].upper()}",
            status="PAID",
            paid_at=now,
        )

        db.add(payment)

        order.status = "PAID"
        order.paid_at = now

        publication.status = "ACTIVE"
        publication.starts_at = now
        publication.ends_at = expires_at

        listing.status = "ACTIVE"

        if not listing.published_at:
            listing.published_at = now

        listing.expires_at = expires_at

        await NotificationService.create(
            db,
            user_id=listing.seller_id,
            notification_type="LISTING_PUBLISHED",
            title="Annonce publiée",
            message=(
                "Votre paiement a été confirmé "
                "et votre annonce est maintenant en ligne."
            ),
            data={
                "listing_id": str(listing.id),
                "expires_at": listing.expires_at.isoformat(),
            },
            commit=False,
        )

        await db.commit()
        await db.refresh(listing)

        return {
            "status": "PAID",
            "listing_status": listing.status,
            "expires_at": listing.expires_at,
        }
