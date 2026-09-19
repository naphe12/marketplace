from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    UserResponse,
)
from app.services.auth_service import AuthService


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=201,
)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    user, token = await AuthService.register(
        db,
        data,
    )

    return AuthResponse(
        user=UserResponse.model_validate(user),
        access_token=token,
    )


@router.post(
    "/login",
    response_model=AuthResponse,
)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    user, token = await AuthService.authenticate(
        db,
        data.phone,
        data.password,
    )

    return AuthResponse(
        user=UserResponse.model_validate(user),
        access_token=token,
    )


@router.get(
    "/me",
    response_model=UserResponse,
)
async def me(
    current_user=Depends(get_current_user),
):
    return current_user