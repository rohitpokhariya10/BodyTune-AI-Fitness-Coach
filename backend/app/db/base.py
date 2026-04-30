from sqlalchemy import Engine, inspect, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


def import_models() -> None:
    from app.models import (  # noqa: F401
        activity_log,
        ai_plan,
        auth_user,
        diet_log,
        exercise_video,
        food_item,
        meal_photo,
        otp_verification,
        recommendation,
        subscription_plan,
        user_profile,
        user_subscription,
        workout_result,
    )


def create_all_tables(bind: Engine) -> None:
    import_models()
    Base.metadata.create_all(bind=bind)
    ensure_food_item_metadata_columns(bind)
    ensure_auth_user_columns(bind)
    ensure_user_profile_goal_columns(bind)
    ensure_exercise_video_imagekit_columns(bind)


def ensure_food_item_metadata_columns(bind: Engine) -> None:
    inspector = inspect(bind)
    if "food_items" not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"] for column in inspector.get_columns("food_items")
    }
    statements = []
    if "aliases" not in existing_columns:
        statements.append("ALTER TABLE food_items ADD COLUMN aliases VARCHAR(600) NOT NULL DEFAULT ''")
    if "is_custom" not in existing_columns:
        statements.append("ALTER TABLE food_items ADD COLUMN is_custom BOOLEAN NOT NULL DEFAULT 0")

    if not statements:
        return

    with bind.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def ensure_auth_user_columns(bind: Engine) -> None:
    inspector = inspect(bind)
    if "auth_users" not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"] for column in inspector.get_columns("auth_users")
    }
    statements = []
    if "is_verified" not in existing_columns:
        statements.append(
            "ALTER TABLE auth_users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT 0",
        )

    if not statements:
        return

    with bind.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def ensure_user_profile_goal_columns(bind: Engine) -> None:
    inspector = inspect(bind)
    if "user_profiles" not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"] for column in inspector.get_columns("user_profiles")
    }
    for column_name in (
        "calorie_goal",
        "protein_goal_g",
        "carbs_goal_g",
        "fats_goal_g",
    ):
        if column_name in existing_columns:
            continue

        try:
            with bind.begin() as connection:
                connection.execute(
                    text(f"ALTER TABLE user_profiles ADD COLUMN {column_name} INTEGER"),
                )
        except OperationalError:
            # SQLite raises when another startup already added the column.
            continue


def ensure_exercise_video_imagekit_columns(bind: Engine) -> None:
    inspector = inspect(bind)
    if "exercise_videos" not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"] for column in inspector.get_columns("exercise_videos")
    }
    for column_name in (
        "imagekit_video_file_id",
        "imagekit_thumbnail_file_id",
    ):
        if column_name in existing_columns:
            continue

        try:
            with bind.begin() as connection:
                connection.execute(
                    text(
                        "ALTER TABLE exercise_videos "
                        f"ADD COLUMN {column_name} VARCHAR(160) NOT NULL DEFAULT ''",
                    ),
                )
        except OperationalError:
            continue
