from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, RootModel, StrictStr

SubscriptionStatus = Literal["active", "inactive", "expired"]


class SubscriptionPlanBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    price: float = Field(..., ge=0)
    duration_days: int = Field(..., ge=0, le=3660)
    features: list[StrictStr] = Field(default_factory=list)
    is_active: bool = True

    model_config = ConfigDict(extra="forbid")


class SubscriptionPlanCreate(SubscriptionPlanBase):
    pass


class SubscriptionPlanUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    price: float | None = Field(default=None, ge=0)
    duration_days: int | None = Field(default=None, ge=0, le=3660)
    features: list[StrictStr] | None = None
    is_active: bool | None = None

    model_config = ConfigDict(extra="forbid")


class SubscriptionPlanRead(SubscriptionPlanBase):
    id: int | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class SubscriptionPlanList(RootModel[list[SubscriptionPlanRead]]):
    pass


class MockPurchaseRequest(BaseModel):
    user_id: int = Field(..., ge=1)
    plan_id: int = Field(..., ge=1)

    model_config = ConfigDict(extra="forbid")


class UserSubscriptionRead(BaseModel):
    id: int | None = None
    user_id: int
    plan_id: int | None = None
    status: SubscriptionStatus
    started_at: datetime | None = None
    expires_at: datetime | None = None
    plan: SubscriptionPlanRead
    unlocks_premium: bool

    model_config = ConfigDict(from_attributes=True)
