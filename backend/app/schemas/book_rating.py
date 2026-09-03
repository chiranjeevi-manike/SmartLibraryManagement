from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class BookRatingCreate(BaseModel):
    book_id: int
    rating: int = Field(..., ge=1, le=5)
    review: Optional[str] = None


class BookRatingUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    review: Optional[str] = None


class BookRatingResponse(BaseModel):
    id: int
    user_id: int
    book_id: int
    rating: int
    review: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True