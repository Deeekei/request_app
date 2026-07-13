from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.models.enum import AttachmentTypeEnum
from backend.database import Base
import os
import logging
from sqlalchemy import event
from backend.models.enum import InvoicePaymentStatusEnum, InvoiceApprovalStatusEnum

class AttachmentDB(Base):
    __tablename__ = 'attachment'
    id = Column(Integer, primary_key=True)
    request_id = Column(Integer, ForeignKey('requests.id', ondelete='CASCADE'), nullable=False, index=True)
    original_name = Column(String, nullable=False)
    stored_name = Column(String, nullable=False)
    attachment_type = Column(
        Enum(AttachmentTypeEnum),
        nullable=False,
        default=AttachmentTypeEnum.REQUEST_FILE,
        index=True,
    )
    payment_status = Column(
        Enum(InvoicePaymentStatusEnum),
        nullable=True,
        default=InvoicePaymentStatusEnum.UNPAID
    )

    approval_status = Column(
        Enum(InvoiceApprovalStatusEnum),
        nullable=True,
        default=InvoiceApprovalStatusEnum.UNDER_REVIEW
    )
    delivery_date = Column(Date, nullable=True)
    file_path = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    uploaded_at = Column(DateTime(timezone=True),server_default=func.now(), nullable=False)

    request = relationship("RequestDB", back_populates="attachments")

logger = logging.getLogger(__name__)

@event.listens_for(AttachmentDB, 'before_delete')
def delete_physical_file_before_db_delete(mapper, connection, target):
    """
    Автоматически удаляет файл с жесткого диска сервера
    перед тем, как строка будет удалена из базы данных.
    """
    if target.file_path:
        # Проверяем, существует ли файл физически на сервере
        if os.path.exists(target.file_path):
            try:
                os.remove(target.file_path)
                logger.info(f"Файл успешно удален с диска: {target.file_path}")
            except Exception as e:
                logger.error(f"Не удалось удалить физический файл {target.file_path}: {e}")
        else:
            logger.warning(f"Файл должен был быть удален, но он отсутствует на диске: {target.file_path}")