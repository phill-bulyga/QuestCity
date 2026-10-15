import asyncio
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import SessionFactory
from app.models.quest import Checkpoint, Quest, QuestReward, QuestStatus, TaskType
from app.models.user import User, UserRole

QUEST_TITLE = "Таганрог: от Петра I до Чехова"

DEMO_QUESTIONS = {
    "Памятник Петру I": {
        "task_type": TaskType.SINGLE_CHOICE,
        "task_prompt": "Какой год основания Таганрога указан на памятнике?",
        "answer_options": ["1698", "1703", "1725"],
        "correct_answer": "1698",
    },
    "Каменная лестница": {
        "task_type": TaskType.SINGLE_CHOICE,
        "task_prompt": "На чьи средства была построена Каменная лестница?",
        "answer_options": ["Герасима Депальдо", "Антона Чехова", "Николая Алфераки"],
        "correct_answer": "Герасима Депальдо",
    },
    "Дворец Алфераки": {
        "task_type": TaskType.SINGLE_CHOICE,
        "task_prompt": "В каком архитектурном стиле построен дворец Алфераки?",
        "answer_options": ["Эклектика", "Конструктивизм", "Древнерусский стиль"],
        "correct_answer": "Эклектика",
    },
    "Домик Чехова": {
        "task_type": TaskType.SINGLE_CHOICE,
        "task_prompt": "В каком году родился Антон Павлович Чехов?",
        "answer_options": ["1860", "1854", "1898"],
        "correct_answer": "1860",
    },
}

ROUTE_STORY = {
    "Памятник Петру I": {
        "route_clue": "Начните там, где бронзовый основатель города смотрит в сторону гавани.",
        "travel_facts": [
            {
                "title": "Город у моря",
                "text": "Таганрог задумывался как крепость и морская гавань Петра I.",
            },
            {
                "title": "Первый след",
                "text": "На постаменте ищите годы: они помогут ответить на вопрос.",
            },
        ],
    },
    "Каменная лестница": {
        "route_clue": (
            "Вы узнали год начала морской истории города. Теперь найдите каменный спуск "
            "из старого Таганрога к морю."
        ),
        "travel_facts": [
            {
                "title": "Городские виды",
                "text": "С верхней части лестницы видны Таганрогский залив и набережная.",
            },
            {
                "title": "Имя мецената",
                "text": (
                    "У лестницы есть второе имя — Депальдовская. "
                    "Оно связано с меценатом, оплатившим её строительство."
                ),
            },
        ],
    },
    "Дворец Алфераки": {
        "route_clue": (
            "Лестницу городу подарил купец. Продолжите тему богатого Таганрога: "
            "ищите нарядный дворец на улице Фрунзе, ставший музеем."
        ),
        "travel_facts": [
            {
                "title": "От моря к дворцу",
                "text": "По пути от лестницы обратите внимание на старую купеческую застройку.",
            },
            {
                "title": "Архитектор",
                "text": "Дворец проектировал Андрей Штакеншнейдер — архитектор из Петербурга.",
            },
        ],
    },
    "Домик Чехова": {
        "route_clue": (
            "После роскошного дворца найдите его полную противоположность — "
            "маленький флигель на улице Чехова, где родился писатель."
        ),
        "travel_facts": [
            {
                "title": "Разница масштабов",
                "text": "После дворца маршрут ведёт к скромному дому совсем другой семьи.",
            },
            {
                "title": "День рождения",
                "text": "По новому стилю Чехов родился 29 января; по старому — 17 января.",
            },
        ],
    },
}

REVEALS = {
    "Памятник Петру I": {
        "reveal_title": "Памятник, к которому причастен Чехов",
        "reveal_text": (
            "Бронзовую фигуру создал скульптор Марк Антокольский. Антон Чехов помогал "
            "таганрогскому комитету вести переговоры со скульпторами и участвовал в истории "
            "создания памятника. Торжественное открытие состоялось в 1903 году."
        ),
        "reveal_image_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/"
            "Peter_I_1907_Taganrog.jpg?width=1200"
        ),
        "reveal_audio_url": None,
        "reveal_media_caption": "Памятник Петру I на открытке 1907 года",
        "reveal_source_url": ("https://commons.wikimedia.org/wiki/File:Peter_I_1907_Taganrog.jpg"),
    },
    "Каменная лестница": {
        "reveal_title": "Подарок городу от купца Депальдо",
        "reveal_text": (
            "Каменную лестницу построили в 1823 году на средства купца и мецената "
            "Герасима Депальдо. Она стала парадным спуском от исторического центра к морю "
            "и одним из самых узнаваемых видов Таганрога."
        ),
        "reveal_image_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/"
            "Old_Stone_Steps_(Taganrog).jpg?width=1200"
        ),
        "reveal_audio_url": None,
        "reveal_media_caption": "Каменная лестница до современной реконструкции",
        "reveal_source_url": (
            "https://commons.wikimedia.org/wiki/File:Old_Stone_Steps_(Taganrog).jpg"
        ),
    },
    "Дворец Алфераки": {
        "reveal_title": "Петербургский архитектор на юге России",
        "reveal_text": (
            "Дворец возвели в 1848 году для Николая Алфераки по проекту архитектора "
            "Андрея Штакеншнейдера. Позднее здесь размещалось коммерческое собрание, "
            "а сегодня здание занимает историко-краеведческий музей."
        ),
        "reveal_image_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/"
            "Alferaki_Palace_edit.jpg?width=1200"
        ),
        "reveal_audio_url": None,
        "reveal_media_caption": "Дворец Алфераки, вид на главный фасад",
        "reveal_source_url": ("https://commons.wikimedia.org/wiki/File:Alferaki_Palace_edit.jpg"),
    },
    "Домик Чехова": {
        "reveal_title": "Маленький дом большой литературы",
        "reveal_text": (
            "Антон Чехов родился здесь 17 января 1860 года по старому стилю. Семья снимала "
            "небольшой флигель с конца 1859-го до весны 1861 года. Сегодня в доме работает "
            "мемориальный музей писателя."
        ),
        "reveal_image_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/Chekhov_Birthhouse.jpg?width=1200"
        ),
        "reveal_audio_url": None,
        "reveal_media_caption": "Дом, в котором родился Антон Чехов",
        "reveal_source_url": ("https://commons.wikimedia.org/wiki/File:Chekhov_Birthhouse.jpg"),
    },
}


