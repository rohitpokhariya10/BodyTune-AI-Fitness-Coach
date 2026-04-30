from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.db.base import Base, create_all_tables
from app.db.seeds import seed_auth_users, seed_subscription_plans
from app.db.session import get_db
from app.main import app
from app.schemas.video import UploadedVideoAssetRead

@pytest.fixture()
def client(tmp_path: Path) -> Generator[TestClient, None, None]:
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=test_engine,
    )

    settings = get_settings()
    original_dev_mode = settings.dev_mode
    settings.dev_mode = True

    create_all_tables(bind=test_engine)
    with TestingSessionLocal() as db:
        seed_auth_users(db)
        seed_subscription_plans(db)

    original_upload_dir = settings.upload_dir
    settings.upload_dir = tmp_path / "uploads"

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    settings.upload_dir = original_upload_dir
    settings.dev_mode = original_dev_mode
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)


def video_payload(is_premium: bool = True) -> dict[str, object]:
    return {
        "title": "Dumbbell Curl Basics",
        "description": "Slow curl tempo with controlled elbow extension.",
        "category": "Strength",
        "difficulty": "beginner",
        "duration_minutes": 8,
        "target_muscles": ["Biceps", "Forearms"],
        "equipment": "Dumbbells",
        "video_url": "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
        "thumbnail_url": "https://ik.imagekit.io/demo/Bodytune/thumbnails/curl-thumb.png",
        "imagekit_video_file_id": "",
        "imagekit_thumbnail_file_id": "thumbnail_file_id",
        "is_premium": is_premium,
        "is_active": True,
    }


def create_video(client: TestClient, is_premium: bool = True) -> dict[str, object]:
    response = client.post(
        "/api/v1/admin/videos",
        headers=admin_headers(client),
        json=video_payload(is_premium=is_premium),
    )
    assert response.status_code == 201
    return dict(response.json())


def get_pro_plan_id(client: TestClient) -> int:
    response = client.get("/api/v1/subscription/plans")
    assert response.status_code == 200
    pro_plan = next(plan for plan in response.json() if plan["name"] == "Pro Monthly")
    return int(pro_plan["id"])


def login_headers(client: TestClient, email: str, password: str) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def admin_headers(client: TestClient) -> dict[str, str]:
    return login_headers(client, "admin@fitcoach.local", "Admin@123")


def admin_key_headers() -> dict[str, str]:
    return {"X-ADMIN-KEY": get_settings().admin_api_key}


def user_headers(client: TestClient) -> dict[str, str]:
    return login_headers(client, "user@fitcoach.local", "User@123")


def test_create_video_as_admin(client: TestClient) -> None:
    response = client.post(
        "/api/v1/admin/videos",
        headers=admin_headers(client),
        json=video_payload(is_premium=False),
    )

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Dumbbell Curl Basics"
    assert data["video_url"].endswith("/flower.mp4")
    assert data["thumbnail_url"].endswith("/curl-thumb.png")
    assert data["is_premium"] is False
    assert data["is_active"] is True


def test_create_video_rejects_local_exercise_upload_urls(client: TestClient) -> None:
    payload = video_payload(is_premium=False)
    payload["video_url"] = "http://127.0.0.1:9000/uploads/exercise_videos/demo.mp4"
    payload["thumbnail_url"] = "/uploads/exercise_thumbnails/demo.webp"

    response = client.post(
        "/api/v1/admin/videos",
        headers=admin_headers(client),
        json=payload,
    )

    assert response.status_code == 422
    assert (
        "Admin exercise media must use an ImageKit URL or a valid HTTPS URL."
        in response.text
    )


def test_update_video_rejects_local_exercise_upload_urls(client: TestClient) -> None:
    video = create_video(client, is_premium=False)

    response = client.put(
        f"/api/v1/admin/videos/{video['id']}",
        headers=admin_headers(client),
        json={"thumbnail_url": "/uploads/exercise_thumbnails/demo.webp"},
    )

    assert response.status_code == 422
    assert (
        "Admin exercise media must use an ImageKit URL or a valid HTTPS URL."
        in response.text
    )


def test_create_video_rejects_any_local_upload_url(client: TestClient) -> None:
    payload = video_payload(is_premium=False)
    payload["video_url"] = "/uploads/other-local-video.mp4"

    response = client.post(
        "/api/v1/admin/videos",
        headers=admin_headers(client),
        json=payload,
    )

    assert response.status_code == 422
    assert (
        "Admin exercise media must use an ImageKit URL or a valid HTTPS URL."
        in response.text
    )


