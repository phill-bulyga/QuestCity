"""Create an extra demo without changing existing progress."""

import asyncio
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import select

from app.core.database import SessionFactory
from app.models.quest import Checkpoint, Quest, QuestStatus
from app.schemas.quest import CheckpointAuthorRead, CheckpointCreate, Guide

DEMO_ID = uuid5(NAMESPACE_URL, "questcity:taganrog:captain-adventure:v1")


async def main():
    async with SessionFactory() as db:
        if await db.get(Quest, DEMO_ID):
            print({"quest_id": str(DEMO_ID), "status": "already_exists"})
            return
        source = await db.scalar(
            select(Quest).where(Quest.title == "Таганрог: от Петра I до Чехова")
        )
        if source is None or len(source.checkpoints) < 3:
            raise RuntimeError("Сначала добавьте основной демо-маршрут")
        guide = Guide(
            name="Капитан городских историй",
            persona="captain",
            introduction=(
                "Добро пожаловать на борт! Нас ждут три испытания: старая "
                "открытка, перепутанная хронология и архитектурная загадка. "
                "Смотрите на детали — а если застрянете, я помогу подсказкой."
            ),
            completion=(
                "Все испытания позади! Теперь у вас есть собственная коллекция "
                "городских историй. До встречи на следующем маршруте!"
            ),
        )
        quest = Quest(
            id=DEMO_ID,
            author_id=source.author_id,
            title="Таганрог: испытания капитана",
            short_description=(
                "Три главы с проводником: фотозагадка, восстановление порядка "
                "событий и поиск ответа на месте. Подсказки помогут пройти "
                "маршрут в своём темпе."
            ),
            city=source.city,
            status=QuestStatus.PUBLISHED,
            estimated_duration_minutes=45,
            guide=guide.model_dump(),
            partner_places=source.partner_places,
            checkpoints=[],
        )
        for index, original in enumerate(source.checkpoints[:3]):
            data = CheckpointAuthorRead.model_validate(original).model_dump(
                exclude={"id", "position"}
            )
            if index == 0:
                data.update(
                    task_type="photo",
                    task_prompt="Какой памятник изображён на старой открытке?",
                    answer_options=[
                        "Памятник Петру I",
                        "Памятник Антону Чехову",
                        "Памятник Александру Пушкину",
                    ],
                    correct_answer="Памятник Петру I",
                    task_image_url=original.reveal_image_url,
                    task_image_caption="Старинная открытка из материалов маршрута",
                    hints=[
                        {
                            "text": (
                                "На открытке — основатель города. Его фигура в военном мундире "
                                "смотрит в сторону гавани."
                            ),
                            "cost": 20,
                        }
                    ],
                )
            elif index == 1:
                order = [
                    "Основание Таганрога",
                    "Строительство Каменной лестницы",
                    "Строительство дворца Алфераки",
                    "Рождение Антона Чехова",
                ]
                data.update(
                    task_type="ordering",
                    task_prompt="Расположите события от самого раннего к самому позднему.",
                    answer_options=order,
                    correct_order=order,
                    correct_answer="",
                    hints=[
                        {
                            "text": "Сначала основание города. Лестница появилась раньше дворца.",
                            "cost": 20,
                        },
                        {
                            "text": (
                                "Ключевые годы: 1698, 1823, 1848 и 1860. Рождение писателя — "
                                "последнее событие."
                            ),
                            "cost": 20,
                        },
                    ],
                )
            else:
                data.update(
                    task_type="text",
                    answer_options=[],
                    hints=[
                        {
                            "text": (
                                "Название стиля означает сочетание элементов разных "
                                "архитектурных направлений."
                            ),
                            "cost": 20,
                        },
                        {"text": "Ищите слово, начинающееся на «экле…».", "cost": 20},
                    ],
                )
            point = CheckpointCreate.model_validate(data)
            quest.checkpoints.append(Checkpoint(position=index, **point.model_dump(mode="json")))
        db.add(quest)
        await db.commit()
        print(
            {"quest_id": str(DEMO_ID), "status": "created", "tasks": ["photo", "ordering", "text"]}
        )


if __name__ == "__main__":
    asyncio.run(main())