async def seed(author_id: UUID | None = None) -> None:
    async with SessionFactory() as db:
        existing = await db.scalar(
            select(Quest)
            .options(selectinload(Quest.checkpoints))
            .where(Quest.title == QUEST_TITLE, Quest.city == "Таганрог")
        )
        if existing is not None:
            for checkpoint in existing.checkpoints:
                reveal = REVEALS.get(checkpoint.title)
                if reveal:
                    for field, value in reveal.items():
                        setattr(checkpoint, field, value)
                story = ROUTE_STORY.get(checkpoint.title)
                if story:
                    checkpoint.route_clue = story["route_clue"]
                    checkpoint.travel_facts = story["travel_facts"]
                question = DEMO_QUESTIONS.get(checkpoint.title)
                if question:
                    for field, value in question.items():
                        setattr(checkpoint, field, value)
            if existing.reward is None:
                existing.reward = QuestReward(
                    partner_name="Демо-партнёр QuestCity",
                    venue_address="Учебная демонстрация, без реального адреса",
                    offer="Символический приз за прохождение маршрута",
                    promo_code="TAGANROG-DEMO",
                    redemption_instructions="Покажите экран завершения на презентации проекта.",
                    min_score=300,
                    is_demo=True,
                )
            author = await db.get(User, existing.author_id)
            if author and author.email == "integration@questcity.example.com":
                author.role = UserRole.ADMIN
            await db.commit()
            print(f"Updated quest: {existing.id}")
            return

        author = (
            await db.get(User, author_id)
            if author_id
            else await db.scalar(
                select(User).where(User.is_active.is_(True)).order_by(User.created_at)
            )
        )
        if author is None:
            raise RuntimeError("Create at least one QuestCity user before running the seed")

        quest = Quest(
            author_id=author.id,
            title=QUEST_TITLE,
            short_description=(
                "Прогулка по историческому центру Таганрога: основатель города, "
                "легендарная лестница, дворец и место рождения Чехова."
            ),
            city="Таганрог",
            status=QuestStatus.PUBLISHED,
            estimated_duration_minutes=75,
            checkpoints=[
                Checkpoint(
                    position=0,
                    title="Памятник Петру I",
                    description=(
                        "Начните маршрут у памятника основателю Таганрога в Петровском сквере. "
                        "Осмотрите надпись на постаменте."
                    ),
                    latitude=47.205015,
                    longitude=38.946355,
                    activation_radius_m=80,
                    **DEMO_QUESTIONS["Памятник Петру I"],
                    points=100,
                    max_attempts=3,
                    **ROUTE_STORY["Памятник Петру I"],
                    **REVEALS["Памятник Петру I"],
                ),
                Checkpoint(
                    position=1,
                    title="Каменная лестница",
                    description=(
                        "Пройдите к одной из главных городских достопримечательностей, "
                        "которая связывает исторический центр с побережьем."
                    ),
                    latitude=47.213220,
                    longitude=38.938816,
                    activation_radius_m=100,
                    **DEMO_QUESTIONS["Каменная лестница"],
                    points=100,
                    max_attempts=2,
                    **ROUTE_STORY["Каменная лестница"],
                    **REVEALS["Каменная лестница"],
                ),
                Checkpoint(
                    position=2,
                    title="Дворец Алфераки",
                    description=(
                        "Следующая остановка — нарядный особняк на улице Фрунзе, "
                        "где сегодня расположен краеведческий музей."
                    ),
                    latitude=47.213512,
                    longitude=38.928227,
                    activation_radius_m=70,
                    **DEMO_QUESTIONS["Дворец Алфераки"],
                    points=100,
                    max_attempts=2,
                    **ROUTE_STORY["Дворец Алфераки"],
                    **REVEALS["Дворец Алфераки"],
                ),
                Checkpoint(
                    position=3,
                    title="Домик Чехова",
                    description=(
                        "Завершите прогулку у небольшого флигеля на улице Чехова, "
                        "где родился будущий писатель."
                    ),
                    latitude=47.206944,
                    longitude=38.931389,
                    activation_radius_m=70,
                    **DEMO_QUESTIONS["Домик Чехова"],
                    points=100,
                    max_attempts=3,
                    **ROUTE_STORY["Домик Чехова"],
                    **REVEALS["Домик Чехова"],
                ),
            ],
            reward=QuestReward(
                partner_name="Демо-партнёр QuestCity",
                venue_address="Учебная демонстрация, без реального адреса",
                offer="Символический приз за прохождение маршрута",
                promo_code="TAGANROG-DEMO",
                redemption_instructions="Покажите экран завершения на презентации проекта.",
                min_score=300,
                is_demo=True,
            ),
        )
        if author.email == "integration@questcity.example.com":
            author.role = UserRole.ADMIN
        db.add(quest)
        await db.commit()
        print(f"Created quest: {quest.id}")


if __name__ == "__main__":
    asyncio.run(seed())
