from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, Request, UploadFile, status
from pydantic import BaseModel

from app.api.deps import CurrentUser
from app.core.config import settings

router = APIRouter(prefix="/media", tags=["media"])

ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/webm": ".webm",
}


class MediaUploadResponse(BaseModel):
    url: str
    media_type: str
    original_name: str


@router.post("", response_model=MediaUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_media(
    request: Request,
    current_user: CurrentUser,
    file: Annotated[UploadFile, File()],
) -> MediaUploadResponse:
    del current_user
    content_type = file.content_type or ""
    extension = ALLOWED_TYPES.get(content_type)
    if extension is None:
        raise HTTPException(
            status_code=422,
            detail="Поддерживаются JPG, PNG, WebP, GIF, MP3, M4A, OGG, WAV и WebM",
        )

    max_bytes = settings.media_max_upload_mb * 1024 * 1024
    content = await file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Файл должен быть меньше {settings.media_max_upload_mb} МБ",
        )

    media_dir = Path(settings.media_dir)
    media_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{extension}"
    (media_dir / filename).write_bytes(content)

    base_url = str(request.base_url).rstrip("/")
    return MediaUploadResponse(
        url=f"{base_url}/media/{filename}",
        media_type="image" if content_type.startswith("image/") else "audio",
        original_name=file.filename or filename,
    )
