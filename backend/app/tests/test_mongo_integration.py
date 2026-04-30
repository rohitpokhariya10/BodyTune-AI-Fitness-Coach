from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app


@pytest.fixture()
def mongo_settings(tmp_path: Path) -> Generator[None, None, None]:
    settings = get_settings()
    original_mongo_enabled = settings.mongo_enabled
    original_mongo_uri = settings.mongo_uri
    original_mongo_db_name = settings.mongo_db_name
    original_upload_dir = settings.upload_dir
    settings.upload_dir = tmp_path / "uploads"
    yield
    settings.mongo_enabled = original_mongo_enabled
    settings.mongo_uri = original_mongo_uri
    settings.mongo_db_name = original_mongo_db_name
    settings.upload_dir = original_upload_dir


def test_health_reports_mongo_disabled(mongo_settings: None) -> None:
    settings = get_settings()
    settings.mongo_enabled = False

    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["database"]["sqlite"] == "connected"
    assert data["database"]["mongo"] == "disabled"


def test_mongo_disabled_does_not_break_startup(mongo_settings: None) -> None:
    settings = get_settings()
    settings.mongo_enabled = False

    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_health_reports_mongo_error_when_enabled_but_unavailable(
    mongo_settings: None,
) -> None:
    settings = get_settings()
    settings.mongo_enabled = True
    settings.mongo_uri = "mongodb://127.0.0.1:1"

    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["database"]["mongo"] == "error"
