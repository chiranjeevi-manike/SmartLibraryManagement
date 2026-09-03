from pydantic import BaseModel, ConfigDict
from datetime import datetime


class ReservationCreate(BaseModel):
    book_id: int


class ReservationResponse(BaseModel):
    id: int
    user_id: int
    book_id: int
    reserved_at: datetime
    status: str

    model_config = ConfigDict(from_attributes=True)