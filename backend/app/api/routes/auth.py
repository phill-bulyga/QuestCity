from uuid import UUID

from fastapi import APIRouter, Cookie, HTTPException, Response, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.core.security import (
    InvalidTokenError,
    create_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, MessageResponse, RegisterRequest
from app.schemas.user import UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.jwt_refresh_ttl_days * 24 * 60 * 60,
        path=f"{settings.api_v1_prefix}/auth",
    )


def auth_response(user: User, response: Response) -> AuthResponse:
    set_refresh_cookie(response, create_token(user.id, "refresh"))
    return AuthResponse(
        access_token=create_token(user.id, "access"),
        user=UserRead.model_validate(user),
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, response: Response, db: DbSession) -> AuthResponse:
    email = payload.email.lower()
    existing_user = await db.scalar(select(User).where(User.email == email))
    if existing_user is not None:
        raise HTTPException(status_code=409, detail="Пользователь с таким email уже существует")

    user = User(
        email=email,
        display_name=payload.display_name,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return auth_response(user, response)


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, response: Response, db: DbSession) -> AuthResponse:
    user = await db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Аккаунт заблокирован")
    return auth_response(user, response)


@router.post("/refresh", response_model=AuthResponse)
async def refresh(
    response: Response,
    db: DbSession,
    questcity_refresh: str | None = Cookie(default=None),
) -> AuthResponse:
    if not questcity_refresh:
        raise HTTPException(status_code=401, detail="Сессия отсутствует")
    try:
        payload = decode_token(questcity_refresh, "refresh")
        user_id = UUID(payload["sub"])
    except (InvalidTokenError, ValueError, TypeError) as exc:
        raise HTTPException(status_code=401, detail="Сессия истекла") from exc

    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Сессия недействительна")
    return auth_response(user, response)


@router.post("/logout", response_model=MessageResponse)
async def logout(response: Response) -> MessageResponse:
    response.delete_cookie(
        settings.refresh_cookie_name,
        path=f"{settings.api_v1_prefix}/auth",
        secure=settings.cookie_secure,
        httponly=True,
        samesite="lax",
    )
    return MessageResponse(message="Сессия завершена")


@router.get("/me", response_model=UserRead)
async def me(current_user: CurrentUser) -> UserRead:
    return UserRead.model_validate(current_user)
