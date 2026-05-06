from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.models.enum import AttachmentTypeEnum
from backend.database import Base

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
    file_path = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    uploaded_at = Column(DateTime(timezone=True),server_default=func.now(), nullable=False)

    request = relationship("RequestDB", backref="attachments")
