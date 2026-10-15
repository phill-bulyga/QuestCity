import hashlib
import json
import random
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.game.rules import answers_match, distance_meters
from app.models.game import GameSession, GameSessionStatus, TaskAttempt
from app.models.quest import Checkpoint, Quest, QuestStatus, TaskType
from app.schemas.game import (
    AnswerRequest,
    AnswerResponse,
    ArrivalRequest,
    ArrivalResponse,
    CheckpointReveal,
    GameCheckpoint,
    GameReward,
    GameSessionCreate,
    GameSessionRead,
    HintRequest,
    JournalEntry,
)
from app.schemas.partners import PartnerPlace

router = APIRouter(prefix="/game-sessions", tags=["game"])


async def load_session(
    db: DbSession,
    session_id: UUID,
    player_id: UUID,
    *,
    lock: bool = False,
) -> GameSession:
    statement = (
        select(GameSession)
        .options(
            selectinload(GameSession.quest).selectinload(Quest.checkpoints),
            selectinload(GameSession.attempts),
        )
        .where(GameSession.id == session_id, GameSession.player_id == player_id)
    )
    if lock:
        statement = statement.with_for_update()
    session = await db.scalar(statement)
    if session is None:
        raise HTTPException(status_code=404, detail="Игровая сессия не найдена")
    return session


def current_checkpoint(session: GameSession) -> Checkpoint | None:
    checkpoints = session.quest.checkpoints
    if session.current_checkpoint_index >= len(checkpoints):
        return None
    return checkpoints[session.current_checkpoint_index]


def serialize_session(session: GameSession) -> GameSessionRead:
    checkpoint = current_checkpoint(session)
    is_unlocked = session.current_checkpoint_unlocked_at is not None
    game_checkpoint = None
    if checkpoint is not None:
        hints = checkpoint.hints or []
        opened = (session.opened_hints or {}).get(str(checkpoint.id), 0)
        penalty = sum(hint["cost"] for hint in hints[:opened])
        options = list(checkpoint.answer_options)
        if checkpoint.task_type == TaskType.ORDERING:
            seed = hashlib.sha256(f"{session.id}:{checkpoint.id}".encode()).hexdigest()
            random.Random(seed).shuffle(options)
            if options == checkpoint.correct_order:
                options = options[1:] + options[:1]
        game_checkpoint = GameCheckpoint(
            task_image_url=checkpoint.task_image_url if is_unlocked else None,
            task_image_caption=checkpoint.task_image_caption if is_unlocked else "",
            hints=hints[:opened] if is_unlocked else [],
            hint_count=len(hints) if is_unlocked else 0,
            next_hint_cost=hints[opened]["cost"] if is_unlocked and opened < len(hints) else None,
            hint_penalty=penalty if is_unlocked else 0,
            id=checkpoint.id,
            position=checkpoint.position,
            title=checkpoint.title if is_unlocked else f"Точка {checkpoint.position + 1}",
            description=checkpoint.description if is_unlocked else "",
            latitude=checkpoint.latitude,
            longitude=checkpoint.longitude,
            activation_radius_m=checkpoint.activation_radius_m,
            is_unlocked=is_unlocked,
            task_type=checkpoint.task_type if is_unlocked else None,
            task_prompt=checkpoint.task_prompt if is_unlocked else None,
            answer_options=options if is_unlocked else [],
            points=max(0, checkpoint.points - penalty) if is_unlocked else None,
            attempts_remaining=max(
                0,
                checkpoint.max_attempts
                - sum(1 for attempt in session.attempts if attempt.checkpoint_id == checkpoint.id),
            ),
            route_clue=checkpoint.route_clue,
            travel_facts=checkpoint.travel_facts[: session.travel_fact_index],
            travel_fact_index=session.travel_fact_index,
            travel_fact_count=len(checkpoint.travel_facts),
        )
    reward = session.quest.reward
    earned_reward = None
    if (
        session.status == GameSessionStatus.COMPLETED
        and reward is not None
        and reward.is_active
        and session.score >= reward.min_score
    ):
        earned_reward = GameReward(
            partner_name=reward.partner_name,
            venue_address=reward.venue_address,
            offer=reward.offer,
            promo_code=reward.promo_code,
            redemption_instructions=reward.redemption_instructions,
            is_demo=reward.is_demo,
        )
    return GameSessionRead(
        guide=session.quest.guide,
        journal=[
            JournalEntry(
                chapter=point.position + 1,
                checkpoint_title=point.title,
                title=point.reveal_title or point.title,
                text=point.reveal_text,
                image_url=point.reveal_image_url,
                audio_url=point.reveal_audio_url,
                media_caption=point.reveal_media_caption,
                source_url=point.reveal_source_url,
            )
            for point in session.quest.checkpoints[: session.current_checkpoint_index]
        ],
        max_score=sum(point.points for point in session.quest.checkpoints),
        demo_mode=settings.allow_location_bypass,
        partner_places=[
            PartnerPlace.model_validate(place)
            for place in session.quest.partner_places
            if place.get("is_active", True)
        ],
        id=session.id,
        quest_id=session.quest_id,
        quest_title=session.quest.title,
        status=session.status,
        current_checkpoint_index=session.current_checkpoint_index,
        checkpoint_count=len(session.quest.checkpoints),
        score=session.score,
        started_at=session.started_at,
        finished_at=session.finished_at,
        current_checkpoint=game_checkpoint,
        reward=earned_reward,
        reward_min_score=reward.min_score if reward is not None and reward.is_active else None,
    )


