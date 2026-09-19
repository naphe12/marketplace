from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    slug: str = Field(min_length=2, max_length=150)

    description: str | None = None
    icon: str | None = None

    parent_id: UUID | None = None

    sort_order: int = 0


class CategoryResponse(BaseModel):
    id: UUID

    parent_id: UUID | None

    name: str
    slug: str

    description: str | None
    icon: str | None

    active: bool
    sort_order: int

    model_config = ConfigDict(
        from_attributes=True
    )


class CategoryAttributeCreate(BaseModel):
    name: str
    code: str

    data_type: str

    required: bool = False
    filterable: bool = False
    searchable: bool = False

    options: dict | None = None

    sort_order: int = 0


class CategoryAttributeResponse(BaseModel):
    id: UUID
    category_id: UUID

    name: str
    code: str

    data_type: str

    required: bool
    filterable: bool
    searchable: bool

    options: dict | None

    sort_order: int

    model_config = ConfigDict(
        from_attributes=True
    )