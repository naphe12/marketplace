from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_admin
from app.core.database import get_db
from app.models.admin_note import AdminNote
from app.schemas.admin_note import AdminNoteCreate, AdminNoteResponse


router = APIRouter(
    prefix="/admin/notes",
    tags=["Admin notes"],
)


@router.get("", response_model=list[AdminNoteResponse])
async def list_admin_notes(
    target_type: str = Query(min_length=2, max_length=50),
    target_id: UUID = Query(),
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    result = await db.scalars(
        select(AdminNote)
        .where(
            AdminNote.target_type == target_type.upper(),
            AdminNote.target_id == target_id,
        )
        .order_by(AdminNote.created_at.desc())
    )

    return list(result.all())


@router.post("", response_model=AdminNoteResponse, status_code=201)
async def create_admin_note(
    payload: AdminNoteCreate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    note = AdminNote(
        author_user_id=admin.id,
        target_type=payload.target_type.upper(),
        target_id=payload.target_id,
        body=payload.body.strip(),
    )

    db.add(note)
    await db.commit()
    await db.refresh(note)

    return note
