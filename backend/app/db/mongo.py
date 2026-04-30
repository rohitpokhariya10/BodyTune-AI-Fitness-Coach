from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None
_loop: asyncio.AbstractEventLoop | None = None
_status = "disabled"
_error: str | None = None


async def connect_mongo() -> None:
    global _client, _db, _error, _loop, _status

    settings = get_settings()
    _loop = asyncio.get_running_loop()
    if not settings.mongo_enabled:
        _status = "disabled"
        _error = None
        logger.info("MongoDB disabled")
        return

    try:
        _client = AsyncIOMotorClient(settings.mongo_uri, serverSelectionTimeoutMS=2000)
        await _client.admin.command("ping")
        _db = _client[settings.mongo_db_name]
        _status = "connected"
        _error = None
        logger.info("MongoDB connected")
    except Exception as error:  # pragma: no cover - exact driver errors vary.
        _client = None
        _db = None
        _status = "error"
        _error = str(error)
        logger.error("MongoDB connection error: %s", error)


async def close_mongo() -> None:
    global _client, _db, _error, _status

    if _client is not None:
        _client.close()
    _client = None
    _db = None
    _error = None
    _status = "disabled"


def get_mongo_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("MongoDB is not connected")
    return _db


def mongo_status() -> str:
    return _status


def mongo_error() -> str | None:
    return _error


def schedule_mongo_task(awaitable: Awaitable[object]) -> None:
    if _loop is None or _loop.is_closed():
        if hasattr(awaitable, "close"):
            awaitable.close()
        return

    asyncio.run_coroutine_threadsafe(awaitable, _loop)
