from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.subscription_plan import SubscriptionPlan
from app.models.user_subscription import UserSubscription
from app.schemas.subscription import SubscriptionPlanCreate


class SubscriptionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_plan(self, plan_data: SubscriptionPlanCreate) -> SubscriptionPlan:
        plan = SubscriptionPlan(**plan_data.model_dump())
        self.db.add(plan)
        self.db.commit()
        self.db.refresh(plan)
        return plan

    def get_plan_by_id(self, plan_id: int) -> SubscriptionPlan | None:
        return self.db.get(SubscriptionPlan, plan_id)

    def get_plan_by_name(self, name: str) -> SubscriptionPlan | None:
        statement = select(SubscriptionPlan).where(SubscriptionPlan.name == name)
        return self.db.scalars(statement).first()

    def list_plans(self, include_inactive: bool = True) -> list[SubscriptionPlan]:
        statement = select(SubscriptionPlan).order_by(SubscriptionPlan.price)
        if not include_inactive:
            statement = statement.where(SubscriptionPlan.is_active.is_(True))
        return list(self.db.scalars(statement).all())

    def update_plan(
        self,
        plan: SubscriptionPlan,
        update_data: dict[str, Any],
    ) -> SubscriptionPlan:
        for field, value in update_data.items():
            setattr(plan, field, value)
        self.db.add(plan)
        self.db.commit()
        self.db.refresh(plan)
        return plan

    def deactivate_user_subscriptions(self, user_id: int) -> None:
        statement = select(UserSubscription).where(
            UserSubscription.user_id == user_id,
            UserSubscription.status == "active",
        )
        for subscription in self.db.scalars(statement).all():
            subscription.status = "inactive"
            self.db.add(subscription)
        self.db.commit()

    def create_user_subscription(
        self,
        user_id: int,
        plan: SubscriptionPlan,
        started_at: datetime,
        expires_at: datetime,
    ) -> UserSubscription:
        subscription = UserSubscription(
            user_id=user_id,
            plan_id=plan.id,
            status="active",
            started_at=started_at,
            expires_at=expires_at,
        )
        self.db.add(subscription)
        self.db.commit()
        self.db.refresh(subscription)
        return subscription

    def get_current_user_subscription(
        self,
        user_id: int,
    ) -> UserSubscription | None:
        statement = (
            select(UserSubscription)
            .options(selectinload(UserSubscription.plan))
            .where(
                UserSubscription.user_id == user_id,
                UserSubscription.status == "active",
            )
            .order_by(UserSubscription.expires_at.desc(), UserSubscription.id.desc())
        )
        return self.db.scalars(statement).first()
