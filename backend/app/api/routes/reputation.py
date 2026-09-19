from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.repositories.reputation_repository import (
    ReputationRepository,
)
from app.schemas.reputation import (
    ReputationProfileResponse,
)
from app.services.reputation_service import (
    ReputationService,
)


router = APIRouter(
    prefix="/reputation",
    tags=["Reputation"],
)


@router.get(
    "/me",
    response_model=ReputationProfileResponse,
)
async def my_reputation(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await ReputationService.recompute(
        db,
        current_user.id,
    )


@router.get(
    "/users/{user_id}",
    response_model=ReputationProfileResponse,
)
async def user_reputation(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    profile = (
        await ReputationRepository.get_profile(
            db,
            user_id,
        )
    )

    if profile:
        return profile

    return await ReputationService.recompute(
        db,
        user_id,
    )