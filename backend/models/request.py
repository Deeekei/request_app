from annotated_types import Timezone
from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean, Enum, JSON, ForeignKey, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base
from backend.models.enum import OrderStatusEnum, UserRoleEnum, ObjectsEnum, PaymentStatusEnum, RequestTypeEnum
from backend.models.agreement import AgreementMaterial


class RequestMaterial(Base):
    __tablename__ = "request_materials"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id", ondelete="CASCADE"), nullable=False)
    agreement_material_id = Column(Integer, ForeignKey("agreement_materials.id"), nullable=True)
    is_manual = Column(Boolean, nullable=False, default=False)
    manual_name = Column(String, nullable=True)
    manual_unit = Column(String, nullable=True)
    manual_comment = Column(String, nullable=True)
    quantity = Column(Float, nullable=False)  # запрошенное количество
    overdraft = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Связи
    request = relationship("RequestDB", back_populates="materials")
    agreement_material = relationship("AgreementMaterial", back_populates="request_items")


class RequestDB(Base):
    __tablename__ = "requests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)  # title
    description = Column(String, nullable=True)
    agreement = Column(String, nullable=False)
    section = Column(String, nullable=True)
    delivery_date = Column(Date, nullable=True)# agreement
    real_delivery_date = Column(Date, nullable=True)
    object = Column(Enum(ObjectsEnum), nullable=False)
    status = Column(Enum(OrderStatusEnum), nullable=False, default=OrderStatusEnum.DRAFT)
    current_responsible = Column(Enum(UserRoleEnum), nullable=True)

    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    author_name = Column(String, nullable=False)
    payment_status = Column(
        Enum(PaymentStatusEnum),
        nullable=False,
        default=PaymentStatusEnum.UNPAID,
    )

    request_type = Column(
        Enum(RequestTypeEnum),
        nullable=False
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Связи (строковые названия классов)
    author = relationship("UserDB", back_populates="requests_created")
    comments = relationship("CommentDB", back_populates="request", cascade="all, delete-orphan")
    materials = relationship("RequestMaterial", back_populates="request", cascade="all, delete-orphan")
    attachments = relationship("AttachmentDB", back_populates="request", cascade="all, delete-orphan")