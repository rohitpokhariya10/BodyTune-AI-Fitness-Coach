import logging
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from imagekitio import ImageKit

from app.core.config import get_settings
from app.schemas.video import UploadedVideoAssetRead

VIDEO_FOLDER = "/Bodytune/videos"
THUMBNAIL_FOLDER = "/Bodytune/thumbnails"
IMAGEKIT_PUBLIC_URL_PREFIX = "https://ik.imagekit.io/"
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov"}
ALLOWED_THUMBNAIL_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
VIDEO_MAX_BYTES = 100 * 1024 * 1024
THUMBNAIL_MAX_BYTES = 10 * 1024 * 1024
logger = logging.getLogger(__name__)


def _ensure_configured() -> None:
    settings = get_settings()
    if not (
        settings.imagekit_public_key.strip()
        and settings.imagekit_private_key.strip()
        and settings.imagekit_url_endpoint.strip()
    ):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ImageKit is not configured.",
        )


def _ensure_imagekit_url(url: str) -> None:
    if not url.startswith(IMAGEKIT_PUBLIC_URL_PREFIX):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="ImageKit upload failed.",
        )


def _validate_file(
    file: UploadFile,
    *,
    allowed_extensions: set[str],
    invalid_type_message: str,
    max_bytes: int,
) -> tuple[str, bytes]:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=invalid_type_message,
        )

    content = file.file.read()
    file.file.close()
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large.",
        )
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    return suffix, content


def upload_file(file: UploadFile, folder: str) -> UploadedVideoAssetRead:
    _ensure_configured()
    settings = get_settings()
    file_name = Path(file.filename or "upload").name

    try:
        logger.info("Uploading admin media to ImageKit folder: %s", folder)
        imagekit = ImageKit(private_key=settings.imagekit_private_key)
        response = imagekit.files.upload(
            file=file.file.read(),
            file_name=file_name,
            folder=folder,
            public_key=settings.imagekit_public_key,
            use_unique_file_name=True,
        )
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="ImageKit upload failed.",
        ) from error
    finally:
        file.file.close()

    url = response.url or ""
    if not url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="ImageKit upload failed.",
        )
    _ensure_imagekit_url(url)

    return UploadedVideoAssetRead(
        url=url,
        file_id=response.file_id or "",
        name=response.name or file_name,
        size=int(response.size or 0),
        file_type=response.file_type or "",
    )


def _upload_validated_file(
    file: UploadFile,
    *,
    folder: str,
    allowed_extensions: set[str],
    invalid_type_message: str,
    max_bytes: int,
    file_type: str,
) -> UploadedVideoAssetRead:
    _, content = _validate_file(
        file,
        allowed_extensions=allowed_extensions,
        invalid_type_message=invalid_type_message,
        max_bytes=max_bytes,
    )
    _ensure_configured()
    file_name = Path(file.filename or "upload").name
    settings = get_settings()

    try:
        logger.info("Uploading admin media to ImageKit folder: %s", folder)
        imagekit = ImageKit(private_key=settings.imagekit_private_key)
        response = imagekit.files.upload(
            file=content,
            file_name=file_name,
            folder=folder,
            public_key=settings.imagekit_public_key,
            use_unique_file_name=True,
        )
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="ImageKit upload failed.",
        ) from error

    url = response.url or ""
    file_id = response.file_id or ""
    if not url or not file_id:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="ImageKit upload failed.",
        )
    _ensure_imagekit_url(url)

    return UploadedVideoAssetRead(
        url=url,
        file_id=file_id,
        name=response.name or file_name,
        size=int(response.size or len(content)),
        file_type=file_type,
    )


def upload_video(file: UploadFile) -> UploadedVideoAssetRead:
    return _upload_validated_file(
        file,
        folder=VIDEO_FOLDER,
        allowed_extensions=ALLOWED_VIDEO_EXTENSIONS,
        invalid_type_message="Only MP4, WEBM, and MOV videos are allowed.",
        max_bytes=VIDEO_MAX_BYTES,
        file_type="video",
    )


def upload_thumbnail(file: UploadFile) -> UploadedVideoAssetRead:
    return _upload_validated_file(
        file,
        folder=THUMBNAIL_FOLDER,
        allowed_extensions=ALLOWED_THUMBNAIL_EXTENSIONS,
        invalid_type_message="Only JPG, PNG, and WEBP thumbnails are allowed.",
        max_bytes=THUMBNAIL_MAX_BYTES,
        file_type="thumbnail",
    )
