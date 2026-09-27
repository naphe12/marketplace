from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.repositories.transaction_repository import (
    TransactionRepository,
)
from app.schemas.review import (
    ReviewCreate,
    ReviewResponse,
)
from app.schemas.transaction import (
    DeliveryCreateRequest,
    DeliveryDisputeRequest,
    DeliveryResponse,
    DeliveryTrackingRequest,
    TransactionCancelRequest,
    TransactionResponse,
)
from app.services.transaction_service import (
    TransactionService,
)

from datetime import (
    datetime,
    timezone,
)
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from sqlalchemy import (
    or_,
    select,
)
from sqlalchemy.orm import selectinload

from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.api.dependencies import (
    get_current_user,
)

from app.core.database import get_db

from app.models.listing import Listing
from app.models.transaction import Transaction
from app.models.delivery import Delivery
from app.models.user import User
from app.services.listing_publication_service import utcnow


router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"],
)


@router.get(
    "/mine",
    response_model=list[TransactionResponse],
)
async def my_transactions(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.scalars(
        select(Transaction)
        .options(selectinload(Transaction.delivery))
        .where(
            or_(
                Transaction.buyer_id == current_user.id,
                Transaction.seller_id == current_user.id,
            )
        )
        .order_by(Transaction.created_at.desc())
    )
    return result.all()

@router.get("")
async def list_my_transactions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.scalars(
        select(Transaction)
        .options(selectinload(Transaction.delivery))
        .where(
            or_(
                Transaction.buyer_id == current_user.id,
                Transaction.seller_id == current_user.id,
            )
        )
        .order_by(
            Transaction.created_at.desc(),
        )
    )

    return result.all()


@router.get(
    "/{transaction_id}",
)
async def get_transaction(
    transaction_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_user_transaction(
        db,
        transaction_id,
        current_user.id,
    )


@router.post(
    "/{transaction_id}/confirm",
)
async def confirm_transaction(
    transaction_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction = await get_user_transaction(
        db,
        transaction_id,
        current_user.id,
    )

    if transaction.status != "ACCEPTED":
        raise HTTPException(
            status_code=400,
            detail=(
                "Cette transaction ne peut "
                "plus être confirmée."
            ),
        )

    now = utcnow()

    if current_user.id == transaction.buyer_id:
        if transaction.buyer_confirmed_at is None:
            transaction.buyer_confirmed_at = now

    elif current_user.id == transaction.seller_id:
        if transaction.seller_confirmed_at is None:
            transaction.seller_confirmed_at = now

    #
    # Les deux ont confirmé
    #
    if (
        transaction.buyer_confirmed_at
        and transaction.seller_confirmed_at
    ):
        transaction.status = "COMPLETED"
        transaction.completed_at = now

        listing = await db.get(
            Listing,
            transaction.listing_id,
        )

        if listing:
            listing.status = "SOLD"

    await db.commit()
    await db.refresh(transaction)

    return {
        "id": transaction.id,
        "status": transaction.status,

        "buyer_confirmed":
            transaction.buyer_confirmed_at
            is not None,

        "seller_confirmed":
            transaction.seller_confirmed_at
            is not None,

        "completed_at":
            transaction.completed_at,
    }


@router.post(
    "/{transaction_id}/cancel",
)
async def cancel_transaction(
    transaction_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction = await get_user_transaction(
        db,
        transaction_id,
        current_user.id,
    )

    if transaction.status != "ACCEPTED":
        raise HTTPException(
            status_code=400,
            detail=(
                "Cette transaction ne peut "
                "plus être annulée."
            ),
        )

    transaction.status = "CANCELLED"
    transaction.cancelled_at = utcnow()

    listing = await db.get(
        Listing,
        transaction.listing_id,
    )

    if listing and listing.status == "RESERVED":
        listing.status = "ACTIVE"

    await db.commit()

    return {
        "status": "CANCELLED",
        "listing_status":
            listing.status if listing else None,
    }


@router.post(
    "/{transaction_id}/delivery",
    response_model=DeliveryResponse,
    status_code=201,
)
async def create_delivery(
    transaction_id: UUID,
    data: DeliveryCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction = await get_user_transaction(db, transaction_id, current_user.id)

    if transaction.delivery:
        raise HTTPException(status_code=400, detail="Une livraison existe déjà pour cette transaction.")

    if transaction.status not in {"ACCEPTED", "COMPLETED"}:
        raise HTTPException(status_code=400, detail="Cette transaction ne peut pas recevoir une livraison.")

    delivery = Delivery(
        transaction_id=transaction.id,
        requested_by_user_id=current_user.id,
        pickup_address=data.pickup_address.strip(),
        dropoff_address=data.dropoff_address.strip(),
        carrier_name=data.carrier_name.strip() if data.carrier_name else None,
        fee_amount=data.fee_amount,
        currency=data.currency.upper(),
        status="REQUESTED",
    )
    db.add(delivery)
    await db.commit()
    await db.refresh(delivery)
    return delivery


async def get_user_delivery(
    db: AsyncSession,
    transaction_id: UUID,
    user_id: UUID,
) -> tuple[Transaction, Delivery]:
    transaction = await get_user_transaction(db, transaction_id, user_id)
    if not transaction.delivery:
        raise HTTPException(status_code=404, detail="Livraison introuvable.")
    return transaction, transaction.delivery


@router.post(
    "/{transaction_id}/delivery/accept",
    response_model=DeliveryResponse,
)
async def accept_delivery(
    transaction_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction, delivery = await get_user_delivery(db, transaction_id, current_user.id)
    if current_user.id != transaction.seller_id:
        raise HTTPException(status_code=403, detail="Seul le vendeur peut accepter la livraison.")
    if delivery.status != "REQUESTED":
        raise HTTPException(status_code=400, detail="Cette livraison ne peut plus être acceptée.")
    delivery.status = "ACCEPTED"
    delivery.accepted_at = utcnow()
    await db.commit()
    await db.refresh(delivery)
    return delivery


@router.post(
    "/{transaction_id}/delivery/pickup",
    response_model=DeliveryResponse,
)
async def mark_delivery_picked_up(
    transaction_id: UUID,
    data: DeliveryTrackingRequest | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction, delivery = await get_user_delivery(db, transaction_id, current_user.id)
    if current_user.id != transaction.seller_id:
        raise HTTPException(status_code=403, detail="Seul le vendeur peut marquer la prise en charge.")
    if delivery.status not in {"REQUESTED", "ACCEPTED"}:
        raise HTTPException(status_code=400, detail="Cette livraison ne peut pas passer en cours.")
    delivery.status = "IN_TRANSIT"
    delivery.picked_up_at = utcnow()
    if data and data.tracking_reference:
        delivery.tracking_reference = data.tracking_reference.strip()
    await db.commit()
    await db.refresh(delivery)
    return delivery


@router.post(
    "/{transaction_id}/delivery/deliver",
    response_model=DeliveryResponse,
)
async def mark_delivery_delivered(
    transaction_id: UUID,
    data: DeliveryTrackingRequest | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction, delivery = await get_user_delivery(db, transaction_id, current_user.id)
    if current_user.id != transaction.buyer_id:
        raise HTTPException(status_code=403, detail="Seul l'acheteur peut confirmer la réception.")
    if delivery.status not in {"IN_TRANSIT", "ACCEPTED"}:
        raise HTTPException(status_code=400, detail="Cette livraison ne peut pas être livrée.")
    delivery.status = "DELIVERED"
    delivery.delivered_at = utcnow()
    if data and data.proof_url:
        delivery.proof_url = data.proof_url.strip()
    await db.commit()
    await db.refresh(delivery)
    return delivery


@router.post(
    "/{transaction_id}/delivery/dispute",
    response_model=DeliveryResponse,
)
async def dispute_delivery(
    transaction_id: UUID,
    data: DeliveryDisputeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _, delivery = await get_user_delivery(db, transaction_id, current_user.id)
    if delivery.status in {"DELIVERED", "CANCELLED"}:
        raise HTTPException(status_code=400, detail="Cette livraison ne peut plus être contestée.")
    delivery.status = "DISPUTED"
    delivery.dispute_reason = data.reason.strip()
    delivery.disputed_at = utcnow()
    await db.commit()
    await db.refresh(delivery)
    return delivery


@router.post(
    "/{transaction_id}/delivery/cancel",
    response_model=DeliveryResponse,
)
async def cancel_delivery(
    transaction_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction, delivery = await get_user_delivery(db, transaction_id, current_user.id)
    if current_user.id not in {transaction.buyer_id, transaction.seller_id}:
        raise HTTPException(status_code=403, detail="Accès refusé.")
    if delivery.status in {"DELIVERED", "CANCELLED"}:
        raise HTTPException(status_code=400, detail="Cette livraison ne peut plus être annulée.")
    delivery.status = "CANCELLED"
    delivery.cancelled_at = utcnow()
    await db.commit()
    await db.refresh(delivery)
    return delivery


@router.post(
    "/{transaction_id}/reviews",
    response_model=ReviewResponse,
    status_code=201,
)
async def create_review(
    transaction_id: UUID,
    data: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await TransactionService.create_review(
        db,
        transaction_id,
        current_user.id,
        data.rating,
        data.comment,
    )

async def get_user_transaction(
    db: AsyncSession,
    transaction_id: UUID,
    user_id: UUID,
) -> Transaction:
    transaction = await db.scalar(
        select(Transaction)
        .options(selectinload(Transaction.delivery))
        .where(
            Transaction.id == transaction_id,
            or_(
                Transaction.buyer_id == user_id,
                Transaction.seller_id == user_id,
            ),
        )
    )

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction introuvable.",
        )

    return transaction