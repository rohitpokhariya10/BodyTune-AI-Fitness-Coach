from datetime import datetime, timedelta

from app.models.subscription_plan import SubscriptionPlan
from app.models.user_subscription import UserSubscription
from app.repositories.subscription_repository import SubscriptionRepository
from app.schemas.subscription import (
    MockPurchaseRequest,
    SubscriptionPlanCreate,
    SubscriptionPlanRead,
    SubscriptionPlanUpdate,
    UserSubscriptionRead,
)


class SubscriptionPlanNotFoundError(Exception):
    def __init__(self, plan_id: int) -> None:
        self.plan_id = plan_id
        super().__init__(f"Subscription plan with id {plan_id} was not found")


class InactiveSubscriptionPlanError(Exception):
    def __init__(self, plan_id: int) -> None:
        self.plan_id = plan_id
        super().__init__(f"Subscription plan with id {plan_id} is inactive")


class SubscriptionService:
    def __init__(self, subscription_repository: SubscriptionRepository) -> None:
        self.subscription_repository = subscription_repository

    def create_plan(self, plan_data: SubscriptionPlanCreate) -> SubscriptionPlan:
        return self.subscription_repository.create_plan(plan_data)

    def list_plans(self, include_inactive: bool = False) -> list[SubscriptionPlan]:
        return self.subscription_repository.list_plans(include_inactive=include_inactive)

    def update_plan(
        self,
        plan_id: int,
        update_data: SubscriptionPlanUpdate,
    ) -> SubscriptionPlan:
        plan = self.subscription_repository.get_plan_by_id(plan_id)
        if plan is None:
            raise SubscriptionPlanNotFoundError(plan_id)

        return self.subscription_repository.update_plan(
            plan,
            update_data.model_dump(exclude_unset=True),
        )

    def mock_purchase(self, purchase: MockPurchaseRequest) -> UserSubscriptionRead:
        plan = self.subscription_repository.get_plan_by_id(purchase.plan_id)
        if plan is None:
            raise SubscriptionPlanNotFoundError(purchase.plan_id)
        if not plan.is_active:
            raise InactiveSubscriptionPlanError(purchase.plan_id)

        now = utc_now()
        duration_days = plan.duration_days if plan.duration_days > 0 else 3650
        expires_at = now + timedelta(days=duration_days)

        # TODO: Replace this mock activation with Razorpay/Stripe checkout
        # verification before setting the subscription active.
        self.subscription_repository.deactivate_user_subscriptions(purchase.user_id)
        subscription = self.subscription_repository.create_user_subscription(
            user_id=purchase.user_id,
            plan=plan,
            started_at=now,
            expires_at=expires_at,
        )
        return self._to_user_subscription_read(subscription)

    def get_user_subscription(self, user_id: int) -> UserSubscriptionRead:
        subscription = self.subscription_repository.get_current_user_subscription(user_id)

        if subscription is None or subscription.expires_at <= utc_now():
            return UserSubscriptionRead(
                id=None,
                user_id=user_id,
                plan_id=None,
                status="inactive",
                started_at=None,
                expires_at=None,
                plan=free_plan_read(),
                unlocks_premium=False,
            )

        return self._to_user_subscription_read(subscription)

    def user_unlocks_premium(self, user_id: int) -> bool:
        subscription = self.subscription_repository.get_current_user_subscription(user_id)
        if subscription is None or subscription.expires_at <= utc_now():
            return False
        return plan_unlocks_premium(subscription.plan)

    def _to_user_subscription_read(
        self,
        subscription: UserSubscription,
    ) -> UserSubscriptionRead:
        return UserSubscriptionRead(
            id=subscription.id,
            user_id=subscription.user_id,
            plan_id=subscription.plan_id,
            status=subscription.status,
            started_at=subscription.started_at,
            expires_at=subscription.expires_at,
            plan=SubscriptionPlanRead.model_validate(subscription.plan),
            unlocks_premium=plan_unlocks_premium(subscription.plan),
        )


def plan_unlocks_premium(plan: SubscriptionPlan) -> bool:
    return plan.is_active and plan.price > 0


def free_plan_read() -> SubscriptionPlanRead:
    return SubscriptionPlanRead(
        id=None,
        name="Free",
        price=0,
        duration_days=0,
        features=[],
        is_active=True,
        created_at=None,
    )


def utc_now() -> datetime:
    return datetime.utcnow()
