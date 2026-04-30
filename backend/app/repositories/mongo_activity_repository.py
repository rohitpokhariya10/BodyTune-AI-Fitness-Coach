from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from app.core.config import get_settings
from app.db.mongo import get_mongo_db, schedule_mongo_task

logger = logging.getLogger(__name__)

ACTIVITY_EVENTS_COLLECTION = "activity_events"


class MongoActivityRepository:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def create_event(
        self,
        *,
        auth_user_id: int,
        event_type: str,
        metadata: dict[str, Any] | None = None,
        created_at: datetime | None = None,
    ) -> None:
        if not self.settings.mongo_enabled:
            return

        document = {
            "auth_user_id": auth_user_id,
            "created_at": created_at or datetime.utcnow(),
            "event_type": event_type,
            "metadata": metadata or {},
        }
        await get_mongo_db()[ACTIVITY_EVENTS_COLLECTION].insert_one(document)

    def create_event_background(
        self,
        *,
        auth_user_id: int,
        event_type: str,
        metadata: dict[str, Any] | None = None,
        created_at: datetime | None = None,
    ) -> None:
        if not self.settings.mongo_enabled:
            return

        async def write_event() -> None:
            try:
                await self.create_event(
                    auth_user_id=auth_user_id,
                    created_at=created_at,
                    event_type=event_type,
                    metadata=metadata,
                )
            except Exception as error:  # pragma: no cover - defensive sidecar log.
                logger.warning("MongoDB activity event write failed: %s", error)

        schedule_mongo_task(write_event())
