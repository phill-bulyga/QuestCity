from datetime import UTC, datetime, timedelta
from typing import Any, Literal
from uuid import UUID

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

password_hash = PasswordHash.recommended()
TokenType = Literal["access", "refresh"]


class InvalidTokenError(Exception):
    """Raised when an authentication token is invalid or has expired."""


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_token(subject: UUID, token_type: TokenType) -> str:
    now = datetime.now(UTC)
    if token_type == "access":
        expires_at = now + timedelta(minutes=settings.jwt_access_ttl_minutes)
    else:
        expires_at = now + timedelta(days=settings.jwt_refresh_ttl_days)

    payload = {
        "sub": str(subject),
        "type": token_type,
        "iat": now,
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str, expected_type: TokenType) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError as exc:
        raise InvalidTokenError from exc

    if payload.get("type") != expected_type or not payload.get("sub"):
        raise InvalidTokenError
    return payload
