from datetime import datetime
from enum import StrEnum
from uuid import UUID

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class GameSessionStatus(StrEnum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class GameSession(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "game_sessions"

    quest_id: Mapped[UUID] = mapped_column(
        ForeignKey("quests.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    player_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), default=GameSessionStatus.ACTIVE, nullable=False
    )
    current_checkpoint_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    current_checkpoint_unlocked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    travel_fact_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    opened_hints: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    quest = relationship("Quest", lazy="selectin")
    attempts: Mapped[list["TaskAttempt"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", lazy="selectin"
    )


class TaskAttempt(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "task_attempts"

    session_id: Mapped[UUID] = mapped_column(
        ForeignKey("game_sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    checkpoint_id: Mapped[UUID] = mapped_column(
        ForeignKey("checkpoints.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    points_awarded: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    session: Mapped[GameSession] = relationship(back_populates="attempts")
