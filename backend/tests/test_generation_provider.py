import json
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.api.deps import get_current_user
from app.api.routes import generation
from app.core.config import Settings
from app.core.database import get_db
from app.generation.provider import GenerationError, generate_plan
from app.models.user import UserRole
from app.schemas.generation import GeneratedQuest, GenerationBrief


def brief() -> GenerationBrief:
    return GenerationBrief(
        city="Таганрог", idea="Морская история города и его жителей", checkpoint_count=2
    )


def plan_data() -> dict:
    point = dict(
        place_name="Каменная лестница",
        address_hint="Центр города",
        title="К морю",
        task_type="single_choice",
        task_prompt="Куда ведёт лестница?",
        answer_options=["К морю", "К театру"],
        correct_answer="К морю",
        travel_facts=[],
        verification_notes=["Проверьте адрес и исторические сведения"],
    )
    return dict(
        title="Морские истории",
        short_description="Прогулка по городу",
        city="Таганрог",
        estimated_duration_minutes=60,
        checkpoints=[point, {**point, "title": "История города"}],
        review_notes=["Подтвердите доступность маршрута"],
    )


def config() -> Settings:
    return Settings(_env_file=None, llm_api_key=SecretStr("test-only-key"))


def completion(data: dict, finish_reason: str = "stop") -> dict:
    return {"choices": [{"finish_reason": finish_reason, "message": {"content": json.dumps(data)}}]}


async def test_compatible_request_uses_selected_model_and_validates_response() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert str(request.url) == "https://ai.starimg.ru/v1/chat/completions"
        assert request.headers["Authorization"] == "Bearer test-only-key"
        payload = json.loads(request.content)
        assert payload["model"] == "gpt-6-luna"
        assert "temperature" not in payload
        assert "test-only-key" not in json.dumps(payload)
        assert payload["response_format"] == {"type": "json_object"}
        assert json.loads(payload["messages"][1]["content"]) == brief().model_dump()
        return httpx.Response(200, json=completion(plan_data()))

    result = await generate_plan(brief(), config(), transport=httpx.MockTransport(handler))
    assert len(result.checkpoints) == 2
    assert result.title == "Морские истории"
    assert "latitude" not in result.checkpoints[0].model_dump()


async def test_missing_key_never_contacts_provider() -> None:
    def handler(request):
        pytest.fail("Provider must not be contacted without a key")

    with pytest.raises(GenerationError) as error:
        await generate_plan(
            brief(),
            Settings(_env_file=None, llm_api_key=""),
            transport=httpx.MockTransport(handler),
        )
    assert error.value.status_code == 503


@pytest.mark.parametrize(
    "status, expected", [(401, 502), (403, 502), (429, 429), (500, 502), (302, 502)]
)
async def test_provider_errors_are_safe(status, expected) -> None:
    with pytest.raises(GenerationError) as error:
        await generate_plan(
            brief(),
            config(),
            transport=httpx.MockTransport(
                lambda request: httpx.Response(status, text="test-only-key secret upstream error"),
            ),
        )
    assert error.value.status_code == expected
    assert "test-only-key" not in error.value.detail
    assert "upstream" not in error.value.detail


@pytest.mark.parametrize(
    "mutation",
    [
        "truncated",
        "wrong_count",
        "wrong_city",
        "wrong_format",
        "bad_answer",
        "coordinates",
    ],
)
async def test_invalid_scenario_does_not_pass_validation(mutation) -> None:
    data = plan_data()
    if mutation == "wrong_count":
        data["checkpoints"] = data["checkpoints"][:1]
    elif mutation == "wrong_city":
        data["city"] = "Москва"
    elif mutation == "wrong_format":
        data["checkpoints"][0].update(task_type="text", answer_options=[])
    elif mutation == "bad_answer":
        data["checkpoints"][0]["correct_answer"] = "Неизвестно"
    elif mutation == "coordinates":
        data["checkpoints"][0]["latitude"] = 47.2
    with pytest.raises(GenerationError) as error:
        await generate_plan(
            brief(),
            config(),
            transport=httpx.MockTransport(
                lambda request: httpx.Response(
                    200,
                    json=completion(
                        data,
                        "length" if mutation == "truncated" else "stop",
                    ),
                ),
            ),
        )
    assert error.value.status_code == 502


async def test_timeout_is_reported_without_credentials() -> None:
    def handler(request):
        raise httpx.ReadTimeout("test-only-key", request=request)

    with pytest.raises(GenerationError) as error:
        await generate_plan(brief(), config(), transport=httpx.MockTransport(handler))
    assert error.value.status_code == 504
    assert "test-only-key" not in str(error.value)


class FakeDatabase:
    def __init__(self):
        self.added = []
        self.committed = False

    def add(self, quest):
        quest.id = uuid4()
        self.added.append(quest)

    async def commit(self):
        self.committed = True

    async def refresh(self, quest):
        pass

    async def rollback(self):
        pass


