import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import date
from backend.models.enum import AttachmentTypeEnum, OrderStatusEnum, UserRoleEnum
from backend.database import get_db
from backend.models.attachment import AttachmentDB
from backend.models.request import RequestDB
from backend.models.user import UserDB
from backend.routers.auth_router import get_current_user
from backend.schemas.attachment import AttachmentRead
from pydantic import BaseModel
from typing import Optional
from backend.models.enum import InvoicePaymentStatusEnum, InvoiceApprovalStatusEnum

class InvoiceStatusUpdate(BaseModel):
    payment_status: Optional[InvoicePaymentStatusEnum] = None
    approval_status: Optional[InvoiceApprovalStatusEnum] = None
    delivery_date: Optional[date] = None
    is_delivered: Optional[bool] = None

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

async def save_attachment_file(
    *,
    request_id: int,
    file: UploadFile,
    attachment_type: AttachmentTypeEnum,
    db: Session,
) -> AttachmentDB:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Недопустимый тип файла")

    file_bytes = await file.read()

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Файл слишком большой")

    original_name = file.filename or "file"

    extension = Path(original_name).suffix
    stored_name = f"{uuid.uuid4().hex}{extension}"

    request_dir = UPLOAD_DIR / str(request_id) / attachment_type.value.lower()
    request_dir.mkdir(parents=True, exist_ok=True)

    file_path = request_dir / stored_name

    with open(file_path, "wb") as f:
        f.write(file_bytes)

    attachment = AttachmentDB(
        request_id=request_id,
        attachment_type=attachment_type,
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

@router.post("/requests/{request_id}/files", response_model=AttachmentRead)
async def upload_request_file(
    request_id: int,
    file: UploadFile = File(...),
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    request = db.query(RequestDB).filter(RequestDB.id == request_id).first()

    if not request:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    if request.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Файл может добавить только автор заявки")

    if request.status not in [OrderStatusEnum.DRAFT, OrderStatusEnum.REJECTED]:
        raise HTTPException(status_code=400, detail="Файлы можно добавлять только в черновик или отклонённую заявку")

    return await save_attachment_file(
        request_id=request_id,
        file=file,
        attachment_type=AttachmentTypeEnum.REQUEST_FILE,
        db=db,
    )

@router.post("/requests/{request_id}/invoices", response_model=AttachmentRead)
async def upload_invoice(
    request_id: int,
    file: UploadFile = File(...),
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    request = db.query(RequestDB).filter(RequestDB.id == request_id).first()

    if not request:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    if current_user.role != UserRoleEnum.EXECUTOR:
        raise HTTPException(status_code=403, detail="Счёт может добавить только Снабжение")

    if request.status != OrderStatusEnum.APPROVED:
        raise HTTPException(status_code=400, detail="Счёт можно добавить только к согласованной заявке")

    return await save_attachment_file(
        request_id=request_id,
        file=file,
        attachment_type=AttachmentTypeEnum.INVOICE,
        db=db,
    )


@router.get("/requests/{request_id}", response_model=list[AttachmentRead])
async def list_request_attachments(
    request_id: int,
    attachment_type: AttachmentTypeEnum | None = None,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(AttachmentDB).filter(AttachmentDB.request_id == request_id)

    if attachment_type is not None:
        query = query.filter(AttachmentDB.attachment_type == attachment_type)

    return query.order_by(AttachmentDB.uploaded_at.desc()).all()

@router.get("/{attachment_id}/download")
async def download_attachment(
    attachment_id: int,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    attachment = db.query(AttachmentDB).filter(AttachmentDB.id == attachment_id).first()
    if not attachment.request:
        raise HTTPException(status_code=404, detail="Заявка для файла не найдена")

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

    request = attachment.request

    if attachment.attachment_type == AttachmentTypeEnum.REQUEST_FILE:
        if request.author_id != current_user.id:
            raise HTTPException(status_code=403, detail="Удалить файл может только автор заявки")

        if request.status not in [OrderStatusEnum.DRAFT, OrderStatusEnum.REJECTED]:
            raise HTTPException(
                status_code=400,
                detail="Файлы заявки можно удалять только в черновике или отклонённой заявке",
            )

    elif attachment.attachment_type == AttachmentTypeEnum.INVOICE:
        if current_user.role != UserRoleEnum.EXECUTOR:
            raise HTTPException(status_code=403, detail="Удалить счёт может только Снабжение")

        if request.status != OrderStatusEnum.APPROVED:
            raise HTTPException(
                status_code=400,
                detail="Счёт можно удалить только у согласованной заявки",
            )
    elif attachment.attachment_type == AttachmentTypeEnum.UPD:
        if current_user.role != UserRoleEnum.EXECUTOR:
            raise HTTPException(status_code=403, detail="Удалить УПД может только Снабжение")

    if os.path.exists(attachment.file_path):
        os.remove(attachment.file_path)

    db.delete(attachment)
    db.commit()

    return {"ok": True}


@router.patch("/{attachment_id}/invoice-status")
def update_invoice_status(
        attachment_id: int,
        data: InvoiceStatusUpdate,
        current_user: UserDB = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    attachment = db.query(AttachmentDB).filter(AttachmentDB.id == attachment_id).first()

    if not attachment:
        raise HTTPException(status_code=404, detail="Файл не найден")

    # Используем exclude_unset, чтобы обновлять только те поля, которые реально прислал фронтенд
    update_data = data.model_dump(exclude_unset=True)

    if "payment_status" in update_data:
        attachment.payment_status = update_data["payment_status"]
    if "approval_status" in update_data:
        attachment.approval_status = update_data["approval_status"]
    if "delivery_date" in update_data:
        attachment.delivery_date = update_data["delivery_date"]
    if "is_delivered" in update_data:
        attachment.is_delivered = update_data["is_delivered"]

    db.commit()
    db.refresh(attachment)

    return {
        "message": "Данные счета обновлены",
        "payment_status": attachment.payment_status,
        "approval_status": attachment.approval_status,
        "delivery_date": attachment.delivery_date
    }

@router.post("/requests/{request_id}/upd", response_model=AttachmentRead)
async def upload_upd(
    request_id: int,
    file: UploadFile = File(...),
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    request = db.query(RequestDB).filter(RequestDB.id == request_id).first()

    if not request:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    # УПД может загружать только снабжение (или автор, если нужно — поправь условие)
    if current_user.role != UserRoleEnum.EXECUTOR:
        raise HTTPException(status_code=403, detail="УПД может добавить только Снабжение")

    return await save_attachment_file(
        request_id=request_id,
        file=file,
        attachment_type=AttachmentTypeEnum.UPD, # Используем новый тип
        db=db,
    )