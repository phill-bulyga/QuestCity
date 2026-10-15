import json
from types import SimpleNamespace

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.api.deps import get_current_user
from app.api.routes.generation import router
from app.core.config import Settings
from app.generation.fields import FieldSuggestionRequest, suggest_field
from app.generation.provider import GenerationError


def config():
    return Settings(_env_file=None, llm_api_key="test-only-key")


def request(field="title", **changes):
    return FieldSuggestionRequest(
        scope="quest", field=field, context={"city": "Таганрог"}, **changes
    )


def response(value):
    return httpx.Response(
        200,
        json={
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {
                        "content": json.dumps(
                            {"value": value, "message": "Предложение для автора"},
                            ensure_ascii=False,
                        ),
                    },
                }
            ]
        },
    )


@pytest.mark.parametrize(
    "field,value",
    [
        ("title", "Морские истории"),
        ("duration_minutes", 60),
        ("theme", "history"),
        ("outdoor_only", True),
        ("preferred_places", "Каменная лестница\nПамятник Петру I"),
        ("travel_facts", "Город у моря | Город расположен у Азовского моря."),
    ],
)
async def test_typed_field_suggestions(field, value):
    def handler(req):
        payload = json.loads(req.content)
        assert payload["model"] == "gpt-6-luna"
        assert "test-only-key" not in req.content.decode()
        assert json.loads(payload["messages"][1]["content"])["field"] == field
        return response(value)

    result = await suggest_field(request(field), config(), transport=httpx.MockTransport(handler))
    assert result.value == value


@pytest.mark.parametrize(
    "field,value",
    [
        ("title", "a"),
        ("duration_minutes", 999),
        ("duration_minutes", True),
        ("theme", "invalid"),
        ("outdoor_only", "yes"),
        ("answer_options", "One"),
        ("travel_facts", "Fact without delimiter"),
    ],
)
async def test_invalid_field_results_do_not_pass_validation(field, value):
    with pytest.raises(GenerationError) as error:
        await suggest_field(
            request(field), config(), transport=httpx.MockTransport(lambda req: response(value))
        )
    assert error.value.status_code == 502


@pytest.mark.parametrize("field", ["latitude", "longitude", "reveal_source_url", "source_notes"])
async def test_grounded_fields_are_not_invented_or_sent_to_provider(field):
    def handler(req):
        pytest.fail("This field must not invent real data")

    result = await suggest_field(request(field), config(), transport=httpx.MockTransport(handler))
    assert result.value is None
    assert result.message


async def test_correct_answer_must_match_existing_options():
    payload = FieldSuggestionRequest(
        scope="checkpoint",
        field="correct_answer",
        context={
            "task_type": "single_choice",
            "answer_options": "Азовское море\nЧёрное море",
        },
    )
    with pytest.raises(GenerationError):
        await suggest_field(
            payload,
            config(),
            transport=httpx.MockTransport(lambda req: response("Балтийское море")),
        )


async def test_model_can_request_more_context():
    result = await suggest_field(
        request(), config(), transport=httpx.MockTransport(lambda req: response(None))
    )
    assert result.value is None


@pytest.mark.parametrize(
    "payload",
    [
        {"scope": "quest", "field": "api_key", "context": {}},
        {"scope": "quest", "field": "title", "context": {"api_key": "not-accepted"}},
        {"scope": "quest", "field": "title", "context": {"idea": "a" * 25000}},
    ],
)
def test_only_author_context_is_accepted(payload):
    with pytest.raises(ValidationError):
        FieldSuggestionRequest.model_validate(payload)


def test_field_endpoint_requires_authentication():
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    payload = request("latitude").model_dump()
    assert client.post("/quest-generation/suggest-field", json=payload).status_code == 401
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id="test-author")
    result = client.post("/quest-generation/suggest-field", json=payload)
    assert result.status_code == 200
    assert result.json()["value"] is None
