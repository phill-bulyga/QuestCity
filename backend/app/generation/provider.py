import json

import httpx
from pydantic import ValidationError

from app.core.config import Settings
from app.generation.prompt import build_generation_messages
from app.schemas.generation import GeneratedQuest, GenerationBrief


class GenerationError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


def is_configured(config: Settings) -> bool:
    return bool(config.llm_api_key.get_secret_value().strip())


async def generate_plan(
    brief: GenerationBrief,
    config: Settings,
    *,
    transport: httpx.AsyncBaseTransport | None = None,
) -> GeneratedQuest:
    if not is_configured(config):
        raise GenerationError(
            503, "Добавьте LLM_API_KEY в .env на сервере и перезапустите backend."
        )

    try:
        async with httpx.AsyncClient(
            timeout=config.llm_timeout_seconds,
            transport=transport,
            follow_redirects=False,
        ) as client:
            response = await client.post(
                f"{config.llm_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {config.llm_api_key.get_secret_value()}",
                },
                json={
                    "model": config.llm_model,
                    "messages": build_generation_messages(brief),
                    "response_format": {"type": "json_object"},
                    "max_tokens": config.llm_max_tokens,
                    "stream": False,
                },
            )
    except httpx.TimeoutException:
        raise GenerationError(
            504, "Генерация заняла слишком много времени. Попробуйте ещё раз."
        ) from None
    except httpx.RequestError:
        raise GenerationError(502, "Не удалось связаться с провайдером LLM.") from None

    if response.status_code in (401, 403):
        raise GenerationError(502, "Провайдер отклонил ключ LLM. Проверьте настройки сервера.")
    if response.status_code == 429:
        raise GenerationError(429, "Лимит запросов LLM исчерпан. Попробуйте позже.")
    if response.status_code < 200 or response.status_code >= 300:
        raise GenerationError(
            502, "Провайдер LLM не выполнил запрос. Проверьте модель и настройки."
        )

    try:
        choice = response.json()["choices"][0]
        if choice.get("finish_reason") != "stop":
            raise ValueError("Incomplete generation")
        content = choice["message"]["content"]
        if not isinstance(content, str) or len(content) > 200_000:
            raise ValueError("Invalid content")
        # Some compatible providers wrap otherwise-valid JSON in a markdown fence.
        content = content.strip()
        if content.startswith("```json\n") and content.endswith("```"):
            content = content[8:-3].strip()
        elif content.startswith("```\n") and content.endswith("```"):
            content = content[4:-3].strip()
        plan = GeneratedQuest.model_validate(json.loads(content))
        if len(plan.checkpoints) != brief.checkpoint_count:
            raise ValueError("Wrong checkpoint count")
        if plan.city.casefold() != brief.city.casefold():
            raise ValueError("Wrong city")
        if brief.task_format != "mixed" and any(
            point.task_type != brief.task_format for point in plan.checkpoints
        ):
            raise ValueError("Wrong task format")
        # Duration is the author's constraint, not a model-controlled field.
        plan.estimated_duration_minutes = brief.duration_minutes
        return plan
    except (KeyError, IndexError, TypeError, ValueError, ValidationError):
        raise GenerationError(
            502,
            "LLM вернула неполный или некорректный сценарий. Черновик не создан; повторите запрос.",
        ) from None
