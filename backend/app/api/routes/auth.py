from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RegisterRequest,
    UserProfileUpdate,
    UserResponse,
)
from app.repositories.verification_repository import VerificationRepository
from app.services.auth_service import AuthService


async def serialize_user_response(db: AsyncSession, user) -> UserResponse:
    response = UserResponse.model_validate(user)
    identity = await VerificationRepository.get_latest(
        db,
        user.id,
        "IDENTITY",
    )
    response.identity_verification_status = identity.status if identity else None
    return response


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
        user=await serialize_user_response(db, user),
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
        user=await serialize_user_response(db, user),
        access_token=token,
    )


@router.post(
    "/password-reset/request",
)
async def request_password_reset(
    data: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
):
    return await AuthService.request_password_reset(
        db,
        data.phone,
    )


@router.post(
    "/password-reset/confirm",
)
async def confirm_password_reset(
    data: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db),
):
    return await AuthService.confirm_password_reset(
        db,
        data.phone,
        data.code,
        data.new_password,
    )


@router.get(
    "/me",
    response_model=UserResponse,
)
async def me(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await serialize_user_response(db, current_user)


@router.patch(
    "/me",
    response_model=UserResponse,
)
async def update_me(
    data: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user = await AuthService.update_profile(
        db,
        current_user,
        data,
    )
    return await serialize_user_response(db, user)
