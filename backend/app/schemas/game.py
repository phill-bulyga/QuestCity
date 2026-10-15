from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.schemas.partners import PartnerPlace
from app.schemas.quest import Guide, TaskHint, TravelFact


class GameSessionCreate(BaseModel):
    quest_id: UUID


class ArrivalRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy_m: float = Field(ge=0, le=5000)


class AnswerRequest(BaseModel):
    answer: str | list[str]

    @field_validator("answer")
    @classmethod
    def validate_answer(cls, value: str | list[str]) -> str | list[str]:
        if isinstance(value, str):
            if not 1 <= len(value.strip()) <= 500:
                raise ValueError("Ответ должен содержать от 1 до 500 символов")
        elif not 2 <= len(value) <= 10 or any(not 1 <= len(item) <= 300 for item in value):
            raise ValueError("Укажите от 2 до 10 элементов последовательности")
        return value


class HintRequest(BaseModel):
    checkpoint_id: UUID
    index: int = Field(ge=0, le=2)


class CheckpointReveal(BaseModel):
    title: str
    text: str
    image_url: str | None = None
    audio_url: str | None = None
    media_caption: str
    source_url: str | None = None


class GameCheckpoint(BaseModel):
    task_image_url: str | None = None
    task_image_caption: str = ""
    hints: list[TaskHint] = Field(default_factory=list)
    hint_count: int = 0
    next_hint_cost: int | None = None
    hint_penalty: int = 0
    id: UUID
    position: int
    title: str
    description: str
    latitude: float
    longitude: float
    activation_radius_m: int
    is_unlocked: bool
    task_type: str | None = None
    task_prompt: str | None = None
    answer_options: list[str] = Field(default_factory=list)
    points: int | None = None
    attempts_remaining: int = 3
    route_clue: str
    travel_facts: list[TravelFact]
    travel_fact_index: int
    travel_fact_count: int


class GameReward(BaseModel):
    partner_name: str
    venue_address: str
    offer: str
    promo_code: str
    redemption_instructions: str
    is_demo: bool


class JournalEntry(CheckpointReveal):
    chapter: int
    checkpoint_title: str


class GameSessionRead(BaseModel):
    guide: Guide | None = None
    journal: list[JournalEntry] = Field(default_factory=list)
    max_score: int = 0
    demo_mode: bool = True
    partner_places: list[PartnerPlace] = Field(default_factory=list)

    id: UUID
    quest_id: UUID
    quest_title: str
    status: str
    current_checkpoint_index: int
    checkpoint_count: int
    score: int
    started_at: datetime
    finished_at: datetime | None
    current_checkpoint: GameCheckpoint | None
    reward: GameReward | None = None
    reward_min_score: int | None = None


class ArrivalResponse(BaseModel):
    arrived: bool
    distance_m: float
    allowed_distance_m: float
    session: GameSessionRead


class AnswerResponse(BaseModel):
    is_correct: bool
    attempts_used: int
    attempts_remaining: int
    points_awarded: int
    correct_answer: str | None = None
    reveal: CheckpointReveal | None = None
    session: GameSessionRead
