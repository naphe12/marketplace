from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.secure_payment import SecurePayment, TransactionDispute
from app.models.transaction import Transaction
from app.services.listing_publication_service import utcnow


class SecurePaymentService:
    @staticmethod
    async def _transaction_for_user(db: AsyncSession, transaction_id: UUID, user_id: UUID) -> Transaction:
        transaction = await db.scalar(
            select(Transaction)
            .options(selectinload(Transaction.secure_payment))
            .where(Transaction.id == transaction_id)
        )
        if not transaction or user_id not in {transaction.buyer_id, transaction.seller_id}:
            raise HTTPException(status_code=404, detail="Transaction introuvable.")
        return transaction

    @staticmethod
    async def start(db: AsyncSession, transaction_id: UUID, user_id: UUID) -> SecurePayment:
        transaction = await SecurePaymentService._transaction_for_user(db, transaction_id, user_id)
        if user_id != transaction.buyer_id:
            raise HTTPException(status_code=403, detail="Seul l'acheteur peut démarrer le paiement sécurisé.")
        if transaction.status not in {"ACCEPTED", "COMPLETED"}:
            raise HTTPException(status_code=400, detail="Cette transaction ne peut pas recevoir un paiement sécurisé.")
        if transaction.secure_payment:
            return transaction.secure_payment

        payment = SecurePayment(
            transaction_id=transaction.id,
            buyer_id=transaction.buyer_id,
            seller_id=transaction.seller_id,
            amount=transaction.agreed_price,
            currency=transaction.currency,
            status="PENDING_PAYMENT",
            provider="SIMULATED",
            external_reference=f"SEC-{uuid4().hex[:12].upper()}",
        )
        db.add(payment)
        await db.commit()
        await db.refresh(payment)
        return payment

    @staticmethod
    async def simulate_payment(db: AsyncSession, transaction_id: UUID, user_id: UUID) -> SecurePayment:
        transaction = await SecurePaymentService._transaction_for_user(db, transaction_id, user_id)
        if user_id != transaction.buyer_id:
            raise HTTPException(status_code=403, detail="Seul l'acheteur peut payer en sécurisé.")
        payment = transaction.secure_payment or await SecurePaymentService.start(db, transaction_id, user_id)
        if payment.status == "PENDING_PAYMENT":
            payment.status = "HELD"
            payment.paid_at = utcnow()
        elif payment.status != "HELD":
            raise HTTPException(status_code=400, detail="Ce paiement sécurisé ne peut plus être payé.")
        await db.commit()
        await db.refresh(payment)
        return payment

    @staticmethod
    async def release(db: AsyncSession, transaction_id: UUID, user_id: UUID) -> SecurePayment:
        transaction = await SecurePaymentService._transaction_for_user(db, transaction_id, user_id)
        if user_id != transaction.buyer_id:
            raise HTTPException(status_code=403, detail="Seul l'acheteur peut confirmer la réception.")
        payment = transaction.secure_payment
        if not payment:
            raise HTTPException(status_code=404, detail="Paiement sécurisé introuvable.")
        if payment.status != "HELD":
            raise HTTPException(status_code=400, detail="Ce paiement sécurisé ne peut pas être libéré.")

        now = utcnow()
        payment.status = "RELEASED"
        payment.released_at = now
        if transaction.buyer_confirmed_at is None:
            transaction.buyer_confirmed_at = now
        if transaction.seller_confirmed_at is not None and transaction.status == "ACCEPTED":
            transaction.status = "COMPLETED"
            transaction.completed_at = now
        await db.commit()
        await db.refresh(payment)
        return payment

    @staticmethod
    async def dispute(db: AsyncSession, transaction_id: UUID, user_id: UUID, reason: str, description: str | None) -> TransactionDispute:
        transaction = await SecurePaymentService._transaction_for_user(db, transaction_id, user_id)
        payment = transaction.secure_payment
        if not payment:
            raise HTTPException(status_code=404, detail="Paiement sécurisé introuvable.")
        if payment.status not in {"PENDING_PAYMENT", "HELD"}:
            raise HTTPException(status_code=400, detail="Ce paiement sécurisé ne peut plus être contesté.")

        payment.status = "DISPUTED"
        payment.disputed_at = utcnow()
        dispute = TransactionDispute(
            transaction_id=transaction.id,
            secure_payment_id=payment.id,
            opened_by_user_id=user_id,
            reason=reason.strip(),
            description=description.strip() if description else None,
            status="OPEN",
        )
        db.add(dispute)
        await db.commit()
        await db.refresh(dispute)
        return dispute
