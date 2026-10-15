from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.quest import CheckpointCreate, Guide, TaskHint, TravelFact


class GenerationBrief(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    city: str = Field(min_length=2, max_length=100)
    area: str = Field(default="", max_length=300)
    theme: Literal["history", "architecture", "culture", "mystery", "custom"] = "history"
    idea: str = Field(min_length=10, max_length=2000)
    audience: Literal["adults", "family", "teens"] = "adults"
    duration_minutes: int = Field(default=60, ge=10, le=240)
    checkpoint_count: int = Field(default=4, ge=2, le=12)
    difficulty: Literal["easy", "medium", "hard"] = "easy"
    tone: Literal["informative", "adventure", "detective"] = "adventure"
    task_format: Literal["single_choice", "text", "mixed"] = "single_choice"
    guide_style: Literal["none", "captain", "historian", "explorer"] = "explorer"
    preferred_places: list[str] = Field(default_factory=list, max_length=12)
    excluded_places: list[str] = Field(default_factory=list, max_length=12)
    step_free: bool = False
    outdoor_only: bool = True
    wishes: str = Field(default="", max_length=2000)
    source_notes: str = Field(default="", max_length=6000)

    @field_validator("preferred_places", "excluded_places")
    @classmethod
    def validate_places(cls, places: list[str]) -> list[str]:
        result = []
        for place in places:
            place = place.strip()
            if not 2 <= len(place) <= 200:
                raise ValueError("Название места должно содержать от 2 до 200 символов")
            if place not in result:
                result.append(place)
        return result

    @model_validator(mode="after")
    def validate_route_constraints(self) -> "GenerationBrief":
        excluded = {place.casefold() for place in self.excluded_places}
        if any(place.casefold() in excluded for place in self.preferred_places):
            raise ValueError("Одно место нельзя одновременно включить и исключить")
        return self


class GenerationPreparation(BaseModel):
    status: Literal["awaiting_provider", "ready"] = "awaiting_provider"
    brief: GenerationBrief
    message: str = "Анкета готова. Генерация станет доступна после подключения LLM."


class GenerationStatus(BaseModel):
    available: bool
    model: str


class GeneratedCheckpoint(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    place_name: str = Field(min_length=2, max_length=200)
    address_hint: str = Field(default="", max_length=500)
    title: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=2000)
    task_type: Literal["text", "single_choice", "ordering"]
    task_prompt: str = Field(min_length=3, max_length=3000)
    answer_options: list[str] = Field(default_factory=list, max_length=10)
    correct_answer: str = Field(default="", max_length=300)
    correct_order: list[str] = Field(default_factory=list, max_length=10)
    hints: list[TaskHint] = Field(default_factory=list, max_length=3)
    route_clue: str = Field(default="", max_length=1500)
    travel_facts: list[TravelFact] = Field(default_factory=list, max_length=6)
    reveal_title: str = Field(default="", max_length=160)
    reveal_text: str = Field(default="", max_length=5000)
    source_urls: list[str] = Field(default_factory=list, max_length=6)
    verification_notes: list[str] = Field(default_factory=list, max_length=12)

    @field_validator("source_urls")
    @classmethod
    def validate_sources(cls, values: list[str]) -> list[str]:
        from pydantic import HttpUrl, TypeAdapter

        if any(len(value) > 1000 for value in values):
            raise ValueError("Ссылка должна содержать не более 1000 символов")
        adapter = TypeAdapter(HttpUrl)
        return [str(adapter.validate_python(value)) for value in values]

    @field_validator("verification_notes", mode="before")
    @classmethod
    def normalize_notes(cls, value: object) -> object:
        if isinstance(value, str):
            return [value.strip()] if value.strip() else []
        return value

    @field_validator("verification_notes")
    @classmethod
    def validate_notes(cls, values: list[str]) -> list[str]:
        if any(not 1 <= len(value) <= 1000 for value in values):
            raise ValueError("Примечания должны содержать от 1 до 1000 символов")
        return values

    @model_validator(mode="after")
    def validate_task(self) -> "GeneratedCheckpoint":
        self.answer_options = [option.strip() for option in self.answer_options]
        if any(not 1 <= len(option) <= 300 for option in self.answer_options):
            raise ValueError("Некорректный вариант ответа")
        if self.task_type == "single_choice":
            normalized = [option.casefold() for option in self.answer_options]
            if len(normalized) < 2 or len(set(normalized)) != len(normalized):
                raise ValueError("Нужны минимум два разных варианта ответа")
            if self.correct_answer.casefold() not in normalized:
                raise ValueError("Правильный ответ должен присутствовать среди вариантов")
        elif self.task_type == "text" and self.answer_options:
            raise ValueError("Для текстового задания варианты ответа должны быть пустыми")
        CheckpointCreate(latitude=0, longitude=0, **self.model_dump())
        return self


class GeneratedQuest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    title: str = Field(min_length=3, max_length=120)
    guide: Guide | None = None
    short_description: str = Field(max_length=300)
    city: str = Field(min_length=2, max_length=100)
    estimated_duration_minutes: int = Field(ge=10, le=240)
    checkpoints: list[GeneratedCheckpoint] = Field(min_length=2, max_length=12)
    review_notes: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("review_notes", mode="before")
    @classmethod
    def normalize_notes(cls, value: object) -> object:
        if isinstance(value, str):
            return [value.strip()] if value.strip() else []
        return value

    @field_validator("review_notes")
    @classmethod
    def validate_notes(cls, values: list[str]) -> list[str]:
        if any(not 1 <= len(value) <= 1000 for value in values):
            raise ValueError("Примечания должны содержать от 1 до 1000 символов")
        return values


class GenerationResult(BaseModel):
    quest_id: str
    status: Literal["draft"] = "draft"
