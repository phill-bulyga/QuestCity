from typing import Literal
from uuid import UUID, uuid4

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    HttpUrl,
    TypeAdapter,
    field_validator,
    model_validator,
)


class PartnerPlace(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    id: UUID = Field(default_factory=uuid4)
    name: str = Field(min_length=2, max_length=160)
    category: Literal["coffee", "food", "rest"] = "coffee"
    address: str = Field(min_length=3, max_length=300)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    description: str = Field(default="", max_length=1000)
    status: Literal["candidate", "partner"] = "candidate"
    offer: str = Field(default="", max_length=500)
    website: str | None = Field(default=None, max_length=1000)
    is_active: bool = True

    @field_validator("website")
    @classmethod
    def validate_url(cls, value: str | None) -> str | None:
        return str(TypeAdapter(HttpUrl).validate_python(value)) if value else None

    @model_validator(mode="after")
    def validate_place(self) -> "PartnerPlace":
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Укажите обе координаты или оставьте обе пустыми")
        if self.status == "candidate" and self.offer:
            raise ValueError("Предложения доступны только для подтверждённых партнёров")
        return self


class PartnerPlacesUpdate(BaseModel):
    places: list[PartnerPlace] = Field(default_factory=list, max_length=30)

    @model_validator(mode="after")
    def unique_ids(self) -> "PartnerPlacesUpdate":
        if len({place.id for place in self.places}) != len(self.places):
            raise ValueError("Идентификаторы мест должны быть уникальными")
        return self


class MapLocation(BaseModel):
    latitude: float
    longitude: float
