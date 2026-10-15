"""Add verified public venues as candidates, never as contracted partners."""

import asyncio
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import select

from app.core.database import SessionFactory
from app.models.quest import Quest
from app.schemas.partners import PartnerPlace

PLACES = [
    PartnerPlace(
        id=uuid5(NAMESPACE_URL, "https://yandex.com/maps/org/old_school_coffee/170881226404/"),
        name="Old School Coffee",
        category="coffee",
        address="Таганрог, Петровская улица, 9/11",
        latitude=47.206653,
        longitude=38.942165,
        description=(
            "Кофейная остановка на Петровской. Меню и часы работы уточняйте в карточке заведения."
        ),
        website="https://yandex.com/maps/org/old_school_coffee/170881226404/",
    ),
    PartnerPlace(
        id=uuid5(NAMESPACE_URL, "https://www.frekenbok-cafe.ru/"),
        name="Фрекен Бок",
        category="food",
        address="Таганрог, Тургеневский переулок, 24",
        latitude=47.21075,
        longitude=38.93211,
        description=(
            "Кафе в историческом центре для перерыва на еду или кофе. "
            "Уточните меню и часы работы перед визитом."
        ),
        website="https://www.frekenbok-cafe.ru/",
    ),
]


async def main() -> None:
    async with SessionFactory() as db:
        quests = (await db.scalars(select(Quest).where(Quest.city == "Таганрог"))).all()
        added = 0
        for quest in quests:
            current = quest.partner_places or []
            existing = {item["id"] for item in current}
            new = [
                place.model_dump(mode="json") for place in PLACES if str(place.id) not in existing
            ]
            quest.partner_places = [*current, *new]
            added += len(new)
        await db.commit()
        print({"quests": len(quests), "candidate_places_added": added})


if __name__ == "__main__":
    asyncio.run(main())
