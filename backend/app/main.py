from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.api.v1 import (
    activity,
    ai_plans,
    admin,
    auth,
    dashboard,
    diet,
    foods,
    mongo,
    profiles,
    recommendations,
    results,
    subscription,
    videos,
    workouts,
)
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.db.base import create_all_tables
from app.db.mongo import close_mongo, connect_mongo, mongo_status
from app.db.seeds import (
    seed_auth_users,
    seed_food_items,
)
from app.db.session import SessionLocal, engine, get_db

settings = get_settings()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    if get_db not in app.dependency_overrides:
        create_all_tables(bind=engine)
        with SessionLocal() as db:
            seed_auth_users(db)
            seed_food_items(db)
    await connect_mongo()
    try:
        yield
    finally:
        await close_mongo()


def sqlite_status() -> str:
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        return "connected"
    except Exception:
        return "error"


def create_app() -> FastAPI:
    configure_logging()
    logger.info("Admin exercise media storage: ImageKit only")
    logger.info("Local exercise media folders are disabled")

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)

    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

    app.include_router(profiles.router, prefix=f"{settings.api_v1_prefix}/profiles")
    app.include_router(auth.router, prefix=f"{settings.api_v1_prefix}/auth")
    app.include_router(activity.router, prefix=f"{settings.api_v1_prefix}/activity")
    app.include_router(dashboard.router, prefix=f"{settings.api_v1_prefix}/dashboard")
    app.include_router(workouts.router, prefix=f"{settings.api_v1_prefix}/workouts")
    app.include_router(ai_plans.router, prefix=f"{settings.api_v1_prefix}/ai-plans")
    app.include_router(admin.router, prefix=f"{settings.api_v1_prefix}/admin")
    app.include_router(videos.router, prefix=f"{settings.api_v1_prefix}/videos")
    app.include_router(
        subscription.router,
        prefix=f"{settings.api_v1_prefix}/subscription",
    )
    app.include_router(results.router, prefix=f"{settings.api_v1_prefix}/results")
    app.include_router(foods.router, prefix=f"{settings.api_v1_prefix}/foods")
    app.include_router(diet.router, prefix=f"{settings.api_v1_prefix}/diet")
    app.include_router(
        recommendations.router,
        prefix=f"{settings.api_v1_prefix}/recommendations",
    )
    app.include_router(mongo.router, prefix=f"{settings.api_v1_prefix}/mongo")

    @app.get("/health", tags=["health"])
    def health_check() -> dict[str, object]:
        return {
            "database": {
                "mongo": mongo_status(),
                "sqlite": sqlite_status(),
            },
            "status": "ok",
            "service": settings.app_name,
            "version": settings.app_version,
        }

    return app


app = create_app()
