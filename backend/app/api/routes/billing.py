from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.billing import (
    BillingPaymentResponse,
    PaymentCreate,
)
from app.services.billing_service import BillingService


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
    )


@router.post(
    "/payments/{payment_id}/simulate-success",
)
async def simulate_payment_success(
    payment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await BillingService.confirm_payment(
        db,
        payment_id,
        current_user.id,
    )