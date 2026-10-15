from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.api.routes import admin, game, quests
from app.schemas.game import GameSessionCreate
from app.schemas.partners import PartnerPlace, PartnerPlacesUpdate


def partner(**changes):
    return PartnerPlace(
        name="Кофейная остановка", address="Таганрог, улица Петровская, 9", **changes
    )


@pytest.mark.parametrize(
    "changes",
    [
        {"latitude": 47.2},
        {"latitude": 91, "longitude": 38.9},
        {"status": "candidate", "offer": "Бесплатный кофе"},
        {"website": "javascript:alert(1)"},
    ],
)
def test_partner_records_reject_unverified_offers_and_invalid_locations(changes):
    with pytest.raises(ValidationError):
        partner(**changes)


def test_candidate_has_no_offer_and_duplicates_are_rejected():
    place = partner(latitude=47.2, longitude=38.9)
    assert place.status == "candidate" and place.offer == ""
    with pytest.raises(ValidationError):
        PartnerPlacesUpdate(places=[place, place])


async def test_only_admin_can_manage_places():
    with pytest.raises(HTTPException) as error:
        await admin.save_partners(
            uuid4(), PartnerPlacesUpdate(), None, SimpleNamespace(role="player")
        )
    assert error.value.status_code == 403


def session_fixture(index=1):
    points = []
    for i in range(2):
        points.append(
            SimpleNamespace(
                id=uuid4(),
                position=i,
                title=f"Секретное место {i}",
                description="Описание",
                latitude=47.2 + i * 0.001,
                longitude=38.9,
                activation_radius_m=50,
                task_type="text",
                task_image_url=None,
                task_image_caption="",
                hints=[],
                correct_order=[],
                task_prompt=f"Секретный вопрос {i}",
                answer_options=[],
                correct_answer="Секретный ответ",
                points=100,
                max_attempts=3,
                route_clue="Найдите ориентир",
                travel_facts=[],
                reveal_title=f"История {i}",
                reveal_text=f"Открытие {i}",
                reveal_image_url=None,
                reveal_audio_url=None,
                reveal_media_caption="",
                reveal_source_url=None,
            )
        )
    stop = partner().model_dump(mode="json")
    quest = SimpleNamespace(
        id=uuid4(),
        author_id=uuid4(),
        title="Истории города",
        city="Таганрог",
        short_description="Прогулка по городу",
        status="published",
        estimated_duration_minutes=30,
        checkpoints=points,
        partner_places=[stop, {**stop, "id": str(uuid4()), "is_active": False}],
        reward=None,
        guide=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    return SimpleNamespace(
        id=uuid4(),
        quest_id=quest.id,
        quest=quest,
        status="active",
        current_checkpoint_index=index,
        current_checkpoint_unlocked_at=None,
        score=100,
        travel_fact_index=0,
        started_at=datetime.now(UTC),
        finished_at=None,
        attempts=[],
        opened_hints={},
    )


def test_journal_contains_only_completed_chapters_and_partners_are_filtered():
    result = game.serialize_session(session_fixture())
    assert len(result.journal) == 1
    assert result.journal[0].text == "Открытие 0"
    assert result.current_checkpoint.task_prompt is None
    assert result.current_checkpoint.title == "Точка 2"
    assert len(result.partner_places) == 1
    assert result.max_score == 200
    assert "Секретный ответ" not in result.model_dump_json()


def test_remaining_attempts_survive_session_reload():
    session = session_fixture()
    point = session.quest.checkpoints[1]
    session.attempts = [SimpleNamespace(checkpoint_id=point.id)] * 2
    session.current_checkpoint_unlocked_at = datetime.now(UTC)
    result = game.serialize_session(session)
    assert result.current_checkpoint.attempts_remaining == 1
    assert result.current_checkpoint.task_prompt == "Секретный вопрос 1"


async def test_preview_exposes_only_start_and_hides_disabled_places(monkeypatch):
    session = session_fixture()

    async def load(*args):
        return session.quest

    monkeypatch.setattr(quests, "get_quest", load)
    result = await quests.read_quest(session.quest.id, None, SimpleNamespace(id=uuid4()))
    assert result.start_location.latitude == 47.2
    assert len(result.partner_places) == 1
    assert set(result.checkpoints[1].model_dump()) == {"id", "position"}
    assert result.max_score == 200


async def test_start_resumes_existing_game_instead_of_losing_progress(monkeypatch):
    session = session_fixture()

    class Database:
        values = iter([session.quest, session.id])

        async def scalar(self, statement):
            return next(self.values)

        def add(self, value):
            pytest.fail("Existing progress must not be replaced")

    async def load(*args):
        return session

    monkeypatch.setattr(game, "load_session", load)
    result = await game.start_session(
        GameSessionCreate(quest_id=session.quest.id), Database(), SimpleNamespace(id=uuid4())
    )
    assert result.id == session.id
    assert result.current_checkpoint_index == 1
    assert result.score == 100
