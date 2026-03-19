from pyasn1.type.univ import Boolean
from sqlalchemy import Column, Integer,Float,Boolean, String, DateTime, ForeignKey, Enum as SqlEnum
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base
from backend.models.enum import ObjectsEnum
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



class AgreementMaterial(Base):
    __tablename__ = "agreement_materials"
    id = Column(Integer, primary_key=True, autoincrement=True)
    object = Column(SqlEnum(ObjectsEnum), nullable=False)
    name = Column(String, nullable=False, index=True)
    unit = Column(String, nullable=False)
    total_quantity = Column(Float, nullable=False)
    reserved_quantity = Column(Float, default=0.0)
    spent_quantity = Column(Float, default=0.0)
    notes = Column(String, nullable=True)
    overdraft = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    request_items = relationship("RequestMaterial", back_populates="agreement_material")

    @hybrid_property
    def available_quantity(self) -> float:
        """Доступное количество (не зарезервировано и не потрачено)"""
        return self.total_quantity - self.reserved_quantity - self.spent_quantity

    @property
    def is_available(self) -> bool:
        """Есть ли доступное количество"""
        return self.available_quantity > 0