def test_get_admin_videos_with_admin_key(client: TestClient) -> None:
    created = client.post(
        "/api/v1/admin/videos",
        headers=admin_key_headers(),
        json=video_payload(is_premium=False),
    )

    response = client.get("/api/v1/admin/videos", headers=admin_key_headers())

    assert created.status_code == 201
    assert response.status_code == 200
    videos = response.json()
    assert len(videos) == 1
    assert videos[0]["title"] == "Dumbbell Curl Basics"


def test_post_admin_video_with_admin_key(client: TestClient) -> None:
    response = client.post(
        "/api/v1/admin/videos",
        headers=admin_key_headers(),
        json=video_payload(is_premium=False),
    )

    assert response.status_code == 201
    assert response.json()["video_url"]


def test_reject_admin_create_without_token(client: TestClient) -> None:
    response = client.post("/api/v1/admin/videos", json=video_payload())

    assert response.status_code == 401


def test_reject_admin_create_with_user_token(client: TestClient) -> None:
    response = client.post(
        "/api/v1/admin/videos",
        headers=user_headers(client),
        json=video_payload(),
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Admin access required"


def test_upload_video_and_thumbnail_as_admin(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.api.v1.admin.upload_video",
        lambda file: UploadedVideoAssetRead(
            url="https://ik.imagekit.io/demo/Bodytune/videos/curl-demo.mp4",
            file_id="video_file_id",
            name="curl-demo.mp4",
            size=10,
            file_type="video",
        ),
    )
    monkeypatch.setattr(
        "app.api.v1.admin.upload_thumbnail",
        lambda file: UploadedVideoAssetRead(
            url="https://ik.imagekit.io/demo/Bodytune/thumbnails/curl-thumb.png",
            file_id="thumbnail_file_id",
            name="curl-thumb.png",
            size=10,
            file_type="thumbnail",
        ),
    )

    video_response = client.post(
        "/api/v1/admin/uploads/video",
        headers=admin_headers(client),
        files={"file": ("curl-demo.mp4", b"demo-video", "video/mp4")},
    )
    thumbnail_response = client.post(
        "/api/v1/admin/uploads/thumbnail",
        headers=admin_headers(client),
        files={"file": ("curl-thumb.png", b"demo-image", "image/png")},
    )

    assert video_response.status_code == 200
    assert thumbnail_response.status_code == 200
    video_data = video_response.json()
    thumbnail_data = thumbnail_response.json()
    assert "/Bodytune/videos/" in video_data["url"]
    assert video_data["file_id"] == "video_file_id"
    assert video_data["file_type"] == "video"
    assert "video_url" not in video_data
    assert "/uploads/exercise_videos" not in video_data["url"]
    assert "/Bodytune/thumbnails/" in thumbnail_data["url"]
    assert thumbnail_data["file_id"] == "thumbnail_file_id"
    assert thumbnail_data["file_type"] == "thumbnail"
    assert "thumbnail_url" not in thumbnail_data
    assert "/uploads/exercise_thumbnails" not in thumbnail_data["url"]
    settings = get_settings()
    assert not (settings.upload_dir / "exercise_videos").exists()
    assert not (settings.upload_dir / "exercise_thumbnails").exists()

    payload = video_payload(is_premium=False)
    payload["video_url"] = video_data["url"]
    payload["thumbnail_url"] = thumbnail_data["url"]
    payload["imagekit_video_file_id"] = video_data["file_id"]
    payload["imagekit_thumbnail_file_id"] = thumbnail_data["file_id"]
    create_response = client.post(
        "/api/v1/admin/videos",
        headers=admin_headers(client),
        json=payload,
    )

    assert create_response.status_code == 201
    created_video = create_response.json()
    assert created_video["video_url"] == video_data["url"]
    assert created_video["thumbnail_url"] == thumbnail_data["url"]
    assert created_video["imagekit_video_file_id"] == video_data["file_id"]
    assert created_video["imagekit_thumbnail_file_id"] == thumbnail_data["file_id"]


def test_upload_service_can_be_mocked_and_returns_url(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.api.v1.admin.upload_video",
        lambda file: UploadedVideoAssetRead(
            url="https://ik.imagekit.io/demo/Bodytune/videos/curl-demo.mp4",
            file_id="mocked_file_id",
            name="curl-demo.mp4",
            size=10,
            file_type="video",
        ),
    )

    response = client.post(
        "/api/v1/admin/uploads/video",
        headers=admin_headers(client),
        files={"file": ("curl-demo.mp4", b"demo-video", "video/mp4")},
    )

    assert response.status_code == 200
    assert response.json()["url"].startswith("https://ik.imagekit.io/")
    assert response.json()["file_id"] == "mocked_file_id"
    assert "/uploads/exercise_videos" not in response.json()["url"]


def test_admin_upload_rejects_invalid_file_type(client: TestClient) -> None:
    response = client.post(
        "/api/v1/admin/uploads/video",
        headers=admin_headers(client),
        files={"file": ("curl-demo.txt", b"demo-video", "text/plain")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Only MP4, WEBM, and MOV videos are allowed."


def test_reject_upload_without_token(client: TestClient) -> None:
    response = client.post(
        "/api/v1/admin/uploads/video",
        files={"file": ("curl-demo.mp4", b"demo-video", "video/mp4")},
    )

    assert response.status_code == 401


def test_reject_upload_with_user_token(client: TestClient) -> None:
    response = client.post(
        "/api/v1/admin/uploads/thumbnail",
        headers=user_headers(client),
        files={"file": ("curl-thumb.png", b"demo-image", "image/png")},
    )

    assert response.status_code == 403


def test_list_videos_for_free_user_shows_premium_locked(
    client: TestClient,
) -> None:
    create_video(client, is_premium=True)

    response = client.get("/api/v1/videos", params={"user_id": 1})

    assert response.status_code == 200
    videos = response.json()
    assert len(videos) == 1
    assert videos[0]["is_premium"] is True
    assert videos[0]["locked"] is True


def test_get_public_videos_endpoint(client: TestClient) -> None:
    create_video(client, is_premium=False)

    response = client.get("/api/v1/videos", params={"user_id": 1})

    assert response.status_code == 200
    video = response.json()[0]
    assert video["locked"] is False
    assert video["video_url"].endswith("/flower.mp4")
    assert video["thumbnail_url"].endswith("/curl-thumb.png")
    assert video["imagekit_thumbnail_file_id"] == "thumbnail_file_id"


def test_get_single_video_returns_media_urls(client: TestClient) -> None:
    video = create_video(client, is_premium=False)

    response = client.get(f"/api/v1/videos/{video['id']}", params={"user_id": 1})

    assert response.status_code == 200
    data = response.json()
    assert data["video"]["video_url"].endswith("/flower.mp4")
    assert data["video"]["thumbnail_url"].endswith("/curl-thumb.png")
    assert data["video"]["imagekit_thumbnail_file_id"] == "thumbnail_file_id"


def test_mock_purchase_activates_subscription(client: TestClient) -> None:
    plan_id = get_pro_plan_id(client)

    response = client.post(
        "/api/v1/subscription/mock-purchase",
        json={"user_id": 1, "plan_id": plan_id},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == 1
    assert data["plan"]["name"] == "Pro Monthly"
    assert data["status"] == "active"
    assert data["unlocks_premium"] is True


def test_premium_video_unlocked_after_subscription(client: TestClient) -> None:
    video = create_video(client, is_premium=True)
    plan_id = get_pro_plan_id(client)

    purchase_response = client.post(
        "/api/v1/subscription/mock-purchase",
        json={"user_id": 1, "plan_id": plan_id},
    )
    detail_response = client.get(
        f"/api/v1/videos/{video['id']}",
        params={"user_id": 1},
    )

    assert purchase_response.status_code == 200
    assert detail_response.status_code == 200
    data = detail_response.json()
    assert data["locked"] is False
    assert data["video"]["locked"] is False
    assert data["video"]["id"] == video["id"]


def test_plans_list_works(client: TestClient) -> None:
    response = client.get("/api/v1/subscription/plans")

    assert response.status_code == 200
    plans = response.json()
    assert [plan["name"] for plan in plans] == [
        "Free",
        "Pro Monthly",
        "Premium Monthly",
    ]


def test_get_admin_plans_endpoint(client: TestClient) -> None:
    response = client.get("/api/v1/admin/plans", headers=admin_key_headers())

    assert response.status_code == 200
    assert [plan["name"] for plan in response.json()] == [
        "Free",
        "Pro Monthly",
        "Premium Monthly",
    ]


def test_get_subscription_plans_endpoint(client: TestClient) -> None:
    response = client.get("/api/v1/subscription/plans")

    assert response.status_code == 200
    assert len(response.json()) == 3
