from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.quest import QuestStatus, TaskType
from app.schemas.partners import MapLocation, PartnerPlace


class Guide(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    name: str = Field(min_length=2, max_length=80)
    persona: str = Field(default="explorer", pattern="^(captain|historian|explorer)$")
    introduction: str = Field(min_length=5, max_length=1200)
    completion: str = Field(
        default="Спасибо за прогулку! Сохраните открытия в своём дневнике.", max_length=1200
    )


class TaskHint(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    text: str = Field(min_length=3, max_length=1000)
    cost: int = Field(default=20, ge=0, le=10_000)


class TravelFact(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    text: str = Field(min_length=5, max_length=1200)


class CheckpointCreate(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=2000)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    activation_radius_m: int = Field(default=50, ge=10, le=500)
    task_type: TaskType = TaskType.TEXT
    task_prompt: str = Field(min_length=3, max_length=3000)
    answer_options: list[str] = Field(default_factory=list, max_length=10)
    correct_answer: str = Field(default="", max_length=300)
    correct_order: list[str] = Field(default_factory=list, max_length=10)
    task_image_url: str | None = Field(default=None, max_length=1000)
    task_image_caption: str = Field(default="", max_length=500)
    hints: list[TaskHint] = Field(default_factory=list, max_length=3)
    points: int = Field(default=100, ge=0, le=10_000)
    max_attempts: int = Field(default=3, ge=1, le=20)
    reveal_title: str = Field(default="", max_length=160)
    reveal_text: str = Field(default="", max_length=5000)
    reveal_image_url: str | None = Field(default=None, max_length=1000)
    reveal_audio_url: str | None = Field(default=None, max_length=1000)
    reveal_media_caption: str = Field(default="", max_length=500)
    reveal_source_url: str | None = Field(default=None, max_length=1000)
    route_clue: str = Field(default="", max_length=1500)
    travel_facts: list[TravelFact] = Field(default_factory=list, max_length=6)

    @field_validator("title", "task_prompt", "correct_answer")
    @classmethod
    def trim_text(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def validate_options(self) -> "CheckpointCreate":
        self.answer_options = [option.strip() for option in self.answer_options if option.strip()]
        if any(len(option) > 300 for option in self.answer_options):
            raise ValueError("Вариант ответа должен содержать не более 300 символов")
        if len({option.casefold() for option in self.answer_options}) != len(self.answer_options):
            raise ValueError("Варианты ответа не должны повторяться")
        if self.task_type == TaskType.ORDERING:
            self.correct_order = [item.strip() for item in self.correct_order]
            if len(self.answer_options) < 2 or sorted(self.correct_order) != sorted(
                self.answer_options
            ):
                raise ValueError("Правильный порядок должен включать каждый вариант ровно один раз")
            self.correct_answer = ""
        else:
            if not self.correct_answer:
                raise ValueError("Укажите правильный ответ")
            if self.correct_order:
                raise ValueError("Порядок используется только в задании на последовательность")
        if self.task_type == TaskType.PHOTO and not self.task_image_url:
            raise ValueError("Для фотозагадки добавьте изображение")
        if self.task_type == TaskType.SINGLE_CHOICE or (
            self.task_type == TaskType.PHOTO and self.answer_options
        ):
            if len(self.answer_options) < 2:
                raise ValueError("Для выбора ответа необходимо минимум два варианта")
            normalized_options = {option.casefold() for option in self.answer_options}
            if self.correct_answer.casefold() not in normalized_options:
                raise ValueError("Правильный ответ должен присутствовать среди вариантов")
        if self.task_type == TaskType.TEXT and self.answer_options:
            raise ValueError("Для текстового ответа варианты не нужны")
        if sum(hint.cost for hint in self.hints) > self.points:
            raise ValueError("Общая стоимость подсказок не может превышать баллы точки")
        return self

    @field_validator("reveal_image_url", "reveal_audio_url", "reveal_source_url", "task_image_url")
    @classmethod
    def validate_media_url(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        value = value.strip()
        if not value.startswith(("http://", "https://")):
            raise ValueError("Ссылка на материал должна начинаться с http:// или https://")
        return value


class CheckpointRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    position: int


class CheckpointAuthorRead(CheckpointRead):
    title: str
    description: str
    latitude: float
    longitude: float
    activation_radius_m: int
    task_type: str
    task_prompt: str
    answer_options: list[str]
    points: int
    max_attempts: int
    correct_answer: str
    correct_order: list[str] = Field(default_factory=list)
    task_image_url: str | None = None
    task_image_caption: str = ""
    hints: list[TaskHint] = Field(default_factory=list)
    reveal_title: str
    reveal_text: str
    reveal_image_url: str | None
    reveal_audio_url: str | None
    reveal_media_caption: str
    reveal_source_url: str | None
    route_clue: str
    travel_facts: list[TravelFact]


class QuestCreate(BaseModel):
    guide: Guide | None = None
    title: str = Field(min_length=3, max_length=120)
    short_description: str = Field(default="", max_length=300)
    city: str = Field(min_length=2, max_length=100)
    estimated_duration_minutes: int = Field(default=60, ge=10, le=1440)

    @field_validator("title", "city")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        return value.strip()


class QuestUpdate(BaseModel):
    guide: Guide | None = None
    title: str | None = Field(default=None, min_length=3, max_length=120)
    short_description: str | None = Field(default=None, max_length=300)
    city: str | None = Field(default=None, min_length=2, max_length=100)
    estimated_duration_minutes: int | None = Field(default=None, ge=10, le=1440)


class QuestListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    short_description: str
    city: str
    status: QuestStatus
    estimated_duration_minutes: int
    checkpoint_count: int = 0
    created_at: datetime


class QuestRead(BaseModel):
    guide: Guide | None = None
    partner_places: list[PartnerPlace] = Field(default_factory=list)
    start_location: MapLocation | None = None
    max_score: int = 0
    demo_mode: bool = True

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    author_id: UUID
    title: str
    short_description: str
    city: str
    status: QuestStatus
    estimated_duration_minutes: int
    checkpoints: list[CheckpointRead]
    created_at: datetime
    updated_at: datetime


class QuestAuthorRead(QuestRead):
    generation_plan: dict[str, Any] | None = None
    checkpoints: list[CheckpointAuthorRead]
    rejection_reason: str
