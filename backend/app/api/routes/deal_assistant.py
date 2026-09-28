from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.deal_assistant import DealAssistantResponse
from app.services.deal_assistant_service import DealAssistantService


router = APIRouter(prefix="/deal-assistant", tags=["Deal Assistant"])


@router.get("/listings/{listing_id}", response_model=DealAssistantResponse)
async def assess_listing_deal(
    listing_id: UUID,
    amount: Decimal | None = Query(default=None, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await DealAssistantService.assess_listing(db, listing_id, amount)
