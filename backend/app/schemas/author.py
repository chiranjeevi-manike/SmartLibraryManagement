from pydantic import BaseModel, ConfigDict


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

    model_config = ConfigDict(
        from_attributes=True
    )