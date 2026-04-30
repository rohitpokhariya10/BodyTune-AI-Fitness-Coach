from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

UserRole = Literal["user", "admin"]
FitnessGoal = Literal["general_fitness", "strength", "weight_loss", "mobility"]
ExperienceLevel = Literal["beginner", "intermediate", "advanced"]
OTPPurpose = Literal["register", "forgot_password", "login_verification"]


def normalize_email_value(value: str) -> str:
    normalized = value.strip().lower()
    if "@" not in normalized or "." not in normalized.rsplit("@", 1)[-1]:
        raise ValueError("Enter a valid email address")
    return normalized


class AuthUserRead(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    is_verified: bool
    age: int | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    fitness_goal: FitnessGoal | None = None
    experience_level: ExperienceLevel | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuthUserSummary(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    is_verified: bool

    model_config = ConfigDict(from_attributes=True)


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = "user"
    admin_registration_key: str | None = Field(default=None, max_length=255)
    age: int | None = Field(default=None, ge=13, le=100)
    height_cm: float | None = Field(default=None, ge=80, le=250)
    weight_kg: float | None = Field(default=None, ge=25, le=300)
    fitness_goal: FitnessGoal | None = None
    experience_level: ExperienceLevel | None = None

    model_config = ConfigDict(extra="forbid")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return normalize_email_value(value)

    @model_validator(mode="before")
    @classmethod
    def normalize_admin_key_aliases(cls, data: object) -> object:
        if not isinstance(data, dict):
            return data

        normalized = dict(data)
        if "admin_registration_key" in normalized:
            normalized.pop("adminRegistrationKey", None)
            normalized.pop("adminKey", None)
            return normalized

        for alias in ("adminRegistrationKey", "adminKey"):
            if alias in normalized:
                normalized["admin_registration_key"] = normalized.pop(alias)
                break
        return normalized


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)

    model_config = ConfigDict(extra="forbid")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return normalize_email_value(value)


class OTPRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    purpose: OTPPurpose

    model_config = ConfigDict(extra="forbid")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return normalize_email_value(value)


class VerifyOTPRequest(OTPRequest):
    otp_code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)

    model_config = ConfigDict(extra="forbid")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return normalize_email_value(value)


class ResetPasswordRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    otp_code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: str = Field(..., min_length=8, max_length=128)

    model_config = ConfigDict(extra="forbid")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return normalize_email_value(value)


class AuthMessageResponse(BaseModel):
    message: str
    email: str
    dev_otp: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUserSummary


class LoginResponse(BaseModel):
    access_token: str | None = None
    token_type: str | None = None
    user: AuthUserSummary | None = None
    requires_verification: bool | None = None
    message: str | None = None
    email: str | None = None
    dev_otp: str | None = None
