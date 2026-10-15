from datetime import UTC, datetime
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from test_adventure import session_fixture

from app.api.routes import game
from app.schemas.game import AnswerRequest, HintRequest
from app.schemas.generation import GeneratedCheckpoint
from app.schemas.quest import CheckpointCreate, Guide


def point(**changes):
    return CheckpointCreate(
        **{
            **dict(
                title="Место",
                latitude=47.2,
                longitude=38.9,
                task_prompt="Вопрос?",
                correct_answer="Ответ",
            ),
            **changes,
        }
    )


@pytest.mark.parametrize(
    "changes",
    [
        dict(task_type="photo"),
        dict(
            task_type="ordering",
            answer_options=["Первый", "Второй"],
            correct_order=["Первый", "Первый"],
        ),
        dict(
            task_type="ordering",
            answer_options=["Первый", "Первый"],
            correct_order=["Первый", "Первый"],
        ),
        dict(hints=[dict(text="Помощь", cost=101)]),
        dict(task_image_url="javascript:alert(1)"),
    ],
)
def test_invalid_tasks_and_hint_prices(changes):
    with pytest.raises(ValidationError):
        point(**changes)


def test_valid_ordering():
    value = point(
        task_type="ordering",
        answer_options=["Второй", "Первый"],
        correct_order=["Первый", "Второй"],
    )
    assert value.correct_answer == "" and value.correct_order == ["Первый", "Второй"]


def test_generated_ordering():
    value = GeneratedCheckpoint(
        place_name="Место",
        title="Место",
        task_type="ordering",
        task_prompt="Восстановите порядок",
        answer_options=["Первый", "Второй"],
        correct_order=["Первый", "Второй"],
        hints=[dict(text="Начните с первого", cost=20)],
    )
    assert value.hints[0].cost == 20


def test_invalid_guide():
    with pytest.raises(ValidationError):
        Guide(name="Капитан", persona="unknown", introduction="Привет, игрок!")


def test_stable_shuffle_and_no_hint_spoilers():
    session = session_fixture(index=0)
    checkpoint = session.quest.checkpoints[0]
    checkpoint.task_type = "ordering"
    checkpoint.answer_options = ["Первый", "Второй", "Третий"]
    checkpoint.correct_order = list(checkpoint.answer_options)
    checkpoint.hints = [dict(text="Секретная помощь", cost=20)]
    assert game.serialize_session(session).current_checkpoint.hint_count == 0
    session.current_checkpoint_unlocked_at = datetime.now(UTC)
    first = game.serialize_session(session).current_checkpoint
    second = game.serialize_session(session).current_checkpoint
    assert first.answer_options == second.answer_options != checkpoint.correct_order
    assert first.hints == [] and first.next_hint_cost == 20
    assert (
        "correct_order" not in first.model_dump()
        and "Секретная помощь" not in first.model_dump_json()
    )


class Database:
    async def scalar(self, statement):
        return 0

    async def commit(self):
        pass

    def add(self, value):
        pass


def active_session(monkeypatch):
    session = session_fixture(index=0)
    session.score = 0
    session.current_checkpoint_unlocked_at = datetime.now(UTC)
    session.quest.checkpoints[0].hints = [
        dict(text="Первая подсказка", cost=20),
        dict(text="Вторая подсказка", cost=30),
    ]

    async def load(*args, **kwargs):
        assert kwargs.get("lock") is True
        return session

    monkeypatch.setattr(game, "load_session", load)
    return session


async def test_hint_retry_and_score(monkeypatch):
    session = active_session(monkeypatch)
    checkpoint = session.quest.checkpoints[0]
    user = SimpleNamespace(id=session.id)
    payload = HintRequest(checkpoint_id=checkpoint.id, index=0)
    for _ in range(2):
        result = await game.reveal_hint(session.id, payload, Database(), user)
        assert result.current_checkpoint.points == 80 and len(result.current_checkpoint.hints) == 1
    assert session.opened_hints[str(checkpoint.id)] == 1 and session.score == 0
    result = await game.submit_answer(
        session.id, AnswerRequest(answer=checkpoint.correct_answer), Database(), user
    )
    assert result.points_awarded == 80 and result.session.score == 80
    assert result.session.current_checkpoint.hint_penalty == 0


async def test_hint_cannot_skip_or_open_before_arrival(monkeypatch):
    session = active_session(monkeypatch)
    checkpoint = session.quest.checkpoints[0]
    user = SimpleNamespace(id=session.id)
    with pytest.raises(HTTPException) as error:
        await game.reveal_hint(
            session.id, HintRequest(checkpoint_id=checkpoint.id, index=1), Database(), user
        )
    assert error.value.status_code == 422
    session.current_checkpoint_unlocked_at = None
    with pytest.raises(HTTPException) as error:
        await game.reveal_hint(
            session.id, HintRequest(checkpoint_id=checkpoint.id, index=0), Database(), user
        )
    assert error.value.status_code == 409


async def test_ordering_rejects_duplicates_and_awards_correct(monkeypatch):
    session = active_session(monkeypatch)
    checkpoint = session.quest.checkpoints[0]
    user = SimpleNamespace(id=session.id)
    checkpoint.task_type = "ordering"
    checkpoint.answer_options = ["Первый", "Второй"]
    checkpoint.correct_order = ["Первый", "Второй"]
    with pytest.raises(HTTPException) as error:
        await game.submit_answer(
            session.id, AnswerRequest(answer=["Первый", "Первый"]), Database(), user
        )
    assert error.value.status_code == 422 and session.attempts == []
    result = await game.submit_answer(
        session.id, AnswerRequest(answer=checkpoint.correct_order), Database(), user
    )
    assert result.is_correct and result.points_awarded == 100