def test_success_saves_only_an_author_owned_draft(monkeypatch) -> None:
    app = FastAPI()
    app.include_router(generation.router)
    db = FakeDatabase()
    user = SimpleNamespace(id=uuid4(), role=UserRole.PLAYER)
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: db

    async def generate(payload, settings):
        return GeneratedQuest.model_validate(plan_data())

    monkeypatch.setattr(generation, "generate_plan", generate)
    response = TestClient(app).post("/quest-generation/generate", json=brief().model_dump())
    assert response.status_code == 201
    assert response.json()["quest_id"] == str(db.added[0].id)
    assert db.committed
    assert db.added[0].status == "draft"
    assert db.added[0].author_id == user.id
    assert db.added[0].checkpoints == []
    assert len(db.added[0].generation_plan["checkpoints"]) == 2
    assert user.role == UserRole.AUTHOR
    assert not generation._in_flight


def test_failed_provider_creates_no_quest_and_releases_in_flight_guard(monkeypatch) -> None:
    app = FastAPI()
    app.include_router(generation.router)
    db = FakeDatabase()
    user = SimpleNamespace(id=uuid4(), role=UserRole.PLAYER)
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: db

    async def generate(payload, settings):
        raise GenerationError(502, "Некорректный ответ")

    monkeypatch.setattr(generation, "generate_plan", generate)
    response = TestClient(app).post("/quest-generation/generate", json=brief().model_dump())
    assert response.status_code == 502
    assert not db.added
    assert not db.committed
    assert not generation._in_flight
    assert user.role == UserRole.PLAYER


def test_status_does_not_expose_key(monkeypatch) -> None:
    app = FastAPI()
    app.include_router(generation.router)
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=uuid4())
    monkeypatch.setattr(generation, "settings", config())
    payload = TestClient(app).get("/quest-generation/status").json()
    assert payload == {"available": True, "model": "gpt-6-luna"}
    assert "test-only-key" not in json.dumps(payload)


async def test_generated_suggestion_is_confirmed_atomically_and_cannot_be_reused(
    monkeypatch,
) -> None:
    from datetime import UTC, datetime

    from fastapi import HTTPException

    from app.api.routes import quests
    from app.schemas.quest import CheckpointCreate

    user = SimpleNamespace(id=uuid4())
    quest = SimpleNamespace(
        id=uuid4(),
        author_id=user.id,
        status="draft",
        generation_plan=plan_data(),
        checkpoints=[],
    )
    db = FakeDatabase()

    async def owned(database, quest_id, user_id, *, lock=False):
        assert lock
        return quest

    def add_checkpoint(point):
        point.id = uuid4()
        point.created_at = datetime.now(UTC)
        db.added.append(point)

    monkeypatch.setattr(quests, "get_owned_quest", owned)
    monkeypatch.setattr(db, "add", add_checkpoint)
    payload = CheckpointCreate(
        title="К морю",
        latitude=47.2,
        longitude=38.9,
        task_type="single_choice",
        task_prompt="Куда ведёт лестница?",
        answer_options=["К морю", "К театру"],
        correct_answer="К морю",
    )
    result = await quests.add_checkpoint(quest.id, payload, db, user, generation_index=0)
    assert result.latitude == 47.2
    assert quest.generation_plan["confirmed_indices"] == [0]
    assert db.committed
    assert len(db.added) == 1
    with pytest.raises(HTTPException) as error:
        await quests.add_checkpoint(quest.id, payload, db, user, generation_index=0)
    assert error.value.status_code == 409
    assert len(db.added) == 1
    with pytest.raises(HTTPException) as error:
        await quests.add_checkpoint(quest.id, payload, db, user, generation_index=10)
    assert error.value.status_code == 422
    assert len(db.added) == 1


async def test_unconfirmed_plan_cannot_be_submitted_for_publication(monkeypatch) -> None:
    from fastapi import HTTPException

    from app.api.routes import quests

    user = SimpleNamespace(id=uuid4())
    quest = SimpleNamespace(id=uuid4(), generation_plan=plan_data(), checkpoints=[object()])

    async def owned(*args, **kwargs):
        return quest

    monkeypatch.setattr(quests, "get_owned_quest", owned)
    with pytest.raises(HTTPException) as error:
        await quests.publish_quest(quest.id, FakeDatabase(), user)
    assert error.value.status_code == 422


@pytest.mark.parametrize("notes", ["Проверьте адрес", ""])
async def test_provider_single_text_notes_are_normalized(notes) -> None:
    data = plan_data()
    data["review_notes"] = notes
    for point in data["checkpoints"]:
        point["verification_notes"] = notes
    result = await generate_plan(
        brief(),
        config(),
        transport=httpx.MockTransport(
            lambda request: httpx.Response(200, json=completion(data)),
        ),
    )
    expected = [notes] if notes else []
    assert result.review_notes == expected
    assert all(point.verification_notes == expected for point in result.checkpoints)
