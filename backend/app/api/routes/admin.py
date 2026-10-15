from uuid import UUID

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.api.routes.quests import to_list_item
from app.models.quest import Quest, QuestReward, QuestStatus
from app.models.user import UserRole
from app.schemas.admin import ReviewDecision, RewardUpsert
from app.schemas.partners import PartnerPlace, PartnerPlacesUpdate
from app.schemas.quest import QuestAuthorRead, QuestListItem

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(user: CurrentUser) -> None:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Доступно только администратору")


async def load_quest(db: DbSession, quest_id: UUID) -> Quest:
    quest = await db.scalar(
        select(Quest)
        .options(selectinload(Quest.checkpoints), selectinload(Quest.reward))
        .where(Quest.id == quest_id)
    )
    if quest is None:
        raise HTTPException(status_code=404, detail="Квест не найден")
    return quest


@router.get("/review", response_model=list[QuestListItem])
async def review_queue(db: DbSession, current_user: CurrentUser) -> list[QuestListItem]:
    require_admin(current_user)
    quests = (
        await db.scalars(
            select(Quest)
            .options(selectinload(Quest.checkpoints))
            .where(Quest.status == QuestStatus.PENDING_REVIEW)
            .order_by(Quest.created_at)
        )
    ).all()
    return [to_list_item(quest) for quest in quests]


@router.get("/quests/{quest_id}", response_model=QuestAuthorRead)
async def review_quest(quest_id: UUID, db: DbSession, current_user: CurrentUser) -> QuestAuthorRead:
    require_admin(current_user)
    return QuestAuthorRead.model_validate(await load_quest(db, quest_id))


@router.post("/quests/{quest_id}/approve", response_model=QuestAuthorRead)
async def approve_quest(
    quest_id: UUID, db: DbSession, current_user: CurrentUser
) -> QuestAuthorRead:
    require_admin(current_user)
    quest = await load_quest(db, quest_id)
    if quest.status != QuestStatus.PENDING_REVIEW:
        raise HTTPException(status_code=409, detail="Квест не ожидает проверки")
    quest.status = QuestStatus.PUBLISHED
    quest.rejection_reason = ""
    await db.commit()
    return QuestAuthorRead.model_validate(quest)


@router.post("/quests/{quest_id}/reject", response_model=QuestAuthorRead)
async def reject_quest(
    quest_id: UUID, payload: ReviewDecision, db: DbSession, current_user: CurrentUser
) -> QuestAuthorRead:
    require_admin(current_user)
    quest = await load_quest(db, quest_id)
    if quest.status != QuestStatus.PENDING_REVIEW:
        raise HTTPException(status_code=409, detail="Квест не ожидает проверки")
    quest.status = QuestStatus.REJECTED
    quest.rejection_reason = payload.reason.strip()
    await db.commit()
    return QuestAuthorRead.model_validate(quest)


@router.get("/quests/{quest_id}/reward", response_model=RewardUpsert | None)
async def read_reward(
    quest_id: UUID, db: DbSession, current_user: CurrentUser
) -> RewardUpsert | None:
    require_admin(current_user)
    quest = await load_quest(db, quest_id)
    return RewardUpsert.model_validate(quest.reward, from_attributes=True) if quest.reward else None


@router.put("/quests/{quest_id}/reward", response_model=RewardUpsert)
async def save_reward(
    quest_id: UUID, payload: RewardUpsert, db: DbSession, current_user: CurrentUser
) -> RewardUpsert:
    require_admin(current_user)
    quest = await load_quest(db, quest_id)
    if quest.reward is None:
        quest.reward = QuestReward(quest_id=quest.id, **payload.model_dump())
        db.add(quest.reward)
    else:
        for field, value in payload.model_dump().items():
            setattr(quest.reward, field, value)
    await db.commit()
    return payload


@router.get("/quests/{quest_id}/partners", response_model=list[PartnerPlace])
async def read_partners(
    quest_id: UUID, db: DbSession, current_user: CurrentUser
) -> list[PartnerPlace]:
    require_admin(current_user)
    quest = await load_quest(db, quest_id)
    return [PartnerPlace.model_validate(place) for place in quest.partner_places]


@router.put("/quests/{quest_id}/partners", response_model=list[PartnerPlace])
async def save_partners(
    quest_id: UUID,
    payload: PartnerPlacesUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> list[PartnerPlace]:
    require_admin(current_user)
    quest = await load_quest(db, quest_id)
    quest.partner_places = [place.model_dump(mode="json") for place in payload.places]
    await db.commit()
    return payload.places
