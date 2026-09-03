from pydantic import BaseModel
from datetime import datetime


class IssueCreate(BaseModel):
    user_id: int
    book_id: int


class IssueResponse(BaseModel):
    id: int
    user_id: int
    book_id: int
    issue_date: datetime
    due_date: datetime
    return_date: datetime | None = None
    status: str
    overdue_days: int = 0
    fine_amount: float = 0.0
    renewal_count: int = 0

    class Config:
        from_attributes = True


class WaitingReservation(BaseModel):
    reservation_id: int
    user_id: int
    message: str


class ReturnResponse(BaseModel):
    message: str
    issue_id: int
    book_id: int
    return_date: datetime
    overdue_days: int
    fine_amount: float
    status: str

    waiting_reservation: WaitingReservation | None = None