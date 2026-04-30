from typing import NoReturn

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.auth import get_current_user, get_optional_current_user
from app.db.session import get_db
from app.models.auth_user import AuthUser
from app.repositories.activity_repository import ActivityRepository
from app.repositories.mongo_activity_repository import MongoActivityRepository
from app.repositories.subscription_repository import SubscriptionRepository
from app.schemas.subscription import (
    MockPurchaseRequest,
    SubscriptionPlanList,
    UserSubscriptionRead,
)
from app.services.subscription_service import (
    InactiveSubscriptionPlanError,
    SubscriptionPlanNotFoundError,
    SubscriptionService,
)
from app.services.activity_service import ActivityService

router = APIRouter(tags=["subscription"])


def get_subscription_service(db: Session = Depends(get_db)) -> SubscriptionService:
    return SubscriptionService(SubscriptionRepository(db))


def get_activity_service(db: Session = Depends(get_db)) -> ActivityService:
    return ActivityService(ActivityRepository(db), MongoActivityRepository())


def raise_plan_not_found(error: SubscriptionPlanNotFoundError) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Subscription plan with id {error.plan_id} was not found",
    )


def raise_inactive_plan(error: InactiveSubscriptionPlanError) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Subscription plan with id {error.plan_id} is inactive",
    )


@router.get("/plans", response_model=SubscriptionPlanList)
def list_plans(
    subscription_service: SubscriptionService = Depends(get_subscription_service),
) -> SubscriptionPlanList:
    return SubscriptionPlanList(root=subscription_service.list_plans())


@router.post("/mock-purchase", response_model=UserSubscriptionRead)
def mock_purchase(
    purchase: MockPurchaseRequest,
    subscription_service: SubscriptionService = Depends(get_subscription_service),
    current_user: AuthUser | None = Depends(get_optional_current_user),
    activity_service: ActivityService = Depends(get_activity_service),
) -> UserSubscriptionRead:
    try:
        subscription = subscription_service.mock_purchase(purchase)
    except SubscriptionPlanNotFoundError as error:
        raise_plan_not_found(error)
    except InactiveSubscriptionPlanError as error:
        raise_inactive_plan(error)

    if current_user is not None:
        activity_service.record_activity(current_user.id, "subscription")
    return subscription


@router.get("/user/{user_id}", response_model=UserSubscriptionRead)
def get_user_subscription(
    user_id: int,
    subscription_service: SubscriptionService = Depends(get_subscription_service),
) -> UserSubscriptionRead:
    return subscription_service.get_user_subscription(user_id)


@router.get("/me", response_model=UserSubscriptionRead)
def get_my_subscription(
    current_user: AuthUser = Depends(get_current_user),
    subscription_service: SubscriptionService = Depends(get_subscription_service),
) -> UserSubscriptionRead:
    return subscription_service.get_user_subscription(current_user.id)
