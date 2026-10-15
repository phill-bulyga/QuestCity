from fastapi import APIRouter, HTTPException
from redis.asyncio import Redis
from sqlalchemy import text

from app.api.deps import DbSession
from app.core.config import settings

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/live")
async def liveness() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready")
async def readiness(db: DbSession) -> dict[str, str]:
    try:
        await db.execute(text("SELECT 1"))
        if settings.redis_health_check:
            async with Redis.from_url(settings.redis_url) as redis:
                await redis.ping()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Dependencies are unavailable") from exc
    return {"status": "ready"}
