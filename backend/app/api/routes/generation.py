from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.generation.fields import FieldSuggestion, FieldSuggestionRequest, suggest_field
from app.generation.provider import GenerationError, generate_plan, is_configured
from app.models.quest import Quest, QuestStatus
from app.models.user import UserRole
from app.schemas.generation import (
    GenerationBrief,
    GenerationPreparation,
    GenerationResult,
    GenerationStatus,
)
from app.schemas.quest import Guide

router = APIRouter(prefix="/quest-generation", tags=["quest-generation"])
_in_flight: set[str] = set()


@router.get("/status", response_model=GenerationStatus)
async def generation_status(current_user: CurrentUser) -> GenerationStatus:
    return GenerationStatus(available=is_configured(settings), model=settings.llm_model)


@router.post("/prepare", response_model=GenerationPreparation)
async def prepare_generation(
    payload: GenerationBrief,
    current_user: CurrentUser,
) -> GenerationPreparation:
    configured = is_configured(settings)
    return GenerationPreparation(
        status="ready" if configured else "awaiting_provider",
        brief=payload,
        message="Анкета готова к генерации."
        if configured
        else "Добавьте ключ LLM в .env на сервере.",
    )


@router.post("/generate", response_model=GenerationResult, status_code=201)
async def generate_quest(
    payload: GenerationBrief,
    db: DbSession,
    current_user: CurrentUser,
) -> GenerationResult:
    user_id = str(current_user.id)
    if user_id in _in_flight:
        raise HTTPException(409, "Квест уже генерируется. Дождитесь результата.")
    _in_flight.add(user_id)
    try:
        try:
            plan = await generate_plan(payload, settings)
        except GenerationError as error:
            raise HTTPException(error.status_code, error.detail) from None
        guide = None
        if payload.guide_style != "none":
            guide = plan.guide or Guide(
                name={
                    "captain": "Капитан",
                    "historian": "Хранитель историй",
                    "explorer": "Исследователь",
                }[payload.guide_style],
                persona=payload.guide_style,
                introduction=(
                    f"Добро пожаловать! Нас ждёт приключение в городе {payload.city}. "
                    "Следуйте ориентирам, замечайте детали и открывайте истории вместе со мной."
                ),
            )
            guide.persona = payload.guide_style
        quest = Quest(
            author_id=current_user.id,
            title=plan.title,
            guide=guide.model_dump() if guide else None,
            short_description=plan.short_description,
            city=payload.city,
            status=QuestStatus.DRAFT,
            estimated_duration_minutes=payload.duration_minutes,
            generation_plan=plan.model_dump(mode="json"),
            checkpoints=[],
        )
        db.add(quest)
        if current_user.role == UserRole.PLAYER:
            current_user.role = UserRole.AUTHOR
        try:
            await db.commit()
            await db.refresh(quest)
        except Exception:
            await db.rollback()
            raise
        return GenerationResult(quest_id=str(quest.id))
    finally:
        _in_flight.discard(user_id)


@router.post("/suggest-field", response_model=FieldSuggestion)
async def field_suggestion(
    payload: FieldSuggestionRequest, current_user: CurrentUser
) -> FieldSuggestion:
    user_id = str(current_user.id)
    if user_id in _in_flight:
        raise HTTPException(409, "Помощник уже выполняет запрос. Дождитесь результата.")
    _in_flight.add(user_id)
    try:
        try:
            return await suggest_field(payload, settings)
        except GenerationError as error:
            raise HTTPException(error.status_code, error.detail) from None
    finally:
        _in_flight.discard(user_id)
