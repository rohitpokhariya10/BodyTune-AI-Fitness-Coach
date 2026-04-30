from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.recommendation import Recommendation
from app.schemas.recommendation import RecommendationType


class RecommendationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        *,
        user_id: int,
        workout_result_id: int,
        recommendation_type: RecommendationType,
        message: str,
    ) -> Recommendation:
        recommendation = Recommendation(
            user_id=user_id,
            workout_result_id=workout_result_id,
            recommendation_type=recommendation_type,
            message=message,
        )
        self.db.add(recommendation)
        self.db.commit()
        self.db.refresh(recommendation)
        return recommendation

    def get_by_id(self, recommendation_id: int) -> Recommendation | None:
        return self.db.get(Recommendation, recommendation_id)

    def list_by_user_id(self, user_id: int) -> list[Recommendation]:
        statement = (
            select(Recommendation)
            .where(Recommendation.user_id == user_id)
            .order_by(Recommendation.id)
        )
        return list(self.db.scalars(statement).all())

    def list_all(self) -> list[Recommendation]:
        statement = select(Recommendation).order_by(Recommendation.id)
        return list(self.db.scalars(statement).all())

    def delete(self, recommendation: Recommendation) -> None:
        self.db.delete(recommendation)
        self.db.commit()
