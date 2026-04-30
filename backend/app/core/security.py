from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta
from typing import Any

from app.core.config import get_settings

try:
    from passlib.context import CryptContext
except ImportError:  # pragma: no cover - exercised only when optional dependency is absent.
    CryptContext = None  # type: ignore[assignment]

password_context = (
    CryptContext(schemes=["bcrypt"], deprecated="auto")
    if CryptContext is not None
    else None
)

PBKDF2_ITERATIONS = 260_000


class InvalidTokenError(Exception):
    pass


def hash_password(password: str) -> str:
    if password_context is not None:
        return password_context.hash(password)

    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PBKDF2_ITERATIONS,
    ).hex()
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${digest}"


def verify_password(password: str, password_hash: str) -> bool:
    if password_hash.startswith("pbkdf2_sha256$"):
        try:
            _, iterations, salt, expected_digest = password_hash.split("$", 3)
            digest = hashlib.pbkdf2_hmac(
                "sha256",
                password.encode("utf-8"),
                salt.encode("utf-8"),
                int(iterations),
            ).hex()
            return hmac.compare_digest(digest, expected_digest)
        except ValueError:
            return False

    if password_context is None:
        return False

    return bool(password_context.verify(password, password_hash))


def create_access_token(subject: str, claims: dict[str, Any] | None = None) -> str:
    settings = get_settings()
    expires_at = datetime.utcnow() + timedelta(
        minutes=settings.access_token_expire_minutes,
    )
    payload = {
        "exp": int(expires_at.timestamp()),
        "sub": subject,
        **(claims or {}),
    }
    return encode_jwt(payload)


def decode_access_token(token: str) -> dict[str, Any]:
    payload = decode_jwt(token)
    expires_at = payload.get("exp")
    if not isinstance(expires_at, int) or expires_at < int(datetime.utcnow().timestamp()):
        raise InvalidTokenError("Token expired")
    return payload


def encode_jwt(payload: dict[str, Any]) -> str:
    settings = get_settings()
    header = {
        "alg": settings.jwt_algorithm,
        "typ": "JWT",
    }
    if settings.jwt_algorithm != "HS256":
        raise InvalidTokenError("Only HS256 is supported in demo auth")

    signing_input = ".".join(
        [
            base64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8")),
            base64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8")),
        ],
    )
    signature = sign(signing_input)
    return f"{signing_input}.{signature}"


def decode_jwt(token: str) -> dict[str, Any]:
    try:
        header_value, payload_value, signature = token.split(".")
    except ValueError as error:
        raise InvalidTokenError("Malformed token") from error

    signing_input = f"{header_value}.{payload_value}"
    expected_signature = sign(signing_input)
    if not hmac.compare_digest(signature, expected_signature):
        raise InvalidTokenError("Invalid token signature")

    try:
        header = json.loads(base64url_decode(header_value))
        payload = json.loads(base64url_decode(payload_value))
    except (json.JSONDecodeError, ValueError) as error:
        raise InvalidTokenError("Invalid token payload") from error

    if header.get("alg") != get_settings().jwt_algorithm:
        raise InvalidTokenError("Invalid token algorithm")
    if not isinstance(payload, dict):
        raise InvalidTokenError("Invalid token payload")

    return payload


def sign(signing_input: str) -> str:
    secret = get_settings().jwt_secret_key.encode("utf-8")
    digest = hmac.new(secret, signing_input.encode("utf-8"), hashlib.sha256).digest()
    return base64url_encode(digest)


def base64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def base64url_decode(value: str) -> str:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}").decode("utf-8")
