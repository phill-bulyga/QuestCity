from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import admin, auth, game, generation, health, media, quests
from app.core.config import settings

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="API for the QuestCity mobile-first quest platform.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix=settings.api_v1_prefix)
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(quests.router)
api_router.include_router(generation.router)
api_router.include_router(game.router)
api_router.include_router(media.router)
api_router.include_router(admin.router)
app.include_router(api_router)
app.mount("/media", StaticFiles(directory=settings.media_dir, check_dir=False), name="media")


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {"name": settings.app_name, "docs": "/docs"}
