from sqlalchemy.orm import Session

from app.models.meal_photo import MealPhoto


class MealPhotoRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        *,
        user_id: int,
        image_path: str,
        original_filename: str,
        analysis_status: str = "needs_confirmation",
    ) -> MealPhoto:
        meal_photo = MealPhoto(
            analysis_status=analysis_status,
            image_path=image_path,
            original_filename=original_filename,
            user_id=user_id,
        )
        self.db.add(meal_photo)
        self.db.commit()
        self.db.refresh(meal_photo)
        return meal_photo

    def get_by_id(self, photo_id: int) -> MealPhoto | None:
        return self.db.get(MealPhoto, photo_id)
