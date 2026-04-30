from __future__ import annotations

from datetime import datetime
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ReturnDocument

from app.db.mongo import get_mongo_db

EXERCISE_VIDEOS_COLLECTION = "exercise_videos"


class MongoVideoNotFoundError(Exception):
    def __init__(self, video_id: str) -> None:
        self.video_id = video_id
        super().__init__(f"Mongo exercise video with id {video_id} was not found")


def _object_id(video_id: str) -> ObjectId:
    try:
        return ObjectId(video_id)
    except InvalidId as error:
        raise MongoVideoNotFoundError(video_id) from error


def serialize_video(document: dict[str, Any]) -> dict[str, Any]:
    return {
        **document,
        "id": str(document["_id"]),
        "_id": str(document["_id"]),
    }


class MongoVideoRepository:
    @property
    def collection(self):
        return get_mongo_db()[EXERCISE_VIDEOS_COLLECTION]

    async def list_videos(self) -> list[dict[str, Any]]:
        cursor = self.collection.find({}).sort("created_at", -1)
        return [serialize_video(document) async for document in cursor]

    async def create_video(
        self,
        *,
        created_by: int,
        video_data: dict[str, Any],
    ) -> dict[str, Any]:
        now = datetime.utcnow()
        document = {
            **video_data,
            "created_at": now,
            "created_by": created_by,
            "updated_at": now,
        }
        result = await self.collection.insert_one(document)
        created = await self.collection.find_one({"_id": result.inserted_id})
        if created is None:
            raise MongoVideoNotFoundError(str(result.inserted_id))
        return serialize_video(created)

    async def update_video(
        self,
        *,
        update_data: dict[str, Any],
        video_id: str,
    ) -> dict[str, Any]:
        update_values = {
            **update_data,
            "updated_at": datetime.utcnow(),
        }
        result = await self.collection.find_one_and_update(
            {"_id": _object_id(video_id)},
            {"$set": update_values},
            return_document=ReturnDocument.AFTER,
        )
        if result is None:
            raise MongoVideoNotFoundError(video_id)
        return serialize_video(result)

    async def delete_video(self, video_id: str) -> None:
        result = await self.collection.delete_one({"_id": _object_id(video_id)})
        if result.deleted_count == 0:
            raise MongoVideoNotFoundError(video_id)
