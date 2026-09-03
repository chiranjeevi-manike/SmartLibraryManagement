from pydantic import BaseModel, Field


class BookCreate(BaseModel):
    isbn: str
    title: str
    author_id: int
    category_id: int

    total_copies: int = Field(default=1, ge=1)


class BookUpdate(BaseModel):
    isbn: str | None = None
    title: str | None = None
    author_id: int | None = None
    category_id: int | None = None
    total_copies: int | None = Field(default=None, ge=1)
    is_active: bool | None = None


class BookResponse(BaseModel):
    id: int
    isbn: str
    title: str
    author_id: int
    category_id: int
    total_copies: int
    available_copies: int
    is_active: bool

    class Config:
        from_attributes = True