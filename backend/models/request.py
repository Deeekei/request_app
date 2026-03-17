from sqlalchemy import Column, Integer, Float, String, DateTime, Enum, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base
from backend.models.enum import OrderStatusEnum, UserRoleEnum
from backend.models.agreement import AgreementMaterial


class RequestMaterial(Base):
    __tablename__ = "request_materials"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id", ondelete="CASCADE"), nullable=False)
    agreement_material_id = Column(Integer, ForeignKey("agreement_materials.id"), nullable=False)

    quantity = Column(Float, nullable=False)  # запрошенное количество
    approved_quantity = Column(Float, nullable=True)  # утвержденное количество (может быть меньше)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Связи
    request = relationship("RequestDB", back_populates="materials")
    agreement_material = relationship("AgreementMaterial", back_populates="request_items")


class RequestDB(Base):
    __tablename__ = "requests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)  # title
    description = Column(String, nullable=False)
    agreement_id = Column(Integer, ForeignKey("agreements.id"), nullable=False)  # agreement
    request_materials = Column(JSON, default=list)  # request_materials

    status = Column(Enum(OrderStatusEnum), nullable=False, default=OrderStatusEnum.DRAFT)
    current_responsible = Column(Enum(UserRoleEnum), nullable=True)

    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    author_name = Column(String, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Связи (строковые названия классов)
    author = relationship("UserDB", back_populates="requests_created")
    comments = relationship("CommentDB", back_populates="request", cascade="all, delete-orphan")
    agreement = relationship("Agreement", back_populates="requests")
    materials = relationship("RequestMaterial", back_populates="request", cascade="all, delete-orphan")