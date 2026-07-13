from datetime import datetime, date
from pydantic import BaseModel, ConfigDict
from backend.models.enum import AttachmentTypeEnum, InvoicePaymentStatusEnum, InvoiceApprovalStatusEnum


class AttachmentRead(BaseModel):
    id: int
    request_id: int
    attachment_type: AttachmentTypeEnum
    original_name: str
    content_type: str | None = None
    size_bytes: int
    uploaded_at: datetime
    delivery_date: date | None = None
    payment_status: InvoicePaymentStatusEnum | None = None
    approval_status: InvoiceApprovalStatusEnum | None = None
    model_config = ConfigDict(from_attributes=True)

