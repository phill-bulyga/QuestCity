from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.models.quest import Checkpoint, Quest, QuestStatus
from app.models.user import UserRole
from app.schemas.partners import MapLocation
from app.schemas.quest import (
    CheckpointAuthorRead,
    CheckpointCreate,
    QuestAuthorRead,
    QuestCreate,
    QuestListItem,
    QuestRead,
    QuestUpdate,
)

router = APIRouter(prefix="/quests", tags=["quests"])


def to_list_item(quest: Quest) -> QuestListItem:
    return QuestListItem(
        id=quest.id,
        title=quest.title,
        short_description=quest.short_description,
        city=quest.city,
        status=quest.status,
        estimated_duration_minutes=quest.estimated_duration_minutes,
        checkpoint_count=len(quest.checkpoints),
        created_at=quest.created_at,
    )


async def get_quest(db: DbSession, quest_id: UUID, *, lock: bool = False) -> Quest | None:
    statement = select(Quest).options(selectinload(Quest.checkpoints)).where(Quest.id == quest_id)
    if lock:
        statement = statement.with_for_update()
    return await db.scalar(statement)


async def get_owned_quest(
    db: DbSession,
    quest_id: UUID,
    user_id: UUID,
    *,
    lock: bool = False,
) -> Quest:
    quest = await get_quest(db, quest_id, lock=lock)
    if quest is None:
        raise HTTPException(status_code=404, detail="Квест не найден")
    if quest.author_id != user_id:
        raise HTTPException(status_code=403, detail="Редактировать квест может только автор")
    return quest


@router.get("", response_model=list[QuestListItem])
async def list_published_quests(db: DbSession) -> list[QuestListItem]:
    quests = (
        await db.scalars(
            select(Quest)
            .options(selectinload(Quest.checkpoints))
            .where(Quest.status == QuestStatus.PUBLISHED)
            .order_by(Quest.created_at.desc())
        )
    ).all()
    return [to_list_item(quest) for quest in quests]


@router.get("/mine", response_model=list[QuestListItem])
async def list_my_quests(db: DbSession, current_user: CurrentUser) -> list[QuestListItem]:
    quests = (
        await db.scalars(
            select(Quest)
            .options(selectinload(Quest.checkpoints))
            .where(Quest.author_id == current_user.id)
            .order_by(Quest.updated_at.desc())
        )
    ).all()
    return [to_list_item(quest) for quest in quests]


@router.post("", response_model=QuestAuthorRead, status_code=status.HTTP_201_CREATED)
async def create_quest(
    payload: QuestCreate, db: DbSession, current_user: CurrentUser
) -> QuestAuthorRead:
    quest = Quest(author_id=current_user.id, **payload.model_dump())
    db.add(quest)
    if current_user.role == UserRole.PLAYER:
        current_user.role = UserRole.AUTHOR
    await db.commit()
    await db.refresh(quest)
    return QuestAuthorRead.model_validate(quest)


@router.get("/{quest_id}", response_model=QuestRead)
async def read_quest(quest_id: UUID, db: DbSession, current_user: CurrentUser) -> QuestRead:
    quest = await get_quest(db, quest_id)
    if quest is None:
        raise HTTPException(status_code=404, detail="Квест не найден")
    if quest.status != QuestStatus.PUBLISHED and quest.author_id != current_user.id:
        raise HTTPException(status_code=404, detail="Квест не найден")
    result = QuestRead.model_validate(quest)
    first = quest.checkpoints[0] if quest.checkpoints else None
    return result.model_copy(
        update={
            "partner_places": [place for place in result.partner_places if place.is_active],
            "start_location": MapLocation(latitude=first.latitude, longitude=first.longitude)
            if first
            else None,
            "max_score": sum(point.points for point in quest.checkpoints),
            "demo_mode": settings.allow_location_bypass,
        }
    )


@router.get("/{quest_id}/edit", response_model=QuestAuthorRead)
async def read_quest_for_editing(
    quest_id: UUID, db: DbSession, current_user: CurrentUser
) -> QuestAuthorRead:
    quest = await get_owned_quest(db, quest_id, current_user.id)
    return QuestAuthorRead.model_validate(quest)


@router.patch("/{quest_id}", response_model=QuestAuthorRead)
async def update_quest(
    quest_id: UUID,
    payload: QuestUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> QuestAuthorRead:
    quest = await get_owned_quest(db, quest_id, current_user.id)
    if quest.status not in (QuestStatus.DRAFT, QuestStatus.REJECTED):
        raise HTTPException(status_code=409, detail="Квест сейчас нельзя изменять")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(quest, field, value.strip() if isinstance(value, str) else value)
    await db.commit()
    await db.refresh(quest)
    return QuestAuthorRead.model_validate(quest)


@router.post(
    "/{quest_id}/checkpoints",
    response_model=CheckpointAuthorRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_checkpoint(
    quest_id: UUID,
    payload: CheckpointCreate,
    db: DbSession,
    current_user: CurrentUser,
    generation_index: int | None = Query(default=None, ge=0),
) -> CheckpointAuthorRead:
    quest = await get_owned_quest(db, quest_id, current_user.id, lock=True)
    if quest.status not in (QuestStatus.DRAFT, QuestStatus.REJECTED):
        raise HTTPException(status_code=409, detail="Квест сейчас нельзя изменять")
    if generation_index is not None:
        plan = quest.generation_plan or {}
        if generation_index >= len(plan.get("checkpoints", [])):
            raise HTTPException(422, "Предложенная точка не найдена")
        if generation_index in plan.get("confirmed_indices", []):
            raise HTTPException(409, "Эта предложенная точка уже добавлена")
        quest.generation_plan = {
            **plan,
            "confirmed_indices": [*plan.get("confirmed_indices", []), generation_index],
        }
    checkpoint = Checkpoint(
        quest_id=quest.id,
        position=len(quest.checkpoints),
        **payload.model_dump(mode="json"),
    )
    db.add(checkpoint)
    await db.commit()
    await db.refresh(checkpoint)
    return CheckpointAuthorRead.model_validate(checkpoint)


@router.post("/{quest_id}/publish", response_model=QuestAuthorRead)
async def publish_quest(
    quest_id: UUID, db: DbSession, current_user: CurrentUser
) -> QuestAuthorRead:
    quest = await get_owned_quest(db, quest_id, current_user.id, lock=True)
    if quest.generation_plan:
        proposed = quest.generation_plan.get("checkpoints", [])
        confirmed = quest.generation_plan.get("confirmed_indices", [])
        if any(index not in confirmed for index in range(len(proposed))):
            raise HTTPException(
                422, "Проверьте и добавьте все предложенные точки перед публикацией"
            )
    if not quest.checkpoints:
        raise HTTPException(status_code=422, detail="Добавьте минимум одну контрольную точку")
    if quest.status not in (QuestStatus.DRAFT, QuestStatus.REJECTED):
        raise HTTPException(status_code=409, detail="Квест уже отправлен на проверку")
    quest.status = QuestStatus.PENDING_REVIEW
    quest.rejection_reason = ""
    await db.commit()
    await db.refresh(quest)
    return QuestAuthorRead.model_validate(quest)
