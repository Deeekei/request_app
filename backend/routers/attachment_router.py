import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.attachment import AttachmentDB
from backend.models.request import RequestDB
from backend.models.user import UserDB
from backend.routers.auth_router import get_current_user
from backend.schemas.attachment import AttachmentRead

router = APIRouter(prefix="/attachments", tags=["Attachments"])

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.ms-excel",
}


@router.post("/requests/{request_id}", response_model=AttachmentRead)
async def upload_attachment(
    request_id: int,
    file: UploadFile = File(...),
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    request = db.query(RequestDB).filter(RequestDB.id == request_id).first()

    if not request:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Недопустимый тип файла")

    file_bytes = await file.read()

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Файл слишком большой")

    original_name = file.filename or "file"

    extension = Path(original_name).suffix
    stored_name = f"{uuid.uuid4().hex}{extension}"

    request_dir = UPLOAD_DIR / str(request_id)
    request_dir.mkdir(parents=True, exist_ok=True)

    file_path = request_dir / stored_name

    with open(file_path, "wb") as f:
        f.write(file_bytes)

    attachment = AttachmentDB(
        request_id=request_id,
        original_name=original_name,
        stored_name=stored_name,
        file_path=str(file_path),
        content_type=file.content_type,
        size_bytes=len(file_bytes),
    )

    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return attachment


@router.get("/requests/{request_id}", response_model=list[AttachmentRead])
async def list_request_attachments(
    request_id: int,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(AttachmentDB)
        .filter(AttachmentDB.request_id == request_id)
        .order_by(AttachmentDB.uploaded_at.desc())
        .all()
    )


@router.get("/{attachment_id}/download")
async def download_attachment(
    attachment_id: int,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    attachment = db.query(AttachmentDB).filter(AttachmentDB.id == attachment_id).first()

    if not attachment:
        raise HTTPException(status_code=404, detail="Файл не найден")

    if not os.path.exists(attachment.file_path):
        raise HTTPException(status_code=404, detail="Файл отсутствует на сервере")

    return FileResponse(
        path=attachment.file_path,
        filename=attachment.original_name,
        media_type=attachment.content_type or "application/octet-stream",
    )


@router.delete("/{attachment_id}")
async def delete_attachment(
    attachment_id: int,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    attachment = db.query(AttachmentDB).filter(AttachmentDB.id == attachment_id).first()

    if not attachment:
        raise HTTPException(status_code=404, detail="Файл не найден")

    if os.path.exists(attachment.file_path):
        os.remove(attachment.file_path)

    db.delete(attachment)
    db.commit()

    return {"ok": True}