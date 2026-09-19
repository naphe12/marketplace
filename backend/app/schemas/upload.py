from pydantic import BaseModel, Field


class ImageUploadPrepareRequest(BaseModel):
    filename: str

    content_type: str

    size_bytes: int = Field(
        gt=0,
        le=8 * 1024 * 1024,
    )


class ImageUploadPrepareResponse(BaseModel):
    upload_url: str

    object_key: str

    expires_in: int


class ImageUploadConfirmRequest(BaseModel):
    object_key: str

    content_type: str

    size_bytes: int

    position: int = 0

    is_primary: bool = False