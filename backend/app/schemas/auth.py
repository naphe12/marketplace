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

    country_code: str = Field(
        default="BI",
        min_length=2,
        max_length=2,
    )


class LoginRequest(BaseModel):
    phone: str
    password: str


class PasswordResetRequest(BaseModel):
    phone: str = Field(min_length=8, max_length=30)


class PasswordResetConfirm(BaseModel):
    phone: str = Field(min_length=8, max_length=30)
    code: str = Field(min_length=6, max_length=20)
    new_password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserProfileResponse(BaseModel):
    first_name: str | None
    last_name: str | None
    display_name: str | None
    avatar_url: str | None
    bio: str | None
    preferred_language: str

    model_config = ConfigDict(
        from_attributes=True
    )


class UserProfileUpdate(BaseModel):
    email: EmailStr | None = None
    country_code: str | None = Field(default=None, min_length=2, max_length=2)
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    display_name: str | None = Field(default=None, max_length=150)
    avatar_url: str | None = Field(default=None, max_length=2000)
    bio: str | None = Field(default=None, max_length=2000)
    preferred_language: str | None = Field(default=None, max_length=10)


class UserResponse(BaseModel):
    id: UUID
    phone: str
    email: str | None
    country_code: str
    account_type: str
    status: str
    is_admin: bool
    phone_verified: bool
    email_verified: bool
    identity_verification_status: str | None = None
    profile: UserProfileResponse | None = None

    model_config = ConfigDict(
        from_attributes=True
    )


class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"