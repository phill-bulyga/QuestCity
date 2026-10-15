from enum import StrEnum
from uuid import UUID

from sqlalchemy import JSON, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class QuestStatus(StrEnum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    PUBLISHED = "published"
    REJECTED = "rejected"
    ARCHIVED = "archived"


class TaskType(StrEnum):
    TEXT = "text"
    SINGLE_CHOICE = "single_choice"
    ORDERING = "ordering"
    PHOTO = "photo"


class Quest(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "quests"

    author_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    short_description: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=QuestStatus.DRAFT, nullable=False)
    estimated_duration_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    rejection_reason: Mapped[str] = mapped_column(Text, default="", nullable=False)

    partner_places: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)
    guide: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    generation_plan: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    checkpoints: Mapped[list["Checkpoint"]] = relationship(
        back_populates="quest",
        cascade="all, delete-orphan",
        order_by="Checkpoint.position",
        lazy="selectin",
    )
    reward: Mapped["QuestReward | None"] = relationship(
        back_populates="quest", cascade="all, delete-orphan", uselist=False, lazy="selectin"
    )


class Checkpoint(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "checkpoints"

    quest_id: Mapped[UUID] = mapped_column(
        ForeignKey("quests.id", ondelete="CASCADE"), index=True, nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    activation_radius_m: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    task_type: Mapped[str] = mapped_column(String(30), default=TaskType.TEXT, nullable=False)
    task_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    answer_options: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    correct_answer: Mapped[str] = mapped_column(String(300), nullable=False)
    points: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    reveal_title: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    reveal_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    reveal_image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    reveal_audio_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    reveal_media_caption: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    reveal_source_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    route_clue: Mapped[str] = mapped_column(Text, default="", nullable=False)
    travel_facts: Mapped[list[dict[str, str]]] = mapped_column(JSON, default=list, nullable=False)
    correct_order: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    task_image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    task_image_caption: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    hints: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)

    quest: Mapped[Quest] = relationship(back_populates="checkpoints")


class QuestReward(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "quest_rewards"

    quest_id: Mapped[UUID] = mapped_column(
        ForeignKey("quests.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    partner_name: Mapped[str] = mapped_column(String(160), nullable=False)
    venue_address: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    offer: Mapped[str] = mapped_column(String(300), nullable=False)
    promo_code: Mapped[str] = mapped_column(String(100), nullable=False)
    redemption_instructions: Mapped[str] = mapped_column(Text, default="", nullable=False)
    min_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    is_demo: Mapped[bool] = mapped_column(default=False, nullable=False)

    quest: Mapped[Quest] = relationship(back_populates="reward")
