from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.schemas.billing import (
    BillingOrderResponse,
    BillingPaymentResponse,
    PaymentCreate,
    PaymentFailureRequest,
    PaymentWebhookPayload,
)
from app.services.billing_service import BillingService
from app.services.payment_provider import PaymentProvider


router = APIRouter(
    prefix="/billing",
    tags=["Billing"],
)


@router.post(
    "/orders/{order_id}/payments",
    response_model=BillingPaymentResponse,
    status_code=201,
)
async def create_payment(
    order_id: UUID,
    data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await BillingService.create_payment(
        db,
        order_id,
        current_user.id,
        data.payment_method,
        data.provider,
        current_user.phone,
    )


@router.post(
    "/orders/{order_id}/simulate-payment",
)
async def simulate_order_payment(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not settings.SIMULATED_PAYMENTS_ENABLED:
        raise HTTPException(
            status_code=403,
            detail="Paiement simulé désactivé.",
        )

    return await BillingService.simulate_order_payment(
        db,
        order_id,
        current_user.id,
    )


@router.post(
    "/payments/{payment_id}/simulate-success",
)
async def simulate_payment_success(
    payment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not settings.SIMULATED_PAYMENTS_ENABLED:
        raise HTTPException(
            status_code=403,
            detail="Paiement simulé désactivé.",
        )

    return await BillingService.confirm_payment(
        db,
        payment_id,
        current_user.id,
    )


@router.post(
    "/payments/{payment_id}/fail",
    response_model=BillingPaymentResponse,
)
async def fail_payment(
    payment_id: UUID,
    data: PaymentFailureRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await BillingService.fail_payment(
        db,
        payment_id,
        current_user.id,
        data.reason,
    )


@router.post(
    "/orders/{order_id}/cancel",
    response_model=BillingOrderResponse,
)
async def cancel_order(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await BillingService.cancel_order(
        db,
        order_id,
        current_user.id,
    )


@router.get(
    "/orders/{order_id}/receipt",
)
async def get_receipt(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await BillingService.get_receipt(
        db,
        order_id,
        current_user.id,
    )


@router.post(
    "/webhooks/provider",
)
async def provider_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_signature: str | None = Header(default=None),
):
    raw_body = await request.body()
    if not PaymentProvider.verify_webhook_signature(raw_body, x_signature):
        raise HTTPException(status_code=401, detail="Signature webhook invalide.")

    payload = PaymentWebhookPayload.model_validate_json(raw_body)
    return await BillingService.provider_webhook(
        db,
        reference=payload.reference,
        status_value=payload.status,
        provider_transaction_id=payload.provider_transaction_id,
        failure_reason=payload.failure_reason,
        provider_response=payload.provider_response,
    )
