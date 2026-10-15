from pydantic import BaseModel, Field


class ReviewDecision(BaseModel):
    reason: str = Field(min_length=5, max_length=1000)


class RewardUpsert(BaseModel):
    partner_name: str = Field(min_length=2, max_length=160)
    venue_address: str = Field(default="", max_length=300)
    offer: str = Field(min_length=3, max_length=300)
    promo_code: str = Field(min_length=3, max_length=100)
    redemption_instructions: str = Field(default="", max_length=1500)
    min_score: int = Field(default=0, ge=0, le=100_000)
    is_active: bool = True
    is_demo: bool = False