@router.post("", response_model=GameSessionRead, status_code=status.HTTP_201_CREATED)
async def start_session(
    payload: GameSessionCreate, db: DbSession, current_user: CurrentUser
) -> GameSessionRead:
    quest = await db.scalar(
        select(Quest)
        .options(selectinload(Quest.checkpoints))
        .where(Quest.id == payload.quest_id, Quest.status == QuestStatus.PUBLISHED)
        .with_for_update()
    )
    if quest is None:
        raise HTTPException(status_code=404, detail="Опубликованный квест не найден")
    if not quest.checkpoints:
        raise HTTPException(status_code=422, detail="В квесте нет контрольных точек")

    existing_id = await db.scalar(
        select(GameSession.id)
        .where(
            GameSession.quest_id == quest.id,
            GameSession.player_id == current_user.id,
            GameSession.status == GameSessionStatus.ACTIVE,
        )
        .order_by(GameSession.started_at.desc())
        .limit(1)
    )
    if existing_id is not None:
        return serialize_session(await load_session(db, existing_id, current_user.id))
    session = GameSession(quest_id=quest.id, player_id=current_user.id)
    db.add(session)
    await db.commit()
    session = await load_session(db, session.id, current_user.id)
    return serialize_session(session)


@router.get("/{session_id}", response_model=GameSessionRead)
async def read_session(
    session_id: UUID, db: DbSession, current_user: CurrentUser
) -> GameSessionRead:
    session = await load_session(db, session_id, current_user.id)
    return serialize_session(session)


