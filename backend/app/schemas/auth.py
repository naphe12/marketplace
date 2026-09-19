from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    phone: str = Field(
        min_length=8,
        max_length=30,
    )

    email: EmailStr | None = None

    password: str = Field(
        min_length=8,
        max_length=128,
    )

    first_name: str | None = Field(
        default=None,
        max_length=100,
    )

    last_name: str | None = Field(
        default=None,
        max_length=100,
    )


class LoginRequest(BaseModel):
    phone: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: UUID

    phone: str
    email: str | None

    phone_verified: bool
    email_verified: bool

    account_type: str
    status: str

    model_config = ConfigDict(
        from_attributes=True
    )


class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"