"""Seed public example quests without copying local accounts or granting admin access."""

import asyncio
import secrets
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import select

from app.core.database import SessionFactory, engine
from app.core.security import hash_password
from app.models.quest import Quest
from app.models.user import User, UserRole
from scripts.seed_adventure import main as seed_adventure
from scripts.seed_taganrog import QUEST_TITLE, seed
from scripts.seed_taganrog_places import main as seed_places

AUTHOR_ID = uuid5(NAMESPACE_URL, "questcity:render:demo-author:v1")


async def main() -> None:
    async with SessionFactory() as db:
        existing = await db.scalar(select(Quest.id).where(Quest.title == QUEST_TITLE))
        if existing is None:
            author = await db.get(User, AUTHOR_ID)
            if author is None:
                db.add(
                    User(
                        id=AUTHOR_ID,
                        email="render-demo-author@questcity.invalid",
                        display_name="QuestCity — демонстрационные маршруты",
                        password_hash=hash_password(secrets.token_urlsafe(48)),
                        role=UserRole.AUTHOR,
                        is_active=False,
                    )
                )
                await db.commit()
    if existing is None:
        await seed(author_id=AUTHOR_ID)
        await seed_adventure()
        await seed_places()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