@router.post("/{session_id}/arrive", response_model=ArrivalResponse)
async def confirm_arrival(
    session_id: UUID,
    payload: ArrivalRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> ArrivalResponse:
    session = await load_session(db, session_id, current_user.id, lock=True)
    if session.status != GameSessionStatus.ACTIVE:
        raise HTTPException(status_code=409, detail="Сессия уже завершена")
    checkpoint = current_checkpoint(session)
    if checkpoint is None:
        raise HTTPException(status_code=409, detail="Текущая точка отсутствует")
    if payload.accuracy_m > 100:
        raise HTTPException(
            status_code=422,
            detail="Недостаточная точность геолокации. Подождите улучшения GPS-сигнала.",
        )

    distance = distance_meters(
        payload.latitude,
        payload.longitude,
        checkpoint.latitude,
        checkpoint.longitude,
    )
    allowed_distance = checkpoint.activation_radius_m + min(payload.accuracy_m, 30)
    arrived = distance <= allowed_distance
    if arrived and session.current_checkpoint_unlocked_at is None:
        session.current_checkpoint_unlocked_at = datetime.now(UTC)
        await db.commit()
    return ArrivalResponse(
        arrived=arrived,
        distance_m=round(distance, 1),
        allowed_distance_m=round(allowed_distance, 1),
        session=serialize_session(session),
    )


@router.post("/{session_id}/answer", response_model=AnswerResponse)
async def submit_answer(
    session_id: UUID,
    payload: AnswerRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> AnswerResponse:
    session = await load_session(db, session_id, current_user.id, lock=True)
    if session.status != GameSessionStatus.ACTIVE:
        raise HTTPException(status_code=409, detail="Сессия уже завершена")
    checkpoint = current_checkpoint(session)
    if checkpoint is None or session.current_checkpoint_unlocked_at is None:
        raise HTTPException(status_code=409, detail="Сначала подтвердите прибытие на точку")

    attempts_used = await db.scalar(
        select(func.count(TaskAttempt.id)).where(
            TaskAttempt.session_id == session.id,
            TaskAttempt.checkpoint_id == checkpoint.id,
        )
    )
    attempts_used = int(attempts_used or 0)
    if attempts_used >= checkpoint.max_attempts:
        raise HTTPException(status_code=409, detail="Попытки для этого задания закончились")

    if checkpoint.task_type == TaskType.ORDERING:
        if not isinstance(payload.answer, list) or sorted(payload.answer) != sorted(
            checkpoint.answer_options
        ):
            raise HTTPException(422, "Последовательность должна содержать каждый элемент один раз")
        is_correct = payload.answer == checkpoint.correct_order
    else:
        if not isinstance(payload.answer, str):
            raise HTTPException(422, "Для этого задания нужен текстовый ответ")
        is_correct = answers_match(payload.answer, checkpoint.correct_answer)
    opened = (session.opened_hints or {}).get(str(checkpoint.id), 0)
    penalty = sum(hint["cost"] for hint in (checkpoint.hints or [])[:opened])
    points_awarded = max(0, checkpoint.points - penalty) if is_correct else 0
    attempt = TaskAttempt(
        session_id=session.id,
        checkpoint_id=checkpoint.id,
        answer=payload.answer.strip()
        if isinstance(payload.answer, str)
        else json.dumps(payload.answer, ensure_ascii=False),
        is_correct=is_correct,
        points_awarded=points_awarded,
    )
    session.attempts.append(attempt)
    db.add(attempt)
    attempts_used += 1

    correct_answer = None
    reveal = None
    if is_correct:
        reveal = CheckpointReveal(
            title=checkpoint.reveal_title,
            text=checkpoint.reveal_text,
            image_url=checkpoint.reveal_image_url,
            audio_url=checkpoint.reveal_audio_url,
            media_caption=checkpoint.reveal_media_caption,
            source_url=checkpoint.reveal_source_url,
        )
        session.score += points_awarded
        session.current_checkpoint_index += 1
        session.current_checkpoint_unlocked_at = None
        session.travel_fact_index = 0
        if session.current_checkpoint_index >= len(session.quest.checkpoints):
            session.status = GameSessionStatus.COMPLETED
            session.finished_at = datetime.now(UTC)
    elif attempts_used >= checkpoint.max_attempts:
        correct_answer = (
            " → ".join(checkpoint.correct_order)
            if checkpoint.task_type == TaskType.ORDERING
            else checkpoint.correct_answer
        )
        reveal = CheckpointReveal(
            title=checkpoint.reveal_title,
            text=checkpoint.reveal_text,
            image_url=checkpoint.reveal_image_url,
            audio_url=checkpoint.reveal_audio_url,
            media_caption=checkpoint.reveal_media_caption,
            source_url=checkpoint.reveal_source_url,
        )
        session.current_checkpoint_index += 1
        session.current_checkpoint_unlocked_at = None
        session.travel_fact_index = 0
        if session.current_checkpoint_index >= len(session.quest.checkpoints):
            session.status = GameSessionStatus.COMPLETED
            session.finished_at = datetime.now(UTC)

    await db.commit()
    return AnswerResponse(
        is_correct=is_correct,
        attempts_used=attempts_used,
        attempts_remaining=max(checkpoint.max_attempts - attempts_used, 0),
        points_awarded=points_awarded,
        correct_answer=correct_answer,
        reveal=reveal,
        session=serialize_session(session),
    )


@router.post("/{session_id}/hint", response_model=GameSessionRead)
async def reveal_hint(
    session_id: UUID, payload: HintRequest, db: DbSession, current_user: CurrentUser
) -> GameSessionRead:
    session = await load_session(db, session_id, current_user.id, lock=True)
    checkpoint = current_checkpoint(session)
    if session.status != GameSessionStatus.ACTIVE or checkpoint is None:
        raise HTTPException(409, "Сейчас нет активного задания")
    if checkpoint.id != payload.checkpoint_id or session.current_checkpoint_unlocked_at is None:
        raise HTTPException(409, "Подсказка доступна только для текущего открытого задания")
    opened = (session.opened_hints or {}).get(str(checkpoint.id), 0)
    if payload.index >= len(checkpoint.hints or []) or payload.index > opened:
        raise HTTPException(422, "Открывайте подсказки по порядку")
    if payload.index == opened:
        session.opened_hints = {**(session.opened_hints or {}), str(checkpoint.id): opened + 1}
        await db.commit()
    return serialize_session(session)


@router.post("/{session_id}/next-fact", response_model=GameSessionRead)
async def reveal_next_travel_fact(
    session_id: UUID, db: DbSession, current_user: CurrentUser
) -> GameSessionRead:
    session = await load_session(db, session_id, current_user.id, lock=True)
    if session.status != GameSessionStatus.ACTIVE:
        raise HTTPException(status_code=409, detail="Сессия уже завершена")
    checkpoint = current_checkpoint(session)
    if checkpoint is None or session.current_checkpoint_unlocked_at is not None:
        raise HTTPException(status_code=409, detail="Сейчас нет фактов по дороге")
    if session.travel_fact_index >= len(checkpoint.travel_facts):
        raise HTTPException(status_code=409, detail="Все факты уже открыты")
    session.travel_fact_index += 1
    await db.commit()
    return serialize_session(session)


@router.post("/{session_id}/unlock", response_model=ArrivalResponse)
async def unlock_checkpoint_without_location(
    session_id: UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> ArrivalResponse:
    if not settings.allow_location_bypass:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Тестовый режим прохождения без геолокации отключён",
        )

    session = await load_session(db, session_id, current_user.id, lock=True)
    if session.status != GameSessionStatus.ACTIVE:
        raise HTTPException(status_code=409, detail="Сессия уже завершена")
    checkpoint = current_checkpoint(session)
    if checkpoint is None:
        raise HTTPException(status_code=409, detail="Текущая точка отсутствует")

    if session.current_checkpoint_unlocked_at is None:
        session.current_checkpoint_unlocked_at = datetime.now(UTC)
        await db.commit()

    return ArrivalResponse(
        arrived=True,
        distance_m=0,
        allowed_distance_m=float(checkpoint.activation_radius_m),
        session=serialize_session(session),
    )
