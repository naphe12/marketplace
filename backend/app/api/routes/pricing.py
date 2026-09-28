from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.pricing import PricingEstimateRequest, PricingEstimateResponse
from app.services.pricing_service import PricingService


router = APIRouter(prefix="/pricing", tags=["Pricing"])


@router.post("/estimate", response_model=PricingEstimateResponse)
async def estimate_listing_price(
    data: PricingEstimateRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await PricingService.estimate(db, data)
