from sqlalchemy import Column, Integer,Float, String, DateTime, ForeignKey, Enum as SqlEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base
import enum


class AgreementStatus(enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    SUSPENDED = "suspended"


class Agreement(Base):
    __tablename__ = "agreements"
    id = Column(Integer, primary_key=True, autoincrement=True)
    number = Column(String, unique=True, nullable=False, index=True)
    client_name = Column(String, nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(SqlEnum(AgreementStatus), default=AgreementStatus.ACTIVE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    materials = relationship("AgreementMaterial", back_populates="agreement", cascade="all, delete-orphan")
    requests = relationship("RequestDB", back_populates="agreement")


class AgreementMaterial(Base):
    __tablename__ = "agreement_materials"
    id = Column(Integer, primary_key=True, autoincrement=True)
    agreement_id = Column(Integer, ForeignKey("agreements.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False, index=True)
    unit = Column(String, nullable=False)
    total_quantity = Column(Float, nullable=False)
    reserved_quantity = Column(Float, default=0.0)
    spent_quantity = Column(Float, default=0.0)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    agreement = relationship("Agreement", back_populates="materials")
    request_items = relationship("RequestMaterial", back_populates="agreement_material")

    @property
    def available_quantity(self) -> Float:
        """Доступное количество (не зарезервировано и не потрачено)"""
        return self.total_quantity - self.reserved_quantity - self.spent_quantity

    @property
    def is_available(self) -> bool:
        """Есть ли доступное количество"""
        return self.available_quantity > 0