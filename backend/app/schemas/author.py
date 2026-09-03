from pydantic import BaseModel


class AuthorCreate(BaseModel):
    name: str
    country: str | None = None


class AuthorUpdate(BaseModel):
    name: str | None = None
    country: str | None = None


class AuthorResponse(BaseModel):
    id: int
    name: str
    country: str | None = None

    class Config:
        from_attributes = True